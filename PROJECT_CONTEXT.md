# PROJECT_CONTEXT

This file is the authoritative detailed project history for ongoing work in this repository.

Update policy:
- Update this file after every meaningful work session.
- Prefer adding concrete facts over summaries when decisions, regressions, deploy state, or user testing changed.
- If a new task is unusually complex, historical, or tied to older decisions, attach or include this file in the working context.

## Current Focus

Project:
- `Mentra HUD Reader`

Repo:
- `/Volumes/SalesCoach/Mentra Apps/MentraOS`

Working branch:
- `codex/g1-teleprompter-mini-app-spec`

Current feature identity:
- User-facing app name: `Mentra HUD Reader`
- Package identity remains: `com.mentra.g1-teleprompter`

Primary hosted URL:
- `https://mentra-hud-reader.onrender.com`

Developer Console record:
- `console.mentraglass.com`
- App package: `com.mentra.g1-teleprompter`
- Display name: `Mentra HUD Reader`
- Server URL: `https://mentra-hud-reader.onrender.com`
- Webview URL: `https://mentra-hud-reader.onrender.com`

## High-Level History

The work began as a G1 teleprompter mini-app design and implementation effort, then evolved into a more distinct reader product so it would not be confused with the native teleprompter app in MentraOS. The package identity was intentionally kept stable to avoid redoing the cloud app record, API key setup, and tester installation path.

The app originally included a setup wizard built around Shortcuts plus a volume-button stepping option. During real-device testing, those paths proved unreliable or unavailable in practice, so the visible setup flow was simplified and the UI moved toward a direct dashboard-first reading experience.

Testing then shifted from unstable local tunnels (`ngrok`, `localtunnel`) to a hosted Render deployment so the app could be opened more reliably from MentraOS on iPhone and glasses.

## Functional Work Completed

Implemented app capabilities include:
- Load scripts from text, URL, and supported files
- Supported file types include PDF, EPUB, TXT, and MD
- Preview and dashboard playback controls
- Percentage-complete display based on final displayed chunk sequence
- Jump/resume by percentage with clamp `0-100`
- Chunk-based manual controls via on-screen `Previous` and `Next`
- Settings persistence for WPM and other supported runtime preferences
- Dark high-contrast mobile/webview UI styling

Product decisions made during testing:
- Keep display name `Mentra HUD Reader`
- Keep package name `com.mentra.g1-teleprompter`
- Remove visible setup wizard from the main phone UI
- Remove visible volume-button stepping option from settings
- Prefer direct manual chunk stepping in UI over hardware-button dependence

### 8. API routes refactor with preserved endpoint behavior

Observed need:
- `src/api/routes.ts` had grown into a single file containing:
  - route registration
  - setup flow
  - load route
  - state/control/voice routes
  - settings route
  - health route
  - app-state response shaping
  - generic route error handling

Refactor completed:
- Split `src/api/routes.ts` into smaller route modules while preserving endpoint behavior:
  - `src/api/routes/health.ts`
  - `src/api/routes/setup.ts`
  - `src/api/routes/load.ts`
  - `src/api/routes/state.ts`
  - `src/api/routes/settings.ts`
  - `src/api/routes/state-response.ts`
  - `src/api/routes/utils.ts`
  - `src/api/routes/types.ts`
- Kept `src/api/routes.ts` as the composition layer that builds the full route map

Behavioral constraints preserved:
- No auth behavior change
- No percentage/progress behavior change
- No playback control semantic change
- No Render or Docker change
- No runtime endpoint name or method change

Follow-up issue found during verification:
- `bun test src` passed immediately after the split
- `bun x tsc --noEmit` failed because the extracted route typing widened handlers to optional `GET?` / `POST?`
- That caused `src/api/routes.test.ts` calls like `routes['/setup/init'].POST(...)` to become compile-time possibly-undefined

Typing fix applied:
- Replaced the generic optional route-definition type with an endpoint-specific `AppRoutes` map
- Each known route now has a required handler type:
  - `GET` required where the endpoint is GET-only
  - `POST` required where the endpoint is POST-only
