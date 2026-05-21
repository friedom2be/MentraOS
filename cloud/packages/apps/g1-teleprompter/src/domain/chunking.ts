import {createG1Toolkit} from '@mentra/sdk/display-utils';

import type {ScriptFamily} from './types';

const {wrapper} = createG1Toolkit();

export function buildChunks(text: string, scriptFamily: ScriptFamily): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const wrapped = wrapper.wrap(normalized, {
    maxLines: Infinity,
    maxBytes: Infinity,
  });
  const lines = wrapped.lines.map((line) => line.trim()).filter(Boolean);
  const pageSize = scriptFamily === 'latin' ? 5 : 4;

  const chunks: string[] = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    chunks.push(lines.slice(index, index + pageSize).join('\n'));
  }

  return chunks.length > 0 ? chunks : [''];
}
