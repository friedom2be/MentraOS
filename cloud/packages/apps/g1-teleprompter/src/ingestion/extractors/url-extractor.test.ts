import {afterEach, describe, expect, mock, test} from 'bun:test';

import {extractFromUrl} from './url-extractor';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe('extractFromUrl', () => {
  test('rejects non-http schemes before fetching', async () => {
    await expect(extractFromUrl('file:///etc/passwd')).rejects.toThrow(/Unsupported URL protocol/);
  });

  test('rejects localhost targets before fetching', async () => {
    await expect(extractFromUrl('http://127.0.0.1:8080/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects bracketed ipv6 loopback targets before fetching', async () => {
    await expect(extractFromUrl('http://[::1]/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects bracketed ipv6 private or local targets before fetching', async () => {
    await expect(extractFromUrl('http://[fc00::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[fe80::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[febf::1]/private')).rejects.toThrow(/private or local address/);
    await expect(extractFromUrl('http://[::ffff:127.0.0.1]/private')).rejects.toThrow(/private or local address/);
  });

  test('rejects hostnames that resolve to private or local addresses', async () => {
    await expect(
      extractFromUrl('https://public.example/article', {
        lookup: async () => [{address: '127.0.0.1', family: 4}],
      }),
    ).rejects.toThrow(/private or local address/);
  });

  test('rejects redirects into private targets', async () => {
    globalThis.fetch = mock(async () => {
      return new Response(null, {
        status: 302,
        headers: {
          location: 'http://localhost/internal',
        },
      });
    }) as unknown as typeof fetch;

    await expect(extractFromUrl('https://example.com/article')).rejects.toThrow(/private or local address/);
  });

  test('extracts article text from a public html response', async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        `
          <html>
            <head><title>Sample</title></head>
            <body><article><h1>Headline</h1><p>Hello world.</p></article></body>
          </html>
        `,
        {
          status: 200,
          headers: {'content-type': 'text/html'},
        },
      );
    }) as unknown as typeof fetch;

    const result = await extractFromUrl('https://example.com/article');
    expect(result.title).toBe('Sample');
    expect(result.text).toContain('Hello world.');
  });
});