- Updated extracted route builders to return `Pick<AppRoutes, ...>` so `createRoutes()` retains the same compile-time guarantees as before the refactor

Verification completed successfully after the typing fix:
- `/Users/friedom/.bun/bin/bun test src`
- `/Users/friedom/.bun/bin/bun x tsc --noEmit`
- `/Users/friedom/.bun/bin/bun run build.ts`

Outcome:
- The API route refactor is now considered safe to keep
- No revert required

## Important Technical Decisions

### App identity

Recommendation accepted:
- Rename only the user-facing app name
- Do not rename the package identity yet

Reason:
- Avoids creating a separate cloud app identity, install record, API key, and console reconfiguration during active testing

### Hosted deployment

Recommendation accepted:
- Use Render for stable hosted testing instead of temporary tunnels

Known limitation:
- Render free tier can spin down after inactivity
- Current SQLite storage is ephemeral on free hosting and may reset on redeploy/restart

### Manual control UX

Because the active G1 path reported no usable hardware button support in session behavior, the app now relies on explicit on-screen manual chunk controls:
- `Previous`
- `Next`

These were moved onto a dedicated row for faster access and better touch ergonomics.

### Remote Mode UX

New phone-webview interaction model added:
- `Remote Mode` is now available from the dashboard as a phone-first blind remote surface
- It intentionally hides the full script preview text while active because the text is already visible on the glasses HUD
- The Remote Mode screen is a minimal black overlay with:
  - script title
  - current chunk / total chunks
  - percentage complete
  - local play/pause status indicator

Remote Mode control mapping:
- left tap zone: previous chunk
- center tap zone: play / pause
- right tap zone: next chunk

Important implementation constraint:
- Volume-button navigation was intentionally not revisited because it was not accessible/reliable through the MentraOS iPhone webview path
- Existing `PreviewCard` edge-tap navigation and `Previous` / `Next` buttons remain in place as the normal-mode fallback

Platform feature handling:
- `navigator.vibrate` is attempted for very short success feedback after remote taps
- If unsupported or blocked, it fails silently
- Wake Lock is attempted only while Remote Mode is mounted
- If unsupported or blocked, it fails silently

Important caveat:
- The current app state API still does not expose persisted runtime playback status to the webview
- To avoid backend/API changes, Remote Mode currently tracks play/pause state locally in the dashboard based on the user’s remote actions
- That is sufficient for the new phone remote workflow, but it is not a guaranteed source of truth if playback is changed elsewhere

Verification completed locally for Remote Mode work:
- `/Users/friedom/.bun/bin/bun test src`
- `/Users/friedom/.bun/bin/bun x tsc --noEmit`
- `/Users/friedom/.bun/bin/bun run build.ts`

## Debugging History

### 1. Temporary tunnel instability

Observed:
- `ngrok` and `localtunnel` URLs changed, died, or returned gateway errors
- MentraOS app often failed with connection errors unrelated to app logic

Resolution:
- Move to Render hosting

### 2. Render build failure: Bun install/build mismatch

Observed on Render:
- Builds failed during container setup
- Initial failure came from skipped package prepare/postinstall behavior

Root cause:
- Render Docker image used Bun `1.2.15`
- Container build did not include `bun.lock`
- Hosted dependency resolution diverged from local passing environment

Fix applied:
- Update `cloud/packages/apps/g1-teleprompter/Dockerfile.render`
- Use `oven/bun:1.3.9`
- Copy `cloud/bun.lock`

Relevant commit:
- `c65e31d39` `Fix Render Bun version and lockfile`

### 3. White-screen webview on MentraOS

Observed:
- App opened to a white screen in MentraOS
- Hosted root HTML loaded successfully
- But CSS and JS asset URLs returned the HTML document instead of real assets

Root cause:
- Production catch-all HTML route intercepted `/dist/frontend.css` and `/dist/frontend.js`

Fix applied:
- Explicitly serve production webview assets before fallback HTML
- Added coverage for production asset loading

