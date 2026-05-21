import {describe, expect, test} from 'bun:test';

import {loadScript} from './load-script';

describe('loadScript', () => {
  test('maps chapter ranges against the final persisted chunk sequence', async () => {
    let savedScript: Awaited<ReturnType<typeof loadScript>> | undefined;

    const script = await loadScript(
      {
        sourceType: 'text',
        shouldSummarize: true,
        title: 'Draft',
        text: '# Intro\nHello there\n\n# Chapter 2\nWorld here',
      },
      {
        scriptRepository: {
          saveActiveScript(activeScript) {
            savedScript = activeScript;
          },
        },
        summarize: async () => 'This is a teleprompter sentence. '.repeat(30),
        now: () => '2026-05-21T12:00:00.000Z',
      },
    );

    expect(savedScript).toEqual(script);
    expect(script.chapterList).toEqual([
      {
        title: 'Draft',
        startChunkIndex: 0,
        endChunkIndex: script.chunks.length - 1,
      },
    ]);
  });
});
