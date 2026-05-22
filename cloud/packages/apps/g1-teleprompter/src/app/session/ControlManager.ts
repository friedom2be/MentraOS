import type {AppSession} from '@mentra/sdk';

import {
  applyControlAction,
  type PlaybackAction,
  type RuntimeControlType,
} from '../../domain/playback-controller';
import {StateSync} from './StateSync';
import {DisplayManager} from './DisplayManager';

const AUTO_RESUME_DELAY_MS = 3_000;
const MIN_CHUNK_DURATION_MS = 1_500;

export class ControlManager {
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly stateSync: StateSync,
    private readonly display: DisplayManager,
    private readonly logger: AppSession['logger'],
  ) {}

  async apply(type: RuntimeControlType): Promise<boolean> {
    if (type === 'finished') {
      this.clearTimers();
      this.stateSync.clearActiveScript();
      this.display.clear();
      return true;
    }

    if (type === 'advance_chunk') {
      return await this.advanceChunk(true);
    }

    if (type === 'rewind_chunk') {
      return await this.rewindChunk();
    }

    this.clearTimers();

    const playback = this.stateSync.getPlayback();
    const activeScript = this.stateSync.getActiveScript();
    if (!playback || !activeScript) {
      return false;
    }

    const action = this.buildAction(type, activeScript.chunks.length, activeScript.chapterList.map((chapter) => chapter.startChunkIndex));
    const nextPlayback = applyControlAction(playback, action);

    if (type === 'save') {
      nextPlayback.status = 'paused';
    }

    this.stateSync.updatePlayback(nextPlayback);
    this.showCurrentScript();
    this.reconcileTimers();
    return true;
  }

  handleExternalStateChange(): void {
    this.clearTimers();
    this.showCurrentScript();
    this.reconcileTimers();
  }

  dispose(): void {
    this.clearTimers();
  }

  private async advanceChunk(pauseForInteraction: boolean): Promise<boolean> {
    const hadQueuedResume = this.resumeTimer !== null;
    this.clearTimers();

    const playback = this.stateSync.getPlayback();
    const activeScript = this.stateSync.getActiveScript();
    if (!playback || !activeScript) {
      return false;
    }

    if (playback.chunkIndex >= activeScript.chunks.length - 1) {
      if (pauseForInteraction) {
        if (playback.status !== 'paused') {
          this.stateSync.updatePlayback({...playback, status: 'paused'});
          this.showCurrentScript();
        }
        return true;
      }

      return await this.apply('finished');
    }

    const chapterStarts = activeScript.chapterList.map((chapter) => chapter.startChunkIndex);
    const nextPlayback = applyControlAction(
      {
        ...playback,
        status: pauseForInteraction ? 'paused' : playback.status,
      },
      {
        type: 'advance_chunk',
        chunkCount: activeScript.chunks.length,
        chapterStarts,
      },
    );

    const shouldResume = pauseForInteraction && (playback.status === 'playing' || hadQueuedResume);
    this.stateSync.updatePlayback(nextPlayback);
    this.showCurrentScript();

    if (shouldResume) {
      this.scheduleResumeAfterInteraction();
    } else {
      this.reconcileTimers();
    }

    return true;
  }

  private async rewindChunk(): Promise<boolean> {
    const hadQueuedResume = this.resumeTimer !== null;
    this.clearTimers();

    const playback = this.stateSync.getPlayback();
    const activeScript = this.stateSync.getActiveScript();
    if (!playback || !activeScript) {
      return false;
    }

    const chapterStarts = activeScript.chapterList.map((chapter) => chapter.startChunkIndex);
    const nextPlayback = applyControlAction(
      {
        ...playback,
        status: 'paused',
      },
      {
        type: 'rewind_chunk',
        chapterStarts,
      },
    );

    const shouldResume = playback.status === 'playing' || hadQueuedResume;
    this.stateSync.updatePlayback(nextPlayback);
    this.showCurrentScript();

    if (shouldResume) {
      this.scheduleResumeAfterInteraction();
    } else {
      this.reconcileTimers();
    }

    return true;
  }

  private reconcileTimers(): void {
    this.clearAutoAdvanceTimer();

    const playback = this.stateSync.getPlayback();
    const activeScript = this.stateSync.getActiveScript();
    if (!playback || !activeScript || playback.status !== 'playing') {
      console.info('[g1-teleprompter] reconcileTimers skipped', {
        hasPlayback: Boolean(playback),
        hasActiveScript: Boolean(activeScript),
        status: playback?.status,
      });
      return;
    }

    const currentChunk = activeScript.chunks[playback.chunkIndex] ?? '';
    const durationMs = calculateChunkDurationMs(currentChunk, playback.scrollSpeed);
    console.info('[g1-teleprompter] reconcileTimers scheduled', {
      scrollSpeed: playback.scrollSpeed,
      chunkIndex: playback.chunkIndex,
      chapterIndex: playback.chapterIndex,
      durationMs,
      preview: currentChunk.slice(0, 80),
    });

    this.autoAdvanceTimer = setTimeout(() => {
      console.info('[g1-teleprompter] autoAdvanceTimer fired', {
        scrollSpeed: this.stateSync.getPlayback()?.scrollSpeed,
      });
      void this.advanceChunk(false);
    }, durationMs);
  }

  private scheduleResumeAfterInteraction(): void {
    this.clearTimers();

    this.resumeTimer = setTimeout(() => {
      void this.apply('resume');
    }, AUTO_RESUME_DELAY_MS);
  }

  private clearTimers(): void {
    this.clearAutoAdvanceTimer();

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private clearAutoAdvanceTimer(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private buildAction(type: RuntimeControlType, chunkCount: number, chapterStarts: number[]): PlaybackAction {
    switch (type) {
      case 'next_chapter':
        return {type, chapterStarts};
      case 'pause':
      case 'resume':
      case 'restart':
      case 'repeat':
      case 'faster':
      case 'slower':
      case 'save':
      case 'finished':
        return {type};
      case 'advance_chunk':
        return {type, chunkCount, chapterStarts};
      case 'rewind_chunk':
        return {type, chapterStarts};
      default:
        this.logger.warn({type}, 'Unsupported teleprompter control action');
        return {type: 'save'};
    }
  }

  private showCurrentScript(): void {
    const activeScript = this.stateSync.getActiveScript();
    const playback = this.stateSync.getPlayback();
    const currentChunk = activeScript && playback ? activeScript.chunks[playback.chunkIndex] ?? '' : '';
    const durationMs =
      activeScript && playback && playback.status === 'playing'
        ? calculateChunkDurationMs(currentChunk, playback.scrollSpeed)
        : undefined;

    console.info('[g1-teleprompter] showCurrentScript', {
      hasActiveScript: Boolean(activeScript),
      status: playback?.status,
      scrollSpeed: playback?.scrollSpeed,
      chunkIndex: playback?.chunkIndex,
      durationMs,
      preview: currentChunk.slice(0, 80),
    });

    this.display.showActiveScript(activeScript, durationMs);
  }
}

function calculateChunkDurationMs(chunk: string, scrollSpeed: number): number {
  const readableUnits = estimateReadableUnits(chunk);
  const ms = Math.round((readableUnits / Math.max(scrollSpeed, 60)) * 60_000);
  return Math.max(ms, MIN_CHUNK_DURATION_MS);
}

function estimateReadableUnits(chunk: string): number {
  const words = chunk.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.length;
  }

  const visibleChars = Array.from(chunk).filter((char) => !/\s/u.test(char)).length;
  return Math.max(Math.ceil(visibleChars / 2), 1);
}
