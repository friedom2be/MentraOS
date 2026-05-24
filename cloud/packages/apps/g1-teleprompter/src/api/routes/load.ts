import {requireBearerToken} from '../auth';
import {parseJsonBody, parseLoadRequest} from '../request-parsing';
import {buildStateResponse} from './state-response';
import type {AppRoutes, RouteDeps} from './types';
import {handleRoute} from './utils';

export function buildLoadRoutes(deps: RouteDeps): Pick<AppRoutes, '/load'> {
  return {
    '/load': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          console.info('[g1-teleprompter] /load request received');
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const loadInput = parseLoadRequest(await parseJsonBody(req), profile);
          const activeScript = await deps.loadScript(loadInput);
          return Response.json(buildStateResponse(profile, activeScript));
        }),
    },
  };
}
