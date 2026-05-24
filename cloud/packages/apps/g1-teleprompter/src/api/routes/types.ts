import type {ActiveScript} from '../../domain/types';
import type {LoadScriptInput} from '../../ingestion/load-script';
import {ProfileRepository} from '../../server/repositories/profile-repository';
import {ScriptRepository} from '../../server/repositories/script-repository';

type AppProfileRepository = Pick<ProfileRepository, 'getProfile' | 'saveProfile'>;
type AppScriptRepository = Pick<ScriptRepository, 'getActiveScript' | 'saveActiveScript' | 'clearActiveScript'>;

export interface RouteDeps {
  profileRepository: AppProfileRepository;
  scriptRepository: AppScriptRepository;
  loadScript: (input: LoadScriptInput) => Promise<ActiveScript>;
  now?: () => string;
}

export type GetRouteDefinition = {
  GET: (req: Request) => Promise<Response> | Response;
};

export type PostRouteDefinition = {
  POST: (req: Request) => Promise<Response> | Response;
};

export interface AppRoutes {
  '/api/health': GetRouteDefinition;
  '/setup/init': PostRouteDefinition;
  '/setup/verify': PostRouteDefinition;
  '/setup/reset': PostRouteDefinition;
  '/load': PostRouteDefinition;
  '/state': GetRouteDefinition;
  '/state/control': PostRouteDefinition;
  '/voice-command': PostRouteDefinition;
  '/settings': PostRouteDefinition;
}
