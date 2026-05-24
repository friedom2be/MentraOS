import {describe, expect, test} from 'bun:test';

import {extractFromUrl} from './url-extractor';

describe('extractFromUrl', () => {
  test('rejects non-http schemes before fetching', async () => {
    await expect(extractFromUrl('file:///etc/passwd')).rejects.toThrow(/Unsupported URL protocol/);
  });

  test('rejects localhost targets before fetching', async () => {
    await expect(extractFromUrl('http://127.0.0.1:8080/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects reserved ipv4 ranges before fetching', async () => {
    await expect(extractFromUrl('http://100.64.0.1/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://198.18.0.1/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://224.0.0.1/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://240.0.0.1/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects bracketed ipv6 loopback targets before fetching', async () => {
    await expect(extractFromUrl('http://[::1]/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects bracketed ipv6 private or local targets before fetching', async () => {
    await expect(extractFromUrl('http://[fc00::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[fe80::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[febf::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[::ffff:127.0.0.1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[ff02::1]/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects hostnames that resolve to private or local addresses', async () => {
    await expect(
      extractFromUrl('https://public.example/article', {
        lookup: async () => [{address: '127.0.0.1', family: 4}],
      }),
    ).rejects.toThrow(/private or local address/);
  });

  test('rejects redirects into private targets', async () => {
    await expect(
      extractFromUrl('https://example.com/article', {
        lookup: async (hostname) => [{address: hostname === 'example.com' ? '93.184.216.34' : '127.0.0.1', family: 4}],
        request: async () => ({
          status: 302,
          headers: {
            location: 'http://localhost/internal',
          },
          body: '',
        }),
      }),
    ).rejects.toThrow(/private or local address/);
  });

  test('extracts article text from a public html response', async () => {
    const result = await extractFromUrl('https://example.com/article', {
      lookup: async () => [{address: '93.184.216.34', family: 4}],
      request: async () => ({
        status: 200,
        headers: {'content-type': 'text/html'},
        body: `
          <html>
            <head><title>Sample</title></head>
            <body><article><h1>Headline</h1><p>Hello world.</p></article></body>
          </html>
        `,
      }),
    });

    expect(result.title).toBe('Sample');
    expect(result.text).toContain('Hello world.');
  });

  test('rejects oversized responses before readability parsing', async () => {
    await expect(
      extractFromUrl('https://example.com/article', {
        lookup: async () => [{address: '93.184.216.34', family: 4}],
        request: async () => ({
          status: 200,
          headers: {'content-type': 'text/html'},
          body: 'x'.repeat(1_100_000),
        }),
      }),
    ).rejects.toThrow(/Response body too large/);
  });

  test('times out slow requests', async () => {
    await expect(
      extractFromUrl('https://example.com/article', {
        lookup: async () => [{address: '93.184.216.34', family: 4}],
        request: async () => new Promise(() => {}),
        timeoutMs: 1,
      }),
    ).rejects.toThrow(/timed out/);
  });

  test('aborts the in-flight request when a timeout fires', async () => {
    let aborted = false;

    await expect(
      extractFromUrl('https://example.com/article', {
        lookup: async () => [{address: '93.184.216.34', family: 4}],
        request: async (_resolved, signal) =>
          await new Promise((_, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                aborted = true;
                reject(signal.reason);
              },
              {once: true},
            );
          }),
        timeoutMs: 1,
      }),
    ).rejects.toThrow(/timed out/);

    expect(aborted).toBe(true);
  });

  test('uses the injected resolver and request path through redirects', async () => {
    const lookups: string[] = [];
    const requests: Array<{hostname: string; address: string}> = [];

    const result = await extractFromUrl('https://example.com/start', {
      lookup: async (hostname) => {
        lookups.push(hostname);
        if (hostname === 'example.com') {
          return [{address: '93.184.216.34', family: 4}];
        }

        return [{address: '93.184.216.35', family: 4}];
      },
      request: async ({url, resolvedAddress}) => {
        requests.push({hostname: url.hostname, address: resolvedAddress.address});

        if (url.hostname === 'example.com') {
          return {
            status: 302,
            headers: {location: 'https://redirect.example/final'},
            body: '',
          };
        }

        return {
          status: 200,
          headers: {'content-type': 'text/html'},
          body: '<html><head><title>Redirected</title></head><body><article><p>Resolved safely.</p></article></body></html>',
        };
      },
    });

    expect(lookups).toEqual(['example.com', 'redirect.example']);
    expect(requests).toEqual([
      {hostname: 'example.com', address: '93.184.216.34'},
      {hostname: 'redirect.example', address: '93.184.216.35'},
    ]);
    expect(result.text).toContain('Resolved safely.');
  });
});
