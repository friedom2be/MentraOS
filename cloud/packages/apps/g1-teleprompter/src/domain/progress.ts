import {chapterIndexForChunk, chunkIndexForPercentage, clampPercentage, percentageForChunkIndex} from './playback-controller';
import type {ActiveScript, ScriptProgress} from './types';

export interface ScriptPosition {
  percentage: number;
  globalChunkIndex: number;
  chapterIndex: number;
  chunkIndex: number;
}

export function mapPercentageToScriptPosition(percentage: number, script: Pick<ActiveScript, 'chunks' | 'chapterList'>): ScriptPosition {
  const totalChunks = script.chunks.length;
  const globalChunkIndex = chunkIndexForPercentage(percentage, totalChunks);
  const chapterIndex = chapterIndexForChunk(
    globalChunkIndex,
    script.chapterList.map((chapter) => chapter.startChunkIndex),
  );

  return {
    percentage: clampPercentage(percentage),
    globalChunkIndex,
    chapterIndex,
    chunkIndex: globalChunkIndex,
  };
}

export function getScriptProgress(script: Pick<ActiveScript, 'chunks' | 'chapterList' | 'chunkIndex'>): ScriptProgress {
  const totalChunks = script.chunks.length;
  const globalChunkIndex = clampChunkIndex(script.chunkIndex, totalChunks);

  return {
    percentage: percentageForChunkIndex(globalChunkIndex, totalChunks),
    globalChunkIndex,
    totalChunks,
    totalChapters: script.chapterList.length,
  };
}

function clampChunkIndex(chunkIndex: number, chunkCount: number): number {
  if (chunkCount <= 1) {
    return 0;
  }

  return Math.min(Math.max(chunkIndex, 0), chunkCount - 1);
}
