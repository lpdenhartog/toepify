# Non-functional requirements

## Realtime performance
- Score changes should propagate to connected clients within ~1 second under normal conditions.
- WebSocket connection should reconnect automatically after transient failures.

## Consistency and conflict handling
- Server is source of truth.
- If two edits happen quickly, the server determines final state and broadcasts it.
- Clients reconcile to the server state.

## Security (MVP)
- Tournament IDs are unguessable secrets (capability access).
- Admin PIN is never embedded in frontend code.
- Basic rate limiting for:
  - Admin login attempts
  - Tournament creation
  - Score update endpoints

## Reliability
- All score updates are persisted in Postgres.
- App handles refresh/reload without losing state.

## Privacy
- No personal data required; only display names chosen by players.

## Cost
- Prefer managed hosting with minimal always-on infrastructure.
- Target small-group usage (friends/tournaments).

