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
  request?: (resolved: ResolvedUrl) => Promise<RequestResult>;
}

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
  const response = await request(resolved);

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

    return (
      host === '::1' ||
      host === '::' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      isIpv6LinkLocal(host)
    );
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
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
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

async function defaultLookup(hostname: string): Promise<LookupResult[]> {
  return dnsLookup(hostname, {all: true, verbatim: true});
}

async function defaultRequest(resolved: ResolvedUrl): Promise<RequestResult> {
  const transport = resolved.url.protocol === 'https:' ? https : http;

  return new Promise<RequestResult>((resolve, reject) => {
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
        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? Uint8Array.from(chunk) : Uint8Array.from(Buffer.from(chunk)));
        });
        response.on('end', () => {
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
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

    request.on('error', reject);
    request.end();
  });
}
