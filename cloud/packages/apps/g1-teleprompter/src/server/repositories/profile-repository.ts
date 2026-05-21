import type {Database} from 'bun:sqlite';

import {coerceProfile, DEFAULT_PROFILE} from '../../domain/teleprompter-settings';
import type {TeleprompterProfile, TeleprompterProfileRow} from '../../domain/types';

export class ProfileRepository {
  constructor(private readonly db: Database) {}

  getProfile(): TeleprompterProfile {
    const row = this.db
      .query<TeleprompterProfileRow, []>(`
        select
          setup_complete,
          token_hash,
          token_created_at,
          scroll_speed,
          summarize_articles,
          summarize_epubs,
          summarize_pdfs,
          volume_button_mode,
          last_setup_at
        from app_profile
        where id = 1
      `)
      .get();

    return coerceProfile(row);
  }

  saveProfile(profile: Partial<TeleprompterProfile>): TeleprompterProfile {
    const nextProfile = {
      ...this.getProfile(),
      ...profile,
    };

    this.db
      .query(
        `
          update app_profile
          set
            setup_complete = ?1,
            token_hash = ?2,
            token_created_at = ?3,
            scroll_speed = ?4,
            summarize_articles = ?5,
            summarize_epubs = ?6,
            summarize_pdfs = ?7,
            volume_button_mode = ?8,
            last_setup_at = ?9
          where id = 1
        `,
      )
      .run(
        nextProfile.setupComplete ? 1 : 0,
        nextProfile.tokenHash ?? null,
        nextProfile.tokenCreatedAt ?? null,
        nextProfile.scrollSpeed ?? DEFAULT_PROFILE.scrollSpeed,
        nextProfile.summarizeArticles ? 1 : 0,
        nextProfile.summarizeEpubs ? 1 : 0,
        nextProfile.summarizePdfs ? 1 : 0,
        nextProfile.volumeButtonMode ? 1 : 0,
        nextProfile.lastSetupAt ?? null,
      );

    return this.getProfile();
  }
}
