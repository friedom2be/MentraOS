import {loadScript as runLoadScript} from '../ingestion/load-script';
import {createDatabase} from '../server/db';
import {ProfileRepository} from '../server/repositories/profile-repository';
import {ScriptRepository} from '../server/repositories/script-repository';
import {buildHealthRoutes} from './routes/health';
import {buildLoadRoutes} from './routes/load';
import {buildSettingsRoutes} from './routes/settings';
import {buildSetupRoutes} from './routes/setup';
import {buildStateRoutes} from './routes/state';
import type {AppRoutes, RouteDeps} from './routes/types';

const database = createDatabase(process.env.DATABASE_PATH || './teleprompter.sqlite');
const profileRepository = new ProfileRepository(database);
const scriptRepository = new ScriptRepository(database);

export const routes = createRoutes({
  profileRepository,
  scriptRepository,
  loadScript: async (input) => await runLoadScript(input, {scriptRepository}),
});

export function createRoutes(deps: RouteDeps): AppRoutes {
  return {
    ...buildHealthRoutes(),
    ...buildSetupRoutes(deps),
    ...buildLoadRoutes(deps),
    ...buildStateRoutes(deps),
    ...buildSettingsRoutes(deps),
  };
}
