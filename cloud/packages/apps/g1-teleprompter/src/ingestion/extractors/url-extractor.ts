import {Readability} from '@mozilla/readability';
import {JSDOM} from 'jsdom';
import {lookup as dnsLookup} from 'node:dns/promises';
import {isIP} from 'node:net';

interface LookupResult {
  address: string;
  family: number;
}

interface UrlExtractorDeps {
  lookup?: (hostname: string) => Promise<LookupResult[]>;
}

export async function extractFromUrl(
  url: string,
  deps: UrlExtractorDeps = {},
): Promise<{title: string; text: string}> {
  const response = await fetchWithSafeRedirects(await validatePublicHttpUrl(url, deps));
  if (!response.ok) {
    throw new Error(`URL fetch failed with status ${response.status}`);
  }

  const html = await response.text();
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

async function validatePublicHttpUrl(input: string, deps: UrlExtractorDeps): Promise<URL> {
  const parsed = new URL(input);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol');
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('URL points to a private or local address');
  }

  await assertPublicHostname(parsed.hostname, deps);

  return parsed;
}

async function fetchWithSafeRedirects(url: URL, redirectCount = 0, deps: UrlExtractorDeps = {}): Promise<Response> {
  const response = await fetch(url.toString(), {redirect: 'manual'});

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= 3) {
      throw new Error('Too many redirects while fetching URL');
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Redirect response missing location header');
    }

    const redirectedUrl = await validatePublicHttpUrl(new URL(location, url).toString(), deps);
    return fetchWithSafeRedirects(redirectedUrl, redirectCount + 1, deps);
  }

  return response;
}

async function assertPublicHostname(hostname: string, deps: UrlExtractorDeps): Promise<void> {
  const host = normalizeHostname(hostname);
  if (isIP(host) !== 0) {
    return;
  }

  const lookup = deps.lookup || defaultLookup;
  const addresses = await lookup(host);

  if (addresses.some((result) => isPrivateOrLocalHost(result.address))) {
    throw new Error('URL points to a private or local address');
  }
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
