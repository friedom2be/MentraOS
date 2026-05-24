import type {ScriptSourceType, TeleprompterProfile} from '../../domain/types';

export interface TeleprompterProfileRow {
  setup_complete: number;
  token_hash: string | null;
  token_created_at: string | null;
  scroll_speed: number;
  summarize_articles: number;
  summarize_epubs: number;
  summarize_pdfs: number;
  volume_button_mode: number;
  last_setup_at: string | null;
}

export interface ActiveScriptRow {
  source_type: ScriptSourceType;
  source_title: string;
  raw_text: string;
  display_text: string;
  chapter_index: number;
  chunk_index: number;
  chapter_list_json: string;
  chunks_json: string;
  is_summarized: number;
  word_count_original: number;
  word_count_display: number;
  updated_at: string;
}

export interface PersistedProfileValues extends Partial<TeleprompterProfile> {}
