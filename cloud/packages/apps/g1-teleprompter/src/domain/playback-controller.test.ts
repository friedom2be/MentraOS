import {describe, expect, test} from 'bun:test';

import {
  applyControlAction,
  chunkIndexForPercentage,
  chunkPositionForPercentage,
  percentageForChunkIndex,
} from './playback-controller';

describe('applyControlAction', () => {
  test('advances to the next chapter when next_chapter is applied', () => {
    const next = applyControlAction(
      {
        chapterIndex: 0,
        chunkIndex: 4,
        scrollSpeed: 120,
        status: 'paused',
      },
      {
        type: 'next_chapter',
        chapterStarts: [0, 5, 10],
      },
    );

    expect(next.chapterIndex).toBe(1);
    expect(next.chunkIndex).toBe(5);
  });

  test('returns a new paused state when repeat is applied', () => {
    const state = {
      chapterIndex: 1,
      chunkIndex: 6,
      scrollSpeed: 120,
      status: 'playing' as const,
    };

    const next = applyControlAction(state, {type: 'repeat'});

    expect(next).not.toBe(state);
    expect(next).toEqual({
      ...state,
      status: 'paused',
    });
  });

  test('returns a new state object for save and finished actions', () => {
    const state = {
      chapterIndex: 1,
      chunkIndex: 6,
      scrollSpeed: 120,
      status: 'paused' as const,
    };

    const saved = applyControlAction(state, {type: 'save'});
    const finished = applyControlAction(state, {type: 'finished'});

    expect(saved).not.toBe(state);
    expect(saved).toEqual(state);
    expect(finished).not.toBe(state);
    expect(finished).toEqual(state);
  });

  test('maps a percentage to the nearest persisted global chunk position', () => {
    expect(chunkIndexForPercentage(0, 5)).toBe(0);
    expect(chunkIndexForPercentage(50, 5)).toBe(2);
    expect(chunkIndexForPercentage(74, 5)).toBe(3);
    expect(chunkIndexForPercentage(100, 5)).toBe(4);
    expect(chunkIndexForPercentage(150, 5)).toBe(4);
  });

  test('derives the correct chapter and chunk for a percentage jump', () => {
    expect(chunkPositionForPercentage(50, 5, [0, 2, 4])).toEqual({
      chapterIndex: 1,
      chunkIndex: 2,
    });
    expect(chunkPositionForPercentage(100, 5, [0, 2, 4])).toEqual({
      chapterIndex: 2,
      chunkIndex: 4,
    });
  });

  test('reports completion percentage from the persisted chunk sequence', () => {
    expect(percentageForChunkIndex(0, 5)).toBe(0);
    expect(percentageForChunkIndex(2, 5)).toBe(50);
    expect(percentageForChunkIndex(4, 5)).toBe(100);
  });
});
