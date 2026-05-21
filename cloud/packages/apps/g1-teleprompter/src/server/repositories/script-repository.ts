import type {Database} from 'bun:sqlite';

import type {ActiveScript} from '../../domain/types';
import type {ActiveScriptRow} from './persistence-types';

export class ScriptRepository {
  constructor(private readonly db: Database) {}

  private parseJson<T>(value: string, field: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Failed to parse active_script.${field}: ${String(error)}`);
    }
  }

  saveActiveScript(script: ActiveScript): void {
    this.db
      .query(
        `
          insert into active_script (
            id,
            source_type,
            source_title,
            raw_text,
            display_text,
            chapter_index,
            chunk_index,
            chapter_list_json,
            chunks_json,
            is_summarized,
            word_count_original,
            word_count_display,
            updated_at
          ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
          on conflict(id) do update set
            source_type = excluded.source_type,
            source_title = excluded.source_title,
            raw_text = excluded.raw_text,
            display_text = excluded.display_text,
            chapter_index = excluded.chapter_index,
            chunk_index = excluded.chunk_index,
            chapter_list_json = excluded.chapter_list_json,
            chunks_json = excluded.chunks_json,
            is_summarized = excluded.is_summarized,
            word_count_original = excluded.word_count_original,
            word_count_display = excluded.word_count_display,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        1,
        script.sourceType,
        script.sourceTitle,
        script.rawText,
        script.displayText,
        script.chapterIndex,
        script.chunkIndex,
        JSON.stringify(script.chapterList),
        JSON.stringify(script.chunks),
        script.isSummarized ? 1 : 0,
        script.wordCountOriginal,
        script.wordCountDisplay,
        script.updatedAt,
      );
  }

  getActiveScript(): ActiveScript | null {
    const row = this.db
      .query<ActiveScriptRow, []>(`
        select
          source_type,
          source_title,
          raw_text,
          display_text,
          chapter_index,
          chunk_index,
          chapter_list_json,
          chunks_json,
          is_summarized,
          word_count_original,
          word_count_display,
          updated_at
        from active_script
        where id = 1
      `)
      .get();

    if (!row) {
      return null;
    }

    return {
      sourceType: row.source_type,
      sourceTitle: row.source_title,
      rawText: row.raw_text,
      displayText: row.display_text,
      chapterIndex: row.chapter_index,
      chunkIndex: row.chunk_index,
      chapterList: this.parseJson(row.chapter_list_json, 'chapter_list_json'),
      chunks: this.parseJson(row.chunks_json, 'chunks_json'),
      isSummarized: Boolean(row.is_summarized),
      wordCountOriginal: row.word_count_original,
      wordCountDisplay: row.word_count_display,
      updatedAt: row.updated_at,
    };
  }
}
