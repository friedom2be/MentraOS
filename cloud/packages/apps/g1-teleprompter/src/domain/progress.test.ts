import {describe, expect, test} from 'bun:test';

import type {ActiveScript} from './types';
import {getScriptProgress, mapPercentageToScriptPosition} from './progress';

describe('mapPercentageToScriptPosition', () => {
  test('maps clamped percentage to the nearest global chunk and chapter position', () => {
    const script = createScript();

    expect(mapPercentageToScriptPosition(-10, script)).toEqual({
      percentage: 0,
      globalChunkIndex: 0,
      chapterIndex: 0,
      chunkIndex: 0,
    });

    expect(mapPercentageToScriptPosition(50, script)).toEqual({
      percentage: 50,
      globalChunkIndex: 2,
      chapterIndex: 1,
      chunkIndex: 2,
    });

    expect(mapPercentageToScriptPosition(100, script)).toEqual({
      percentage: 100,
      globalChunkIndex: 4,
      chapterIndex: 2,
      chunkIndex: 4,
    });
  });
});

describe('getScriptProgress', () => {
  test('reports global chunk progress as a numeric percent', () => {
    const script = createScript();
    script.chapterIndex = 1;
    script.chunkIndex = 2;

    expect(getScriptProgress(script)).toEqual({
      percentage: 50,
      globalChunkIndex: 2,
      totalChunks: 5,
      totalChapters: 3,
    });
  });
});

function createScript(): ActiveScript {
  return {
    sourceType: 'epub',
    sourceTitle: 'Book',
    rawText: 'one two three four five',
    displayText: 'one two three four five',
    chapterIndex: 0,
    chunkIndex: 0,
    chapterList: [
      {title: 'Intro', startChunkIndex: 0, endChunkIndex: 1},
      {title: 'Middle', startChunkIndex: 2, endChunkIndex: 3},
      {title: 'End', startChunkIndex: 4, endChunkIndex: 4},
    ],
    chunks: ['chunk 1', 'chunk 2', 'chunk 3', 'chunk 4', 'chunk 5'],
    isSummarized: false,
    wordCountOriginal: 5,
    wordCountDisplay: 5,
    updatedAt: '2026-05-21T12:00:00.000Z',
  };
}
