import {createSetupToken, requireBearerToken} from '../auth';
import {parseJsonBody, parseResetRequest, parseVerifyRequest} from '../request-parsing';
import {toPublicProfile} from './state-response';
import type {AppRoutes, RouteDeps} from './types';
import {getNow, handleRoute} from './utils';

export function buildSetupRoutes(deps: RouteDeps): Pick<AppRoutes, '/setup/init' | '/setup/verify' | '/setup/reset'> {
  return {
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

async function verifySetup(token: string, deps: RouteDeps): Promise<{ok: true; profile: ReturnType<typeof toPublicProfile>}> {
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

async function resetSetup(
  deps: RouteDeps,
): Promise<{token: string; shortcutUrl: string; profile: ReturnType<typeof toPublicProfile>}> {
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

function createShortcutUrl(token: string): string {
  const shortcutName = encodeURIComponent('Mentra HUD Reader Setup');
  const encodedToken = encodeURIComponent(token);
  return `shortcuts://run-shortcut?name=${shortcutName}&input=text&text=${encodedToken}`;
}
