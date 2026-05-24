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
          const rawBody = await readRawBody(req);
          let parsedBody: unknown;

          try {
            parsedBody = await parseJsonBody(req);
          } catch (error) {
            logRejectedSettingsRequest(rawBody, undefined, error);
            throw error;
          }

          let settings;
          try {
            settings = parseSettingsRequest(parsedBody);
          } catch (error) {
            logRejectedSettingsRequest(rawBody, parsedBody, error);
            throw error;
          }

          console.info('[g1-teleprompter] /settings parsed', settings);
          const savedProfile = deps.profileRepository.saveProfile(settings);
          UserSession.syncAllFromPersistence();
          console.info('[g1-teleprompter] /settings saved profile', savedProfile);
          return Response.json(buildStateResponse(savedProfile, deps.scriptRepository.getActiveScript()));
        }),
    },
  };
}

async function readRawBody(req: Request): Promise<string | null> {
  try {
    return await req.clone().text();
  } catch {
    return null;
  }
}

function logRejectedSettingsRequest(rawBody: string | null, parsedBody: unknown, error: unknown) {
  console.warn('[g1-teleprompter] /settings rejected', {
    rawBody: rawBody ? rawBody.slice(0, 500) : null,
    parsedBody: summarizeParsedBody(parsedBody),
    error: describeRouteError(error),
  });
}

function summarizeParsedBody(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [
      key,
      fieldValue === null ? 'null' : Array.isArray(fieldValue) ? 'array' : typeof fieldValue,
    ]),
  );
}

function describeRouteError(error: unknown): string {
  if (error instanceof Response) {
    return `Response(${error.status})`;
  }

  return error instanceof Error ? error.message : 'unknown error';
}
