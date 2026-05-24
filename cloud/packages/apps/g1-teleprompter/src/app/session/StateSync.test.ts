import {describe, expect, test} from 'bun:test';

import type {ActiveScript, TeleprompterProfile} from '../../domain/types';
import {StateSync} from './StateSync';

describe('StateSync', () => {
  test('resets playback to paused when a fresh script load replaces matching content', () => {
    const profile = createProfile();
    const previousScript = createScript({
      updatedAt: '2026-05-21T12:00:00.000Z',
      chapterIndex: 1,
      chunkIndex: 1,
    });
    let currentScript: ActiveScript | null = previousScript;

    const sync = new StateSync({
      profileRepository: {
        getProfile: () => profile,
        saveProfile: () => profile,
      },
      scriptRepository: {
        getActiveScript: () => currentScript,
        saveActiveScript(script) {
          currentScript = script;
        },
        clearActiveScript() {
          currentScript = null;
        },
      },
    });

    sync.initialize();
    sync.updatePlayback({
      chapterIndex: 1,
      chunkIndex: 1,
      scrollSpeed: 120,
      status: 'playing',
    });

    currentScript = createScript({
      updatedAt: '2026-05-21T12:05:00.000Z',
      chapterIndex: 0,
      chunkIndex: 0,
    });

    sync.syncFromPersistence();

    expect(sync.getPlayback()).toEqual({
      chapterIndex: 0,
      chunkIndex: 0,
      scrollSpeed: 120,
      status: 'paused',
    });
  });
});

function createProfile(): TeleprompterProfile {
  return {
    setupComplete: true,
    scrollSpeed: 120,
    summarizeArticles: false,
    summarizeEpubs: false,
    summarizePdfs: false,
    volumeButtonMode: false,
  };
}

function createScript(overrides: Partial<ActiveScript>): ActiveScript {
  return {
    sourceType: 'text',
    sourceTitle: 'Draft',
    rawText: 'hello world',
    displayText: 'hello world',
    chapterIndex: 0,
    chunkIndex: 0,
    chapterList: [{title: 'Full Script', startChunkIndex: 0, endChunkIndex: 1}],
    chunks: ['hello', 'world'],
    isSummarized: false,
    wordCountOriginal: 2,
    wordCountDisplay: 2,
    updatedAt: '2026-05-21T12:00:00.000Z',
    ...overrides,
  };
}
