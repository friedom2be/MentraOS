import type {TeleprompterProfile} from './types';

export const DEFAULT_PROFILE = {
  setupComplete: false,
  scrollSpeed: 120,
  summarizeArticles: false,
  summarizeEpubs: false,
  summarizePdfs: false,
  volumeButtonMode: false,
};

export function coerceProfile(profile?: Partial<TeleprompterProfile> | null): TeleprompterProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    tokenHash: profile?.tokenHash || undefined,
    tokenCreatedAt: profile?.tokenCreatedAt || undefined,
    lastSetupAt: profile?.lastSetupAt || undefined,
    setupComplete: profile?.setupComplete ?? DEFAULT_PROFILE.setupComplete,
    scrollSpeed: profile?.scrollSpeed ?? DEFAULT_PROFILE.scrollSpeed,
    summarizeArticles: profile?.summarizeArticles ?? DEFAULT_PROFILE.summarizeArticles,
    summarizeEpubs: profile?.summarizeEpubs ?? DEFAULT_PROFILE.summarizeEpubs,
    summarizePdfs: profile?.summarizePdfs ?? DEFAULT_PROFILE.summarizePdfs,
    volumeButtonMode: profile?.volumeButtonMode ?? DEFAULT_PROFILE.volumeButtonMode,
  };
}
