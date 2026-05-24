import {describe, expect, test} from 'bun:test';

import {buildChunks} from './chunking';

describe('buildChunks', () => {
  test('creates multiple G1-sized chunks for long Latin text', () => {
    const chunks = buildChunks('This is a teleprompter sentence. '.repeat(40), 'latin');
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].length).toBeGreaterThan(0);
  });

  test('uses character-aware chunking for CJK text', () => {
    const chunks = buildChunks('这是一个提词器测试文本'.repeat(20), 'cjk');
    expect(chunks.length).toBeGreaterThan(1);
  });
});
