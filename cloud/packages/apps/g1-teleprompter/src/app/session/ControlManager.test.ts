import {afterEach, describe, expect, test} from 'bun:test';

import type {ActiveScript, TeleprompterProfile} from '../../domain/types';
import type {PlaybackState} from '../../domain/playback-controller';
import {ControlManager} from './ControlManager';

describe('ControlManager', () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });

  test('cancels queued auto-resume when external script replacement is applied', async () => {
    const timers = installFakeTimers();
    const state = createFakeState({
      playback: {
        chapterIndex: 0,
        chunkIndex: 0,
        scrollSpeed: 120,
        status: 'playing',
      },
      activeScript: createScript({
        chunks: ['one two three', 'four five six'],
        chapterList: [{title: 'Full Script', startChunkIndex: 0, endChunkIndex: 1}],
      }),
    });
    const display = {
      clear() {},
      showActiveScript() {},
    };

    const control = new ControlManager(state as never, display as never, createLogger() as never);

    await control.apply('advance_chunk');
    expect(state.playback?.status).toBe('paused');
    expect(timers.pendingCount()).toBe(1);

    state.activeScript = createScript({
      updatedAt: '2026-05-21T12:05:00.000Z',
      chunks: ['replacement'],
      chapterList: [{title: 'Full Script', startChunkIndex: 0, endChunkIndex: 0}],
      chapterIndex: 0,
      chunkIndex: 0,
    });
    state.playback = {
      chapterIndex: 0,
      chunkIndex: 0,
      scrollSpeed: 120,
      status: 'paused',
    };

    control.handleExternalStateChange();
    timers.runPending();

    expect(state.playback?.status).toBe('paused');
    expect(state.playback?.chunkIndex).toBe(0);
    expect(timers.pendingCount()).toBe(0);
  });
});

function createFakeState({
  playback,
  activeScript,
}: {
  playback: PlaybackState | null;
  activeScript: ActiveScript | null;
}) {
  const profile: TeleprompterProfile = {
    setupComplete: true,
    scrollSpeed: playback?.scrollSpeed ?? 120,
    summarizeArticles: false,
    summarizeEpubs: false,
    summarizePdfs: false,
    volumeButtonMode: false,
  };

  return {
    playback,
    activeScript,
    getPlayback() {
      return this.playback;
    },
    getActiveScript() {
      return this.activeScript;
    },
    updatePlayback(nextPlayback: PlaybackState) {
      this.playback = nextPlayback;
      profile.scrollSpeed = nextPlayback.scrollSpeed;

      if (this.activeScript) {
        this.activeScript = {
          ...this.activeScript,
          chapterIndex: nextPlayback.chapterIndex,
          chunkIndex: nextPlayback.chunkIndex,
        };
      }

      return this.activeScript;
    },
    clearActiveScript() {
      this.activeScript = null;
      this.playback = null;
    },
    getProfile() {
      return profile;
    },
  };
}

function createScript(overrides: Partial<ActiveScript>): ActiveScript {
  return {
    sourceType: 'text',
    sourceTitle: 'Draft',
    rawText: 'one two three four five six',
    displayText: 'one two three four five six',
    chapterIndex: 0,
    chunkIndex: 0,
    chapterList: [{title: 'Full Script', startChunkIndex: 0, endChunkIndex: 1}],
    chunks: ['one two three', 'four five six'],
    isSummarized: false,
    wordCountOriginal: 6,
    wordCountDisplay: 6,
    updatedAt: '2026-05-21T12:00:00.000Z',
    ...overrides,
  };
}

function createLogger() {
  return {
    warn() {},
  };
}

function installFakeTimers() {
  type FakeTimeoutHandle = {value: number};
  type TimerRecord = {
    id: FakeTimeoutHandle;
    callback: () => void;
    cleared: boolean;
  };

  const timers = new Map<number, TimerRecord>();
  let nextId = 1;

  globalThis.setTimeout = (((callback: TimerHandler) => {
    const id = {value: nextId++};
    timers.set(id.value, {
      id,
      callback: callback as () => void,
      cleared: false,
    });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as unknown) as typeof setTimeout;

  globalThis.clearTimeout = ((timer: ReturnType<typeof setTimeout>) => {
    const id =
      typeof timer === 'object' && timer && 'value' in timer
        ? (timer as unknown as FakeTimeoutHandle).value
        : Number(timer);
    const record = timers.get(id);
    if (record) {
      record.cleared = true;
    }
  }) as unknown as typeof clearTimeout;

  return {
    pendingCount() {
      return Array.from(timers.values()).filter((timer) => !timer.cleared).length;
    },
    runPending() {
      for (const timer of Array.from(timers.values())) {
        if (!timer.cleared) {
          timer.cleared = true;
          timer.callback();
        }
      }
    },
  };
}
