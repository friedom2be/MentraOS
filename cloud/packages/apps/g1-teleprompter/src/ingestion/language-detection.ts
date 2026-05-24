import type {ScriptFamily} from '../domain/types';

const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
const RTL_PATTERN = /[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/g;
const LATIN_PATTERN = /[A-Za-z]/g;

export function detectScriptFamily(text: string): ScriptFamily {
  const cjkCount = (text.match(CJK_PATTERN) || []).length;
  const rtlCount = (text.match(RTL_PATTERN) || []).length;
  const latinCount = (text.match(LATIN_PATTERN) || []).length;

  if (rtlCount > cjkCount && rtlCount > latinCount) {
    return 'rtl';
  }

  if (cjkCount > latinCount) {
    return 'cjk';
  }

  return 'latin';
}
