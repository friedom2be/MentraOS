import {requireBearerToken} from '../auth';
import {parseJsonBody, parseSettingsRequest} from '../request-parsing';
import {UserSession} from '../../app/session/UserSession';
import {buildStateResponse} from './state-response';
import type {AppRoutes, RouteDeps} from './types';
import {handleRoute} from './utils';

export function buildSettingsRoutes(deps: RouteDeps): Pick<AppRoutes, '/settings'> {
  return {
    '/settings': {
      POST: async (req: Request) =>
        await handleRoute(async () => {
          console.info('[g1-teleprompter] /settings request received');
          const profile = deps.profileRepository.getProfile();
          await requireBearerToken(req, profile.tokenHash);
          const settings = parseSettingsRequest(await parseJsonBody(req));
          console.info('[g1-teleprompter] /settings parsed', settings);
          const savedProfile = deps.profileRepository.saveProfile(settings);
          UserSession.syncAllFromPersistence();
          console.info('[g1-teleprompter] /settings saved profile', savedProfile);
          return Response.json(buildStateResponse(savedProfile, deps.scriptRepository.getActiveScript()));
        }),
    },
  };
}
