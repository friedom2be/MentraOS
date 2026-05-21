# How Mentra HUD Reader Works

## Overview

Mentra HUD Reader is a hosted single-user mini-app for MentraOS:

1. The user completes one-time setup in the webview.
2. The setup flow generates a bearer token for an iPhone Shortcut.
3. The Shortcut sends text, URLs, or files to `POST /load`.
4. The server extracts content, optionally summarizes it, detects chapters, chunks it for G1 display, and stores one active script in SQLite.
5. The webview dashboard polls `GET /state` and shows preview, chapter, speed, completion percentage, and saved position.
6. The MentraOS runtime reads the same persisted script state and renders chunks to the glasses HUD.

## Setup flow

### `POST /setup/init`

- Generates a one-time token
- Stores only a server-side hash
- Returns the plain token and a Shortcut deep link

### `POST /setup/verify`

- Confirms the token round trip
- Marks `setupComplete = true`

### `POST /setup/reset`

- Rotates the token
- Clears the setup-complete flag
- Returns the app to the setup wizard

## Ingestion flow

`POST /load` accepts three input families:

- Raw text
- Public article URLs
- File uploads for `pdf`, `epub`, `txt`, and `md`

The load pipeline:

1. Normalize request body
2. Extract source text
3. Detect chapters
4. Detect script family
5. Optionally summarize
6. Chunk for G1 display
7. Persist the final chunk list and chapter ranges

The active script always reflects the final displayed chunk sequence. That is the sequence used by saved resume position, percentage-complete, and jump-to-percent.

## Playback state

The active script stores:

- `chapterIndex`
- `chunkIndex`
- `chapterList`
- `chunks`
- `scrollSpeed`
- summarization metadata

`GET /state` returns:

- `profile`
- `activeScript`
- `preview`

The preview state includes:

- current chapter title
- current chunk text
- `globalChunkIndex`
- `totalChunks`
- `totalChapters`
- `percentageComplete`

## Percentage-complete and jump-to-percent

The dashboard and preview UI expose progress as a numeric percentage based on:

- current persisted global chunk index
- total number of final chunks in `activeScript.chunks`

Formula:

- `0%` means the first persisted chunk
- `100%` means the last persisted chunk
- intermediate values map to the nearest valid global chunk index

When the user enters `Start at % / Resume at %` before playback:

1. The input is clamped to `0-100`
2. The app maps that percentage to the nearest valid global chunk index in the final chunk list
3. The app derives the matching `chapterIndex` from persisted chapter start boundaries
4. The new saved position is written before playback resumes

If the field is left blank, behavior stays unchanged:

- resume from the saved position when one exists
- otherwise start from the beginning according to the current control flow

This works for all supported source types, including ePub, because it uses the final displayed chunk sequence instead of raw file length or chapter text length.

## Runtime controls

`POST /state/control` supports:

- `pause`
- `resume`
- `restart`
- `repeat`
- `next_chapter`
- `faster`
- `slower`
- `save`
- `finished`
- `jump_to_percent`

`POST /voice-command` normalizes spoken commands into the same control actions where supported.

## Settings

`POST /settings` persists dashboard-level preferences:

- `scrollSpeed`
- `summarizeArticles`
- `summarizeEpubs`
- `summarizePdfs`
- `volumeButtonMode`

These settings are reflected back through `GET /state`.

## Local verification

```bash
cd cloud/packages/apps/g1-teleprompter
bun install
bun test src
bun run dev
```

Manual checklist:

- Confirm `/setup/init` shows the token once
- Confirm `/setup/verify` flips `setupComplete` to true
- Load text, URL, PDF, and ePub examples
- Confirm preview-before-playback appears
- Confirm resume, save, finished, and jump-to-percent behavior
- Confirm volume-button stepping on real hardware
