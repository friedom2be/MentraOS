import {describe, expect, test} from 'bun:test';

import {applyControlAction} from './playback-controller';

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
});
