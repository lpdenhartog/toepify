# Non-functional requirements

## Sync performance
- Writers should see their own saved score changes immediately from the HTTP response.
- Viewers should receive persisted score changes within about 10 seconds through automatic polling.

## Consistency and conflict handling
- Server is source of truth.
- If two edits happen quickly, the server determines final state.
- Clients reconcile to the server state through mutation responses or viewer polling.

## Security
- Tournament IDs are unguessable secrets (capability access).
- Admin PIN is never embedded in frontend code (used only for bootstrap).
- Passwords hashed with bcrypt (cost factor 12).
- Minimum password length: 10 characters.
- Account activation tokens expire after 72 hours.
- JWT tokens expire after 24 hours.
- Basic rate limiting for:
  - Login attempts
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
