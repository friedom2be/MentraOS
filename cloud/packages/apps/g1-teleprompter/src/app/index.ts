import {AppServer, AppSession} from '@mentra/sdk';

import {createDatabase} from '../server/db';
import {ProfileRepository} from '../server/repositories/profile-repository';
import {ScriptRepository} from '../server/repositories/script-repository';
import {UserSession} from './session/UserSession';
import type {RuntimeServices} from './session/StateSync';

export class G1TeleprompterApp extends AppServer {
  private readonly services: RuntimeServices;

  constructor(config: {packageName: string; apiKey: string; port: number}) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      publicDir: false,
    });

    const database = createDatabase(process.env.DATABASE_PATH || './teleprompter.sqlite');
    this.services = {
      profileRepository: new ProfileRepository(database),
      scriptRepository: new ScriptRepository(database),
    };
  }

  protected override async onSession(
    session: AppSession,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const userSession = new UserSession(session, this.services, sessionId);
    await userSession.initialize();
    this.logger.info({userId, sessionId}, 'G1 teleprompter session started');
  }

  protected override async onStop(
    sessionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    this.logger.info({userId, sessionId, reason}, 'G1 teleprompter session stopped');
    UserSession.getUserSessionIfMatches(userId, sessionId)?.dispose();
    await super.onStop(sessionId, userId, reason);
  }
}
