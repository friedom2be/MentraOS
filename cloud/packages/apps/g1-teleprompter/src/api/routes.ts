import {createSetupToken, requireBearerToken} from './auth';
import {
  normalizeVoiceCommand,
  parseControlRequest,
  parseJsonBody,
  parseLoadRequest,
  parseResetRequest,
  parseVerifyRequest,
  parseVoiceCommandRequest,
  type ControlAction,
} from './request-parsing';
import type {ActiveScript, TeleprompterProfile} from '../domain/types';
import {loadScript as runLoadScript, type LoadScriptInput} from '../ingestion/load-script';
import {createDatabase} from '../server/db';
import {ProfileRepository} from '../server/repositories/profile-repository';
import {ScriptRepository} from '../server/repositories/script-repository';

type AppProfileRepository = Pick<ProfileRepository, 'getProfile' | 'saveProfile'>;
type AppScriptRepository = Pick<ScriptRepository, 'getActiveScript' | 'saveActiveScript' | 'clearActiveScript'>;

interface RouteDeps {
  profileRepository: AppProfileRepository;
  scriptRepository: AppScriptRepository;
  loadScript: (input: LoadScriptInput) => Promise<ActiveScript>;
  now?: () => string;
}

interface StateResponse {
  profile: PublicProfile;
  activeScript: ActiveScript | null;
  preview: {
    chapterIndex: number;
    chunkIndex: number;
    currentChunk: string | null;
    currentChapterTitle: string | null;
    totalChunks: number;
    totalChapters: number;
  } | null;
}

type PublicProfile = Omit<TeleprompterProfile, 'tokenHash'>;

const database = createDatabase(process.env.DATABASE_PATH || './teleprompter.sqlite');
const profileRepository = new ProfileRepository(database);
const scriptRepository = new ScriptRepository(database);

export const routes = createRoutes({
  profileRepository,
  scriptRepository,
  loadScript: async (input) => await runLoadScript(input, {scriptRepository}),
});

export function createRoutes(deps: RouteDeps) {
  return {
    '/api/health': {
      async GET(_req: Request) {
        return Response.json({
          status: 'ok',
          app: 'g1-teleprompter',
          timestamp: new Date().toISOString(),
        });
      },
    },
    '/setup/init': {
      POST: async (_req: Request) => await handleRoute(async () => Response.json(await initSetup(deps))),
    },
    '/setup/verify': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          const body = parseVerifyRequest(await parseJsonBody(req));
          return Response.json(await verifySetup(body.token, deps));
        }),
    },
    '/setup/reset': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          parseResetRequest(await parseJsonBody(req));
          return Response.json(await resetSetup(deps));
        }),
    },
    '/load': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const loadInput = parseLoadRequest(await parseJsonBody(req), profile);
          const activeScript = await deps.loadScript(loadInput);
          return Response.json(buildStateResponse(profile, activeScript));
        }),
    },
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
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const {action} = parseControlRequest(await parseJsonBody(req));
          return Response.json(applyControl(action, deps));
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

          return Response.json(applyControl(action, deps));
        }),
    },
  };
}

async function initSetup(deps: RouteDeps): Promise<{token: string; shortcutUrl: string}> {
  const profile = deps.profileRepository.getProfile();
  if (profile.setupComplete) {
    throw Response.json({error: 'Setup already complete'}, {status: 409});
  }

  if (profile.tokenHash) {
    throw Response.json({error: 'Setup token has already been shown'}, {status: 409});
  }

  const {plainToken, tokenHash} = await createSetupToken();
  deps.profileRepository.saveProfile({
    setupComplete: false,
    tokenHash,
    tokenCreatedAt: getNow(deps),
  });

  return {
    token: plainToken,
    shortcutUrl: createShortcutUrl(plainToken),
  };
}

async function verifySetup(token: string, deps: RouteDeps): Promise<{ok: true; profile: PublicProfile}> {
  const profile = deps.profileRepository.getProfile();
  const request = new Request('http://localhost/setup/verify', {
    headers: {authorization: `Bearer ${token}`},
  });

  await requireBearerToken(request, profile.tokenHash);

  const savedProfile = deps.profileRepository.saveProfile({
    setupComplete: true,
    lastSetupAt: getNow(deps),
  });

  return {ok: true, profile: toPublicProfile(savedProfile)};
}

async function resetSetup(deps: RouteDeps): Promise<{token: string; shortcutUrl: string; profile: PublicProfile}> {
  const {plainToken, tokenHash} = await createSetupToken();
  const profile = deps.profileRepository.saveProfile({
    setupComplete: false,
    tokenHash,
    tokenCreatedAt: getNow(deps),
    lastSetupAt: undefined,
  });

  return {
    token: plainToken,
    shortcutUrl: createShortcutUrl(plainToken),
    profile: toPublicProfile(profile),
  };
}

function getState(deps: RouteDeps): StateResponse {
  const profile = deps.profileRepository.getProfile();
  const activeScript = deps.scriptRepository.getActiveScript();
  return buildStateResponse(profile, activeScript);
}

function applyControl(action: ControlAction, deps: RouteDeps): StateResponse {
  const currentProfile = deps.profileRepository.getProfile();
  let nextProfile = currentProfile;
  let nextScript = deps.scriptRepository.getActiveScript();

  switch (action) {
    case 'faster':
      nextProfile = deps.profileRepository.saveProfile({
        scrollSpeed: Math.min(currentProfile.scrollSpeed + 10, 220),
      });
      break;
    case 'slower':
      nextProfile = deps.profileRepository.saveProfile({
        scrollSpeed: Math.max(currentProfile.scrollSpeed - 10, 60),
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

function buildStateResponse(profile: TeleprompterProfile, activeScript: ActiveScript | null): StateResponse {
  const currentChunk = activeScript?.chunks[activeScript.chunkIndex] ?? null;
  const currentChapter = activeScript?.chapterList[activeScript.chapterIndex] ?? null;

  return {
    profile: toPublicProfile(profile),
    activeScript,
    preview: activeScript
      ? {
          chapterIndex: activeScript.chapterIndex,
          chunkIndex: activeScript.chunkIndex,
          currentChunk,
          currentChapterTitle: currentChapter?.title ?? null,
          totalChunks: activeScript.chunks.length,
          totalChapters: activeScript.chapterList.length,
        }
      : null,
  };
}

function toPublicProfile(profile: TeleprompterProfile): PublicProfile {
  const {tokenHash: _tokenHash, ...publicProfile} = profile;
  return publicProfile;
}

function createShortcutUrl(token: string): string {
  const shortcutName = encodeURIComponent('Mentra Teleprompter Setup');
  const encodedToken = encodeURIComponent(token);
  return `shortcuts://run-shortcut?name=${shortcutName}&input=text&text=${encodedToken}`;
}

function getNow(deps: RouteDeps): string {
  return (deps.now || (() => new Date().toISOString()))();
}

async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({error: message}, {status: 500});
  }
}
