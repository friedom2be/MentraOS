import {Readability} from '@mozilla/readability';
import {JSDOM} from 'jsdom';
import {lookup as dnsLookup} from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import {isIP} from 'node:net';

interface LookupResult {
  address: string;
  family: number;
}

interface ResolvedUrl {
  url: URL;
  resolvedAddress: LookupResult;
}

interface RequestResult {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

interface UrlExtractorDeps {
  lookup?: (hostname: string) => Promise<LookupResult[]>;
  request?: (resolved: ResolvedUrl, signal: AbortSignal) => Promise<RequestResult>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;

export async function extractFromUrl(
  url: string,
  deps: UrlExtractorDeps = {},
): Promise<{title: string; text: string}> {
  const response = await requestWithSafeRedirects(await validatePublicHttpUrl(url, deps), deps);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`URL fetch failed with status ${response.status}`);
  }

  const html = response.body;
  const dom = new JSDOM(html, {url});
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent) {
    throw new Error('Unable to extract article body from URL');
  }

  return {
    title: article.title || url,
    text: article.textContent.trim(),
  };
}

async function validatePublicHttpUrl(input: string, deps: UrlExtractorDeps): Promise<ResolvedUrl> {
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol');
  }

  if (isPrivateOrLocalHost(url.hostname)) {
    throw new Error('URL points to a private or local address');
  }

  return {
    url,
    resolvedAddress: await resolvePublicHostname(url.hostname, deps),
  };
}

async function requestWithSafeRedirects(
  resolved: ResolvedUrl,
  deps: UrlExtractorDeps,
  redirectCount = 0,
): Promise<RequestResult> {
  const request = deps.request || defaultRequest;
  const response = await requestWithTimeout(request, resolved, deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (Buffer.byteLength(response.body, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error('Response body too large for URL ingestion');
  }

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= 3) {
      throw new Error('Too many redirects while fetching URL');
    }

    const locationHeader = response.headers.location;
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
    if (!location) {
      throw new Error('Redirect response missing location header');
    }

    const redirectedUrl = await validatePublicHttpUrl(new URL(location, resolved.url).toString(), deps);
    return requestWithSafeRedirects(redirectedUrl, deps, redirectCount + 1);
  }

  return response;
}

async function resolvePublicHostname(hostname: string, deps: UrlExtractorDeps): Promise<LookupResult> {
  const host = normalizeHostname(hostname);
  const ipVersion = isIP(host);
  if (ipVersion === 4 || ipVersion === 6) {
    return {address: host, family: ipVersion};
  }

  const lookup = deps.lookup || defaultLookup;
  const addresses = await lookup(host);

  if (addresses.some((result) => isPrivateOrLocalHost(result.address))) {
    throw new Error('URL points to a private or local address');
  }

  const firstAddress = addresses[0];
  if (!firstAddress) {
    throw new Error('Unable to resolve URL hostname');
  }

  return firstAddress;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    return isPrivateIpv4(host);
  }

  if (ipVersion === 6) {
    if (host.startsWith('::ffff:')) {
      return true;
    }

    return host === '::1' || host === '::' || isIpv6SpecialUse(host);
  }

  return false;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
}

function isPrivateIpv4(host: string): boolean {
  const [a, b] = host.split('.').map((part) => parseInt(part, 10));
  return (
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isIpv6LinkLocal(host: string): boolean {
  const firstHextet = host.split(':')[0];
  if (!firstHextet) {
    return false;
  }

  const value = parseInt(firstHextet, 16);
  return Number.isFinite(value) && value >= 0xfe80 && value <= 0xfebf;
}

function isIpv6SpecialUse(host: string): boolean {
  const firstHextet = host.split(':')[0];
  if (!firstHextet) {
    return false;
  }

  const normalized = firstHextet.padStart(4, '0');
  const value = parseInt(normalized, 16);
  if (!Number.isFinite(value)) {
    return false;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  if (isIpv6LinkLocal(host)) {
    return true;
  }

  if (value >= 0xfec0 && value <= 0xfeff) {
    return true;
  }

  if (value >= 0xff00 && value <= 0xffff) {
    return true;
  }

  return host.startsWith('2001:db8:');
}

async function defaultLookup(hostname: string): Promise<LookupResult[]> {
  return dnsLookup(hostname, {all: true, verbatim: true});
}

async function requestWithTimeout(
  request: (resolved: ResolvedUrl, signal: AbortSignal) => Promise<RequestResult>,
  resolved: ResolvedUrl,
  timeoutMs: number,
): Promise<RequestResult> {
  const controller = new AbortController();
  const timeoutError = new Error(`URL fetch timed out after ${timeoutMs}ms`);

  return await new Promise<RequestResult>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      settled = true;
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);

    request(resolved, controller.signal).then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        reject(controller.signal.aborted ? timeoutError : error);
      },
    );
  });
}

async function defaultRequest(resolved: ResolvedUrl, signal: AbortSignal): Promise<RequestResult> {
  const transport = resolved.url.protocol === 'https:' ? https : http;

  return new Promise<RequestResult>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('Request aborted'));
      return;
    }

    const request = transport.request(
      {
        protocol: resolved.url.protocol,
        hostname: resolved.url.hostname,
        port: resolved.url.port,
        path: `${resolved.url.pathname}${resolved.url.search}`,
        method: 'GET',
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'MentraOS Teleprompter/0.1',
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.resolvedAddress.address, resolved.resolvedAddress.family);
        },
      },
      (response) => {
        const chunks: Uint8Array[] = [];
        let totalLength = 0;
        response.on('data', (chunk) => {
          const normalizedChunk = Buffer.isBuffer(chunk)
            ? Uint8Array.from(chunk)
            : Uint8Array.from(Buffer.from(chunk));
          totalLength += normalizedChunk.byteLength;

          if (totalLength > MAX_RESPONSE_BYTES) {
            request.destroy(new Error('Response body too large for URL ingestion'));
            return;
          }

          chunks.push(normalizedChunk);
        });
        response.on('end', () => {
          cleanup();
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.byteLength;
          }

          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: new TextDecoder().decode(combined),
          });
        });
      },
    );

    const abortRequest = () => {
      request.destroy(signal.reason instanceof Error ? signal.reason : new Error('Request aborted'));
    };

    signal.addEventListener('abort', abortRequest, {once: true});

    const cleanup = () => {
      signal.removeEventListener('abort', abortRequest);
    };

    request.on('close', cleanup);
    request.on('error', (error) => {
      cleanup();
      reject(error);
    });
    request.end();
  });
}