Files changed:
- `cloud/packages/apps/g1-teleprompter/src/index.ts`
- `cloud/packages/apps/g1-teleprompter/src/webview/html.ts`
- `cloud/packages/apps/g1-teleprompter/src/webview/html.test.ts`

Relevant commit:
- `590a69f89` `Serve webview assets in production`

Verification completed locally:
- `bun test src/webview/html.test.ts`
- `bun run build.ts`
- `bun x tsc --noEmit`
- Local HTTP verification confirmed:
  - `/` returns app HTML
  - `/dist/frontend.css` returns CSS
  - `/dist/frontend.js` returns JS

### 4. Render out-of-memory during ebook load

Observed:
- User loading an ebook on hosted Render saw:
  - `render.com ran out of memory (used over 512MB) while running your code`

Root cause investigation:
- EPUB uploads currently arrive as base64 JSON and are fully decoded in memory
- The EPUB pipeline then:
  - copies bytes into `Buffer`
  - opens the archive in memory with `AdmZip`
  - extracts chapter content
  - builds combined text, chapter text, and final chunk arrays
- The original EPUB extractor also instantiated `JSDOM` per chapter file, which was a major memory multiplier on Render free

Mitigation applied:
- Removed `JSDOM` from the EPUB extractor
- Replaced it with lightweight tag/title extraction using string processing
- Preserved current extractor behavior in tests
- Removed extra file-byte copies in the upload/decode path so EPUB/PDF ingestion does not duplicate buffers unnecessarily before parsing

Files changed:
- `cloud/packages/apps/g1-teleprompter/src/ingestion/extractors/epub-extractor.ts`
- `cloud/packages/apps/g1-teleprompter/src/api/request-parsing.ts`
- `cloud/packages/apps/g1-teleprompter/src/ingestion/extractors/pdf-extractor.ts`

Verification completed locally:
- `bun test src/ingestion/extractors/epub-extractor.test.ts src/ingestion/load-script.test.ts`
- `bun x tsc --noEmit`
- `bun test src/ingestion/extractors/epub-extractor.test.ts src/ingestion/load-script.test.ts src/api/routes.test.ts`

Important remaining caveat:
- Render free still only provides 512MB, so very large ebooks may remain risky even after the lighter extractor change
- If hosted ebook ingestion must be reliable for bigger books, stronger hosting is still the safest long-term path

### 5. Flashing buttons in phone/glasses webview

Observed:
- With an EPUB loaded and chunk stepping working, several buttons in the in-app UI appeared to flash

Likely root cause:
- The dashboard polls `/state` every 3 seconds
- The frontend was replacing the whole `appState` object even when nothing meaningful changed
- Touch webviews were also getting desktop-style hover/transform button effects, which can flicker on repeated repaint

Mitigation applied:
- Skip `appState` replacement when the polled state is unchanged
- Restrict hover-only button transforms to pointer/fine hover environments
- Disable tap highlight on buttons for touch webviews

Files changed:
- `cloud/packages/apps/g1-teleprompter/src/webview/hooks/useAppState.ts`
- `cloud/packages/apps/g1-teleprompter/src/webview/globals.css`

Verification completed locally:
- `bun x tsc --noEmit`
- `bun test src/webview/components/Dashboard.test.tsx src/webview/components/SettingsPanel.test.tsx src/webview/components/settings-sync.test.ts src/webview/html.test.ts`

### 6. Phone window layout overflow

Observed:
- The app no longer fit within the iPhone MentraOS window cleanly
- User had to scroll around to see controls, making the app difficult to navigate

Likely root cause:
- Desktop-oriented multi-column sections and flex rows were still staying wide too long
- Some panels and text blocks could force horizontal overflow in the smaller in-app phone window

Mitigation applied:
- Disabled horizontal overflow at the page level
- Added `min-width: 0` protections across major grid/panel/form containers
- Allowed long preview text to wrap safely
- Stacked headers and metrics earlier on narrower screens
- Converted tab/action/settings rows into full-width single-column mobile blocks at phone widths
- Added a stronger follow-up pass to:
  - hide horizontal overflow at `html/body/#root` and frame level
  - force long titles and button labels to wrap
  - collapse primary step buttons and action rows earlier
  - reduce hero/title sizing and preview height further on very small screens

