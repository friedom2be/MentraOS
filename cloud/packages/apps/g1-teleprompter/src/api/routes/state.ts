import {requireBearerToken} from '../auth';
import {
  MAX_SCROLL_SPEED,
  MIN_SCROLL_SPEED,
  normalizeVoiceCommand,
  parseControlRequest,
  parseJsonBody,
  parseVoiceCommandRequest,
  type ControlAction,
} from '../request-parsing';
import {UserSession} from '../../app/session/UserSession';
import {chapterIndexForChunk, type RuntimeControlType} from '../../domain/playback-controller';
import {mapPercentageToScriptPosition} from '../../domain/progress';
import type {ActiveScript, AppStateResponse} from '../../domain/types';
import {buildStateResponse, getState} from './state-response';
import type {AppRoutes, RouteDeps} from './types';
import {getNow, handleRoute} from './utils';

export function buildStateRoutes(deps: RouteDeps): Pick<AppRoutes, '/state' | '/state/control' | '/voice-command'> {
  return {
    '/state': {
      GET: async (req: Request) =>
        await handleRoute(async () => {
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          return Response.json(getState(deps));
        }),
    },
    '/state/control': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          console.info('[g1-teleprompter] /state/control request received');
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const {action, percentage} = parseControlRequest(await parseJsonBody(req));
          console.info('[g1-teleprompter] /state/control parsed', {action, percentage});
          return Response.json(await applyControl(action, deps, percentage));
        }),
    },
    '/voice-command': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const {command} = parseVoiceCommandRequest(await parseJsonBody(req));
          const action = normalizeVoiceCommand(command);
          if (!action) {
            throw Response.json({error: 'Unsupported voice command'}, {status: 400});
          }

          return Response.json(await applyControl(action, deps));
        }),
    },
  };
}

async function applyControl(action: ControlAction, deps: RouteDeps, percentage?: number): Promise<AppStateResponse> {
  const runtimeAction = toRuntimeControlAction(action);
  const runtimeApplied = runtimeAction ? await UserSession.applyControlToAll(runtimeAction) : false;
  if (runtimeApplied) {
    return getState(deps);
  }

  const currentProfile = deps.profileRepository.getProfile();
  let nextProfile = currentProfile;
  let nextScript = deps.scriptRepository.getActiveScript();

  switch (action) {
    case 'faster':
      nextProfile = deps.profileRepository.saveProfile({
        scrollSpeed: Math.min(currentProfile.scrollSpeed + 10, MAX_SCROLL_SPEED),
      });
      break;
    case 'slower':
      nextProfile = deps.profileRepository.saveProfile({
        scrollSpeed: Math.max(currentProfile.scrollSpeed - 10, MIN_SCROLL_SPEED),
      });
      break;
    case 'restart':
      nextScript = updateScript(nextScript, () => ({chapterIndex: 0, chunkIndex: 0}), deps);
      break;
    case 'next_chapter':
      nextScript = updateScript(
        nextScript,
        (script) => {
          const nextChapterIndex = Math.min(script.chapterIndex + 1, Math.max(script.chapterList.length - 1, 0));
          const nextChapter = script.chapterList[nextChapterIndex];
          return {
            chapterIndex: nextChapterIndex,
            chunkIndex: nextChapter?.startChunkIndex ?? script.chunkIndex,
          };
        },
        deps,
      );
      break;
    case 'finished':
      deps.scriptRepository.clearActiveScript();
      nextScript = null;
      break;
    case 'jump_to_percent':
      nextScript = updateScript(
        nextScript,
        (script) => mapPercentageToScriptPosition(percentage ?? 0, script),
        deps,
      );
      break;
    case 'advance_chunk':
      nextScript = updateScript(
        nextScript,
        (script) => {
          const nextChunkIndex = Math.min(script.chunkIndex + 1, Math.max(script.chunks.length - 1, 0));
          return {
            chapterIndex: chapterIndexForChunk(
              nextChunkIndex,
              script.chapterList.map((chapter) => chapter.startChunkIndex),
            ),
            chunkIndex: nextChunkIndex,
          };
        },
        deps,
      );
      break;
    case 'rewind_chunk':
      nextScript = updateScript(
        nextScript,
        (script) => {
          const nextChunkIndex = Math.max(script.chunkIndex - 1, 0);
          return {
            chapterIndex: chapterIndexForChunk(
              nextChunkIndex,
              script.chapterList.map((chapter) => chapter.startChunkIndex),
            ),
            chunkIndex: nextChunkIndex,
          };
        },
        deps,
      );
      break;
    case 'pause':
    case 'resume':
    case 'save':
      break;
  }

  return buildStateResponse(nextProfile, nextScript);
}

function updateScript(
  script: ActiveScript | null,
  transform: (script: ActiveScript) => Pick<ActiveScript, 'chapterIndex' | 'chunkIndex'>,
  deps: RouteDeps,
): ActiveScript | null {
  if (!script) {
    return null;
  }

  const next = {
    ...script,
    ...transform(script),
    updatedAt: getNow(deps),
  };
  deps.scriptRepository.saveActiveScript(next);
  return next;
}

function toRuntimeControlAction(action: ControlAction): RuntimeControlType | null {
  if (action === 'jump_to_percent') {
    return null;
  }

  return action;
}
