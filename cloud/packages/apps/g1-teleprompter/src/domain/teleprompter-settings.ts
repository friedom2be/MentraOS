import type {TeleprompterProfile, TeleprompterProfileRow} from './types';

export const DEFAULT_PROFILE = {
  setupComplete: false,
  scrollSpeed: 120,
  summarizeArticles: false,
  summarizeEpubs: false,
  summarizePdfs: false,
  volumeButtonMode: false,
};

export function coerceProfile(row?: TeleprompterProfileRow | null): TeleprompterProfile {
  return {
    ...DEFAULT_PROFILE,
    tokenHash: row?.token_hash || undefined,
    tokenCreatedAt: row?.token_created_at || undefined,
    lastSetupAt: row?.last_setup_at || undefined,
    setupComplete: row ? Boolean(row.setup_complete) : DEFAULT_PROFILE.setupComplete,
    scrollSpeed: row?.scroll_speed ?? DEFAULT_PROFILE.scrollSpeed,
    summarizeArticles: row ? Boolean(row.summarize_articles) : DEFAULT_PROFILE.summarizeArticles,
    summarizeEpubs: row ? Boolean(row.summarize_epubs) : DEFAULT_PROFILE.summarizeEpubs,
    summarizePdfs: row ? Boolean(row.summarize_pdfs) : DEFAULT_PROFILE.summarizePdfs,
    volumeButtonMode: row ? Boolean(row.volume_button_mode) : DEFAULT_PROFILE.volumeButtonMode,
  };
}
