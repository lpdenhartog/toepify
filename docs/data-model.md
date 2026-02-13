# Data model (MVP)

This is a minimal relational model in Postgres. You can adapt as needed.

## Tables

### tournaments
- `id` (TEXT / UUID) — secret tournamentId (unguessable)
- `name` (TEXT)
- `stake_per_game` (NUMERIC) — amount each player puts in per game, default 2.50 (winner takes all)
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
Represents players **within a tournament** (defined at tournament creation, min 2, max 6).
- `id` (UUID)
- `tournament_id` (TEXT / UUID) FK -> tournaments.id
- `name` (TEXT) — display name (set by admin at creation)
- `created_at` (TIMESTAMPTZ)

### scores
Current scoreboard. One row per player **per game**.
- `player_id` (UUID) FK -> players.id
- `game_id` (UUID) FK -> games.id
- `value` (INT) — game score (Toepen points)
- `updated_at` (TIMESTAMPTZ)

Balance is **computed** from completed games: each game costs `stake_per_game` to enter; winner takes the pot (`stake_per_game × player_count`). A player's balance = winnings − total stakes paid across all completed games.

Optional later:
- `score_events` table for history/undo:
  - event_id, game_id, player_id, delta, timestamp, actor_device_id

## Notes
- Players are created at tournament level by the admin (not per-game, not self-registered).
- Player count is fixed per tournament: minimum 2, maximum 6.
