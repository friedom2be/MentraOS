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
});
