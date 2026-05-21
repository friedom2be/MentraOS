# G1 ntfy Mini-App Design

Date: 2026-05-21

## Goal

Build a dedicated MentraOS mini-app that subscribes to one ntfy topic, interrupts the G1 HUD with incoming notifications for a configurable dwell time, cooperates with other running Mentra apps, and preserves a full notification history that can be reviewed and cleared from both a Mentra webview and an authenticated external API.

## Product Scope

### In Scope

- One persistent ntfy subscription for a personal consolidated notification feed
- Server-side MentraOS app runtime hosted under `cloud/packages/apps`
- Mentra webview for live status, history browsing, and settings
- Configurable HUD dwell time per notification
- Interrupt-style HUD takeover that yields back to other Mentra apps after display
- Queued handling for bursts of notifications
- Multi-screen paging for long notifications on the HUD
- Touch gesture navigation for queued notifications and history review on-glasses
- Persistent local history with delete-one and clear-all actions
- Authenticated external API for reading and clearing history
- Automatic ntfy reconnection with visible connection state

### Out of Scope

- Multiple ntfy topics in v1
- Rich attachments or image rendering on-glasses
- Cross-device user accounts or multi-user support
- Native iOS notification capture inside MentraOS itself
- Advanced notification filtering rules inside the Mentra app

## Architecture

The app uses one hosted TypeScript service, one MentraOS `AppServer`, one local SQLite database, and one ntfy SSE subscription.

### End-to-End Flow

1. Upstream iOS automations and other services post into a single ntfy topic.
2. The ntfy app maintains an SSE connection to that topic.
3. Each incoming ntfy message is normalized and written to SQLite.
4. The runtime enqueues the message for HUD display if a glasses session is active.
5. The HUD shows the notification as a timed overlay, optionally spanning multiple pages for long content.
6. Touch gestures can move forward or backward through the active queue or a history review session.
7. The Mentra webview and external API both read and mutate the same persisted history store.

### Why One Topic

One topic is the most efficient fit for the intended setup. It keeps the Mentra app to one live ntfy connection, one message queue, one formatting pipeline, and one history store while still allowing source labels such as `Discord`, `Signal`, `Gmail`, or `News` to be carried inside each message.

## Runtime Model

The ntfy app should behave as an overlay coordinator rather than a permanent foreground app.

### Concurrency Behavior

- The app listens in the background continuously.
- When a new ntfy notification arrives, it temporarily takes over the HUD.
- After the current notification or queued burst finishes, it yields control so other Mentra apps can resume their own display behavior.
- Notifications arriving close together are appended to a FIFO queue rather than overwriting each other.
- Manual touch interaction pauses the auto-dismiss timer briefly to make navigation readable and predictable.

### Queue Navigation

- Forward touch gesture advances to the next queued notification.
- Backward touch gesture returns to the previous queued notification for re-reading.
- Auto-advance resumes after a short inactivity window.
- When the queue drains, the overlay session ends and the app yields the HUD.

## HUD Display Behavior

The HUD experience is optimized for G1 interruption-first reading rather than dashboard persistence.

### Overlay Rules

- Each notification uses a configurable dwell time such as 10, 15, or 20 seconds.
- The live overlay shows source, title, and body using deliberate paging for long content.
- Long notifications page across multiple HUD screens before yielding back.
- Each page uses formatting that respects G1 line and width constraints.
- Full unabridged content remains available in history even if the live overlay is paged or summarized for layout.

### Reconnect Behavior

- If the glasses reconnect while the app is still running, the app can expose recent ntfy history for on-glasses review.
- History review uses the same forward and backward touch gestures to move through stored notifications.
- Reconnect should not replay stale notifications automatically as live interrupts unless they are still within a configurable freshness window.
- Older items remain accessible through explicit history review only.

## Data Model

SQLite is the v1 persistence layer. It is simple, local, and sufficient for one personal feed with one active configuration.

### Stored Settings

- `ntfyBaseUrl`
- `topicName`
- `bearerTokenEncryptedOrProtected`
- `adminApiTokenHash`
- `overlayDurationSeconds`
- `gestureNavigationEnabled`
- `freshnessWindowSeconds`
- `historyLimit`
- `createdAt`
- `updatedAt`

