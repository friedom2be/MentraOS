import {describe, expect, test} from 'bun:test';

import {getProdAsset, getProdHtml} from './html';

describe('getProdHtml', () => {
  test('returns the raw production html with local dist asset paths intact', async () => {
    const html = await getProdHtml();

    expect(html).toContain('./dist/frontend.css');
    expect(html).toContain('./dist/frontend.js');
    expect(html).not.toContain('chunk-');
    expect(html).not.toContain('/../../');
  });

  test('returns the built production assets instead of html fallbacks', async () => {
    const css = await getProdAsset('frontend.css').text();
    const js = await getProdAsset('frontend.js').text();

    expect(css).toContain(':root');
    expect(css).not.toContain('<!doctype html>');
    expect(js).toContain('createRoot');
    expect(js).not.toContain('<!doctype html>');
  });
});
