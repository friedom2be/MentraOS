import {beforeEach, describe, expect, test} from 'bun:test';

import {createDatabase} from '../db';
import {ScriptRepository} from './script-repository';

describe('ScriptRepository', () => {
  let repo: ScriptRepository;

  beforeEach(() => {
    const db = createDatabase(':memory:');
    repo = new ScriptRepository(db);
  });

  test('replaces the single active script and preserves playback position fields', () => {
    repo.saveActiveScript({
      sourceType: 'text',
      sourceTitle: 'Draft 1',
      rawText: 'hello world',
      displayText: 'hello world',
      chapterIndex: 0,
      chunkIndex: 1,
      chapterList: [{title: 'Chapter 1', startChunkIndex: 0, endChunkIndex: 1}],
      chunks: ['hello', 'world'],
      isSummarized: false,
      wordCountOriginal: 2,
      wordCountDisplay: 2,
      updatedAt: '2026-05-21T12:00:00.000Z',
    });

    repo.saveActiveScript({
      sourceType: 'url',
      sourceTitle: 'Draft 2',
      rawText: 'replacement text',
      displayText: 'replacement text',
      chapterIndex: 0,
      chunkIndex: 0,
      chapterList: [{title: 'Only Chapter', startChunkIndex: 0, endChunkIndex: 0}],
      chunks: ['replacement text'],
      isSummarized: true,
      wordCountOriginal: 10,
      wordCountDisplay: 4,
      updatedAt: '2026-05-21T12:05:00.000Z',
    });

    const saved = repo.getActiveScript();
    expect(saved?.sourceTitle).toBe('Draft 2');
    expect(saved?.isSummarized).toBe(true);
    expect(saved?.chunks).toEqual(['replacement text']);
  });
});
