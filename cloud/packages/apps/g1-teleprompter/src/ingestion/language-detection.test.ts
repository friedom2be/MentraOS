import {describe, expect, test} from 'bun:test';

import {detectScriptFamily} from './language-detection';

describe('detectScriptFamily', () => {
  test('returns latin for english prose', () => {
    expect(detectScriptFamily('This is a teleprompter sample paragraph.')).toBe('latin');
  });

  test('returns cjk for chinese-heavy text', () => {
    expect(detectScriptFamily('这是一个提词器测试文本，用于检查语言识别。')).toBe('cjk');
  });

  test('returns rtl for arabic-heavy text', () => {
    expect(detectScriptFamily('هذا نص عربي لاختبار التعرف على اتجاه النص')).toBe('rtl');
  });
});