### Stored Notifications

- `id`
- `topic`
- `sourceLabel`
- `title`
- `body`
- `displayPagesJson`
- `receivedAt`
- `readAt`
- `dismissedAt`
- `rawPayloadJson`
- `fingerprint`
- `isDeleted`

### Queue State

Queue state can remain in memory for the active runtime, with enough persisted notification metadata to rebuild view state safely after restarts.

## Webview UX

The Mentra webview is the primary management surface and should stay focused and lightweight.

### Screens

- `Live Status`
  Shows ntfy connection health, current overlay item, queue depth, last notification time, and a test action.
- `History`
  Shows reverse chronological notifications, full-message drill-in, delete-one action, and clear-all action.
- `Settings`
  Manages ntfy server URL, topic, bearer token, dwell time, gesture controls, freshness window, and API admin token rotation.

### UX Rules

- The app should clearly distinguish live queue state from stored history.
- Clearing history requires confirmation.
- Token values should be masked after first save and only replaced, not redisplayed in plain text.
- Connection errors should be visible but should not block history browsing.

## External API

The external API is backed by the same server-side history store used by the webview.

### Authentication

- Use a separate admin API token, distinct from the ntfy bearer token.
- External clients send that token in an authorization header.

### v1 Endpoints

- `GET /api/status`
  Returns ntfy connection state, queue depth, and basic app health.
- `GET /api/history`
  Returns paginated notification history.
- `GET /api/history/:id`
  Returns one full notification record.
- `DELETE /api/history`
  Clears all notification history after authentication.
- `DELETE /api/history/:id`
  Deletes one notification record.
- `PUT /api/settings`
  Updates ntfy connection and behavior settings.

## ntfy Integration

The app uses ntfy SSE as the live ingest mechanism.

### Connection Behavior

- Maintain one persistent SSE connection to the configured topic.
- Parse ntfy message events into normalized notification records.
- Reconnect automatically with exponential backoff on disconnect or transient failure.
- Surface connection state in the webview and logs.

### Message Handling

- Preserve the raw ntfy payload for debugging and future feature growth.
- Normalize source label, title, and body for both display and history.
- Optionally dedupe exact repeats within a short fingerprint window to avoid noisy duplicate overlays while still permitting a raw audit trail if desired.

## On-Glass History Review

History review is a distinct mode from live interruption.

### Behavior

- The user can enter history review after reconnect or from the webview-triggered state.
- Forward and backward touch gestures scroll through past notifications one item at a time.
- Long historical notifications use the same paging model as live notifications.
- Exiting history review returns the app to passive listening mode.

## Error Handling

- Missing or invalid ntfy configuration should disable live subscription while leaving history and settings accessible.
- ntfy outages should not affect stored history access.
- Glasses disconnections should not lose notifications; incoming items still persist in SQLite.
- Runtime exceptions in formatting or queue display should fail one message safely without crashing the app.

## Testing Strategy

### Automated Coverage

- Notification normalization
- G1 paging and page generation
- Queue ordering and transition behavior
- Touch-driven next and previous navigation
- Auto-dismiss timing pause and resume behavior
- History repository CRUD operations
- External API authentication and clear/delete actions
- ntfy reconnection behavior

### Manual Verification

- Run the ntfy app alongside another Mentra app and confirm ntfy interrupts briefly, then yields back cleanly.
- Send multiple notifications in rapid succession and confirm queue navigation on-glasses.
- Reconnect the glasses and confirm recent history can be browsed with touch gestures.
- Confirm long notifications page across multiple HUD screens.

## Recommended Package Shape

Create a new package at `cloud/packages/apps/g1-ntfy` following the existing Mentra app pattern used by other cloud apps, with separate modules for:

- ntfy connection management
- notification persistence
- overlay queue orchestration
- HUD paging and gesture navigation
- webview routes and API handlers

This keeps the app isolated from the existing teleprompter work while matching the repo’s cloud-side mini-app architecture.
