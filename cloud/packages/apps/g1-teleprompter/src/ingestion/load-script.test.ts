import {describe, expect, test} from 'bun:test';

import {buildChunks} from '../domain/chunking';
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

  test('maps unsummarized chapters against the final chunk sequence', async () => {
    let savedScript: Awaited<ReturnType<typeof loadScript>> | undefined;
    const chapterOne = 'This is a teleprompter sentence. '.repeat(20);
    const chapterTwo = 'Another teleprompter sentence lives here. '.repeat(20);
    const text = `# Intro\n${chapterOne}\n\n# Chapter 2\n${chapterTwo}`;

    const script = await loadScript(
      {
        sourceType: 'text',
        shouldSummarize: false,
        title: 'Draft',
        text,
      },
      {
        scriptRepository: {
          saveActiveScript(activeScript) {
            savedScript = activeScript;
          },
        },
        now: () => '2026-05-21T12:00:00.000Z',
      },
    );

    const expectedFirstChunks = buildChunks(chapterOne, 'latin');
    const expectedSecondChunks = buildChunks(chapterTwo, 'latin');

    expect(savedScript).toEqual(script);
    expect(script.chunks).toEqual([...expectedFirstChunks, ...expectedSecondChunks]);
    expect(script.chapterList).toEqual([
      {
        title: 'Intro',
        startChunkIndex: 0,
        endChunkIndex: expectedFirstChunks.length - 1,
      },
      {
        title: 'Chapter 2',
        startChunkIndex: expectedFirstChunks.length,
        endChunkIndex: expectedFirstChunks.length + expectedSecondChunks.length - 1,
      },
    ]);
  });
});
