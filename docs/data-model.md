# Data model (MVP)

This is a minimal relational model in Postgres. You can adapt as needed.

## Tables

### tournaments
- `id` (TEXT / UUID) — secret tournamentId (unguessable)
- `name` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `created_by` (TEXT) — optional (admin identifier later)

Indexes:
- PK on `id`

### games
- `id` (UUID)
- `tournament_id` (TEXT / UUID) FK -> tournaments.id
- `created_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN) — optional; or compute “most recent” by created_at

Indexes:
- (tournament_id, created_at DESC)

### players
Represents players **within a game**.
- `id` (UUID)
- `game_id` (UUID) FK -> games.id
- `name` (TEXT) — display name (from client)
- `created_at` (TIMESTAMPTZ)

### scores
Current scoreboard. Keep it simple in MVP (one row per player).
- `player_id` (UUID) FK -> players.id
- `value` (INT)
- `updated_at` (TIMESTAMPTZ)

Optional later:
- `score_events` table for history/undo:
  - event_id, game_id, player_id, delta, timestamp, actor_device_id

## Notes
- In MVP, player identity can be tied to a **device-generated id** stored in localStorage, sent with requests.
- If you want “fixed number of player slots,” store `slot_index` on players.
