import type {AppSession} from '@mentra/sdk';

import type {RuntimeControlType} from '../../domain/playback-controller';
import {ControlManager} from './ControlManager';
import {DisplayManager} from './DisplayManager';
import {StateSync, type RuntimeServices} from './StateSync';

export class UserSession {
  static readonly userSessions: Map<string, UserSession> = new Map<string, UserSession>();

  readonly userId: string;
  readonly sessionId: string;
  readonly appSession: AppSession;
  readonly logger: AppSession['logger'];
  readonly display: DisplayManager;
  readonly state: StateSync;
  readonly control: ControlManager;

  private buttonCleanup: (() => void) | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(appSession: AppSession, services: RuntimeServices, sessionId: string) {
    UserSession.userSessions.get(appSession.userId)?.dispose();

    this.appSession = appSession;
    this.userId = appSession.userId;
    this.sessionId = sessionId;
    this.logger = appSession.logger.child({service: 'TeleprompterUserSession'});
    this.display = new DisplayManager(appSession);
    this.state = new StateSync(services);
    this.control = new ControlManager(this.state, this.display, this.logger);

    UserSession.userSessions.set(this.userId, this);
  }

  async initialize(): Promise<void> {
    this.state.initialize();
    this.display.showActiveScript(this.state.getActiveScript());

    this.buttonCleanup = this.appSession.events.onButtonPress((event) => {
      void this.handleButtonPress(event.buttonId);
    });

    this.syncInterval = setInterval(() => {
      this.syncFromPersistence();
    }, 1_000);

    this.logger.info(
      {
        hasActiveScript: Boolean(this.state.getActiveScript()),
        volumeButtonMode: this.state.getProfile().volumeButtonMode,
      },
      'Teleprompter user session initialized',
    );
  }

  async applyControl(type: RuntimeControlType): Promise<boolean> {
    return await this.control.apply(type);
  }

  dispose(): void {
    if (this.buttonCleanup) {
      this.buttonCleanup();
      this.buttonCleanup = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.control.dispose();
    UserSession.userSessions.delete(this.userId);
  }

  static getUserSession(userId: string): UserSession | undefined {
    return UserSession.userSessions.get(userId);
  }

  static getUserSessionIfMatches(userId: string, sessionId: string): UserSession | undefined {
    const session = UserSession.userSessions.get(userId);
    if (session && session.sessionId === sessionId) {
      return session;
    }

    return undefined;
  }

  static async applyControlToAll(type: RuntimeControlType): Promise<boolean> {
    let applied = false;

    for (const session of UserSession.userSessions.values()) {
      applied = (await session.applyControl(type)) || applied;
    }

    return applied;
  }

  static syncAllFromPersistence(): void {
    for (const session of UserSession.userSessions.values()) {
      session.syncFromPersistence();
    }
  }

  private async handleButtonPress(buttonId: string): Promise<void> {
    if (!this.state.getProfile().volumeButtonMode) {
      return;
    }

    if (buttonId === 'volume_up') {
      await this.control.apply('advance_chunk');
    }

    if (buttonId === 'volume_down') {
      await this.control.apply('rewind_chunk');
    }
  }

  private syncFromPersistence(): void {
    const result = this.state.syncFromPersistence();
    if (!result.changed) {
      return;
    }

    this.control.handleExternalStateChange();
  }
}