Files changed:
- `cloud/packages/apps/g1-teleprompter/src/webview/globals.css`

Verification completed locally:
- `bun x tsc --noEmit`
- `bun test src/webview/components/Dashboard.test.tsx src/webview/components/SettingsPanel.test.tsx src/webview/components/settings-sync.test.ts src/webview/html.test.ts`

### 7. Swipe navigation on preview text

Observed request:
- User wants to navigate chunk pages without looking down at the phone buttons
- `Previous` and `Next` buttons are hard to use blind while trying to read the HUD

Iteration history:
- First attempt used left/right swipe recognition on the preview text area
- User reported the swipes did not work reliably in the phone webview
- Interaction model was then changed to direct left/right edge taps on the preview window

Current mitigation:
- Tap left edge of preview window: previous chunk
- Tap right edge of preview window: next chunk
- Existing buttons remain as fallback
- Preview hint text now teaches edge-tap behavior instead of swipe behavior
- Follow-up usability improvement:
  - enlarged the preview window itself
  - widened the left/right edge tap zones, especially on phone-sized screens
  - enlarged both again after real-device testing confirmed the pattern worked and the goal became maximizing blind tap confidence

Files changed:
- `cloud/packages/apps/g1-teleprompter/src/webview/components/PreviewCard.tsx`
- `cloud/packages/apps/g1-teleprompter/src/webview/globals.css`

Verification completed locally:
- `bun test src/webview/components/Dashboard.test.tsx src/webview/components/SettingsPanel.test.tsx src/webview/components/settings-sync.test.ts src/webview/html.test.ts`
- `bun x tsc --noEmit`

## Current Hosted Status

As of the latest meaningful session:
- Render service exists and is configured
- Commit `c65e31d39` is confirmed live on Render
- Commit `590a69f89` was auto-deploying to fix the white-screen asset routing issue
- A follow-up EPUB memory reduction change has been prepared locally after a Render free-tier OOM report and should be deployed before the next ebook retry
- Commit `401b4d825` is live on Render and includes the lighter EPUB extractor
- Another follow-up memory reduction is prepared to remove extra byte copies during base64 decode and EPUB/PDF handoff before the next hosted ebook retry
- A follow-up UI stability fix is prepared to reduce flashing controls in the phone/glasses webview during background polling
- A follow-up responsive layout fix is prepared to keep the dashboard inside the iPhone MentraOS window without awkward horizontal wandering
- A follow-up interaction improvement is prepared so the preview text itself supports left/right edge-tap chunk navigation

Important note:
- If MentraOS still shows a white screen, first verify whether Render has finished deploying commit `590a69f89`

## User Testing Notes

Confirmed during testing:
- EPUB loading was made to work
- Settings persistence bug was fixed for saved values
- Manual `Previous` / `Next` chunk controls are visible and usable
- The dark dashboard styling is preferred over the accidental white default rendering

Open testing focus:
- Verify hosted Render deploy with commit `590a69f89` is live
- Re-test opening the app from MentraOS
- Confirm the white-screen issue is resolved on actual device

## Important Repo State Notes

Known unrelated or intentionally uncommitted items:
- `cloud/bun.lock` has had unrelated local churn at various points; be careful not to mix unrelated lockfile changes into feature work unless intentional
- `cloud/packages/apps/g1-teleprompter/teleprompter.sqlite` is local state and should not be committed
- `docs/superpowers/` contains local plan/spec artifacts that may remain untracked

## Resume Guidance

If resuming after interruption, check these first:
- Current branch is still `codex/g1-teleprompter-mini-app-spec`
- Render deploy state for latest teleprompter commit
- Developer Console still points both Server URL and Webview URL at Render
- Whether MentraOS is failing from hosting, frontend asset delivery, or runtime behavior

Recommended immediate next question on resume:
- "Did Render finish deploying commit `590a69f89`, and does `Mentra HUD Reader` still white-screen in MentraOS?"
