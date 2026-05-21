import type {TeleprompterProfile, ActiveScript} from '../../domain/types';
import type {PlaybackState} from '../../domain/playback-controller';
import type {ProfileRepository} from '../../server/repositories/profile-repository';
import type {ScriptRepository} from '../../server/repositories/script-repository';

type SessionProfileRepository = Pick<ProfileRepository, 'getProfile' | 'saveProfile'>;
type SessionScriptRepository = Pick<ScriptRepository, 'getActiveScript' | 'saveActiveScript' | 'clearActiveScript'>;

export interface RuntimeServices {
  profileRepository: SessionProfileRepository;
  scriptRepository: SessionScriptRepository;
  now?: () => string;
}

export interface SyncResult {
  changed: boolean;
  profileChanged: boolean;
  scriptChanged: boolean;
}

export class StateSync {
  private profile: TeleprompterProfile;
  private activeScript: ActiveScript | null = null;
  private playback: PlaybackState | null = null;

  constructor(private readonly services: RuntimeServices) {
    this.profile = services.profileRepository.getProfile();
  }

  initialize(): SyncResult {
    return this.syncFromPersistence();
  }

  getProfile(): TeleprompterProfile {
    return this.profile;
  }

  getActiveScript(): ActiveScript | null {
    return this.activeScript;
  }

  getPlayback(): PlaybackState | null {
    return this.playback;
  }

  syncFromPersistence(): SyncResult {
    const nextProfile = this.services.profileRepository.getProfile();
    const nextScript = this.services.scriptRepository.getActiveScript();

    const profileChanged = serializeProfile(nextProfile) !== serializeProfile(this.profile);
    const scriptChanged = serializeScript(nextScript) !== serializeScript(this.activeScript);
    const shouldPreserveStatus = isSameScript(this.activeScript, nextScript);

    this.profile = nextProfile;
    this.activeScript = nextScript;

    if (!nextScript) {
      this.playback = null;
    } else {
      this.playback = {
        chapterIndex: nextScript.chapterIndex,
        chunkIndex: nextScript.chunkIndex,
        scrollSpeed: nextProfile.scrollSpeed,
        status: shouldPreserveStatus ? this.playback?.status ?? 'paused' : 'paused',
      };
    }

    return {
      changed: profileChanged || scriptChanged,
      profileChanged,
      scriptChanged,
    };
  }

  updatePlayback(nextPlayback: PlaybackState): ActiveScript | null {
    this.playback = nextPlayback;
    this.profile = this.services.profileRepository.saveProfile({
      scrollSpeed: nextPlayback.scrollSpeed,
    });

    if (!this.activeScript) {
      return null;
    }

    const nextScript: ActiveScript = {
      ...this.activeScript,
      chapterIndex: nextPlayback.chapterIndex,
      chunkIndex: nextPlayback.chunkIndex,
      updatedAt: this.getNow(),
    };

    this.services.scriptRepository.saveActiveScript(nextScript);
    this.activeScript = nextScript;
    return nextScript;
  }

  clearActiveScript(): void {
    this.services.scriptRepository.clearActiveScript();
    this.activeScript = null;
    this.playback = null;
  }

  private getNow(): string {
    return (this.services.now || (() => new Date().toISOString()))();
  }
}

function isSameScript(left: ActiveScript | null, right: ActiveScript | null): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.sourceType === right.sourceType &&
    left.sourceTitle === right.sourceTitle &&
    left.rawText === right.rawText &&
    left.displayText === right.displayText
  );
}

function serializeProfile(profile: TeleprompterProfile): string {
  return JSON.stringify(profile);
}

function serializeScript(script: ActiveScript | null): string {
  return JSON.stringify(script);
}
