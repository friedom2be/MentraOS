import {AppServer, AppSession} from '@mentra/sdk';

/**
 * Minimal app server scaffold for the teleprompter package.
 * Runtime session behavior is added in later tasks.
 */
export class G1TeleprompterApp extends AppServer {
  constructor(config: {packageName: string; apiKey: string; port: number}) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      publicDir: false,
    });
  }

  protected override async onSession(
    _session: AppSession,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    this.logger.info({userId, sessionId}, 'G1 teleprompter session started');
  }

  protected override async onStop(
    sessionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    this.logger.info({userId, sessionId, reason}, 'G1 teleprompter session stopped');
    await super.onStop(sessionId, userId, reason);
  }
}
