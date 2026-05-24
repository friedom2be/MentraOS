import {Database} from 'bun:sqlite';

export function createDatabase(path: string): Database {
  const db = new Database(path, {create: true});

  db.exec(`
    create table if not exists app_profile (
      id integer primary key check (id = 1),
      setup_complete integer not null default 0,
      token_hash text,
      token_created_at text,
      scroll_speed integer not null default 120,
      summarize_articles integer not null default 0,
      summarize_epubs integer not null default 0,
      summarize_pdfs integer not null default 0,
      volume_button_mode integer not null default 0,
      last_setup_at text
    );

    create table if not exists active_script (
      id integer primary key check (id = 1),
      source_type text not null,
      source_title text not null,
      raw_text text not null,
      display_text text not null,
      chapter_index integer not null,
      chunk_index integer not null,
      chapter_list_json text not null,
      chunks_json text not null,
      is_summarized integer not null,
      word_count_original integer not null,
      word_count_display integer not null,
      updated_at text not null
    );
  `);

  db.exec(`insert or ignore into app_profile (id) values (1);`);
  return db;
}
