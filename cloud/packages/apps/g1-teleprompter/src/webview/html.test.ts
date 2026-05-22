import {describe, expect, test} from 'bun:test';

import {getProdHtml} from './html';

describe('getProdHtml', () => {
  test('returns the raw production html with local dist asset paths intact', async () => {
    const html = await getProdHtml();

    expect(html).toContain('./dist/frontend.css');
    expect(html).toContain('./dist/frontend.js');
    expect(html).not.toContain('chunk-');
    expect(html).not.toContain('/../../');
  });
});
