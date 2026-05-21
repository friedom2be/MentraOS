# G1 Teleprompter

Hosted single-user MentraOS teleprompter mini-app for G1 glasses.

This package combines:

- A Bun web server for setup, state, ingestion, and the webview UI
- A MentraOS `AppServer` runtime for connected glasses sessions
- SQLite persistence for one profile and one active script

## What it supports

- First-run setup wizard with one-time token generation
- iPhone Shortcut ingestion for text, URLs, PDF, ePub, `.txt`, and `.md`
- Preview-before-playback
- Saved resume state across the final displayed chunk sequence
- Dashboard percentage-complete display and optional pre-playback jump-to-percent
- Settings for summarization defaults, playback speed, and volume-button stepping

## Start locally

```bash
cd cloud
bun run g1-teleprompter
```

Or directly:

```bash
cd cloud/packages/apps/g1-teleprompter
bun install
bun run dev
```

The webview/API server runs on `PORT + 1`. With the default `.env.example`, the Bun server is on `3334` and the MentraOS app runtime listens on `3333`.

If `MENTRAOS_API_KEY` is not set, the package still boots the webview/API server so the UI can be developed locally.

## Environment

Copy values from `.env.example` and adjust as needed:

```env
PORT=3333
PACKAGE_NAME=com.mentra.g1-teleprompter
MENTRAOS_API_KEY=
PUBLIC_BASE_URL=https://example.ngrok.app
DATABASE_PATH=./teleprompter.sqlite
NODE_ENV=development
```

## Shortcut payload contract

`POST /load`

### Text payload

- `sourceType: "text"`
- `title`
- `text`
- `shouldSummarize`

Example:

```json
{
  "sourceType": "text",
  "title": "Opening remarks",
  "text": "Hello everyone...",
  "shouldSummarize": false
}
```

### URL payload

- `sourceType: "url"`
- `url`
- `shouldSummarize`

Example:

```json
{
  "sourceType": "url",
  "url": "https://example.com/article",
  "shouldSummarize": true
}
```

### File payload

- `sourceType: "pdf" | "epub" | "txt" | "md"`
- `filename`
- `mimeType`
- `base64Data`
- `shouldSummarize`

Example:

```json
{
  "sourceType": "epub",
  "filename": "book.epub",
  "mimeType": "application/epub+zip",
  "base64Data": "<base64 file body>",
  "shouldSummarize": true
}
```

Notes:

- `mimeType` is accepted as Shortcut metadata even though the current server parser only requires `sourceType`, `filename`, and `base64Data`.
- For `.txt` and `.md`, the server normalizes the upload into the text pipeline after UTF-8 decode.
- Percentage-complete and jump-to-percent are based on the final persisted chunk sequence after extraction, summarization, and G1 chunking, not raw source length.

## Local verification

```bash
cd cloud/packages/apps/g1-teleprompter
bun install
bun test src
bun run dev
```

Manual checklist:

- Run `/setup/init` and confirm the token is shown once
- Run `/setup/verify` and confirm `setupComplete` becomes true
- Load text, URL, PDF, and ePub samples
- Confirm preview-before-playback
- Confirm resume, save, finished, and jump-to-percent behavior
- Confirm volume-button mode on real hardware

## Key endpoints

- `POST /setup/init`
- `POST /setup/verify`
- `POST /setup/reset`
- `POST /load`
- `GET /state`
- `POST /state/control`
- `POST /settings`
- `POST /voice-command`

See [HOW-IT-WORKS.md](/Volumes/SalesCoach/Mentra%20Apps/MentraOS/cloud/packages/apps/g1-teleprompter/HOW-IT-WORKS.md) for the flow and architecture.
