import {chapterIndexForChunk} from '../../domain/playback-controller';
import {getScriptProgress} from '../../domain/progress';
import type {ActiveScript, AppStateResponse, PreviewState, PublicTeleprompterProfile, TeleprompterProfile} from '../../domain/types';
import type {RouteDeps} from './types';

export function getState(deps: RouteDeps): AppStateResponse {
  const profile = deps.profileRepository.getProfile();
  const activeScript = deps.scriptRepository.getActiveScript();
  return buildStateResponse(profile, activeScript);
}

export function buildStateResponse(profile: TeleprompterProfile, activeScript: ActiveScript | null): AppStateResponse {
  return {
    profile: toPublicProfile(profile),
    activeScript,
    preview: buildPreviewState(activeScript),
  };
}

export function toPublicProfile(profile: TeleprompterProfile): PublicTeleprompterProfile {
  const {tokenHash: _tokenHash, ...publicProfile} = profile;
  return publicProfile;
}

function buildPreviewState(activeScript: ActiveScript | null): PreviewState | null {
  if (!activeScript) {
    return null;
  }

  const progress = getScriptProgress(activeScript);
  const chapterIndex =
    activeScript.chapterList[activeScript.chapterIndex] !== undefined
      ? activeScript.chapterIndex
      : chapterIndexForChunk(
          progress.globalChunkIndex,
          activeScript.chapterList.map((chapter) => chapter.startChunkIndex),
        );
  const currentChunk = activeScript.chunks[progress.globalChunkIndex] ?? null;
  const currentChapter = activeScript.chapterList[chapterIndex] ?? null;

  return {
    chapterIndex,
    chunkIndex: progress.globalChunkIndex,
    globalChunkIndex: progress.globalChunkIndex,
    currentChunk,
    currentChapterTitle: currentChapter?.title ?? null,
    totalChunks: progress.totalChunks,
    totalChapters: progress.totalChapters,
    percentage: progress.percentage,
    percentageComplete: progress.percentage,
  };
}
