import {Readability} from '@mozilla/readability';
import {JSDOM} from 'jsdom';
import {isIP} from 'node:net';

export async function extractFromUrl(url: string): Promise<{title: string; text: string}> {
  const response = await fetchWithSafeRedirects(validatePublicHttpUrl(url));
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

function validatePublicHttpUrl(input: string): URL {
  const parsed = new URL(input);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol');
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('URL points to a private or local address');
  }

  return parsed;
}

async function fetchWithSafeRedirects(url: URL, redirectCount = 0): Promise<Response> {
  const response = await fetch(url.toString(), {redirect: 'manual'});

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= 3) {
      throw new Error('Too many redirects while fetching URL');
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Redirect response missing location header');
    }

    const redirectedUrl = validatePublicHttpUrl(new URL(location, url).toString());
    return fetchWithSafeRedirects(redirectedUrl, redirectCount + 1);
  }

  return response;
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

    return host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
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
