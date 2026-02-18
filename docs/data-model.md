# Data model (MVP)

This is a minimal relational model in Postgres. You can adapt as needed.

## Tables

### tournaments
- `id` (TEXT / UUID) — secret tournamentId (unguessable)
- `name` (TEXT)
- `stake_per_game` (NUMERIC) — amount each player puts in per game, default 2.50 (winner takes all)
- `status` (TEXT) — `active` | `closed` (default `active`; closed tournaments show settlement)
- `created_at` (TIMESTAMPTZ)
- `created_by` (TEXT) — FK -> users.username (the user who created the tournament)

Indexes:
- PK on `id`

### games
- `id` (UUID)
- `tournament_id` (TEXT / UUID) FK -> tournaments.id
- `status` (TEXT) — `active` | `finished`
- `winner_player_id` (UUID, nullable) FK -> players.id — set when game finishes
- `created_at` (TIMESTAMPTZ)

Indexes:
- (tournament_id, created_at DESC)

### players
Represents players **within a tournament** (defined at tournament creation, min 2, max 6).
- `id` (UUID)
- `tournament_id` (TEXT / UUID) FK -> tournaments.id
- `name` (TEXT) — display name (set by admin at creation)
- `created_at` (TIMESTAMPTZ)

### rounds
One row per completed round in a game.
- `id` (UUID)
- `game_id` (UUID) FK -> games.id
- `round_number` (INT) — sequential within the game (1, 2, 3…)
- `round_type` (TEXT) — `normal` | `buy_in` (default `normal`; buy-in rounds record the score adjustment from a buy-in)
- `created_at` (TIMESTAMPTZ)

### round_scores
Penalty points awarded to each player in a single round.
- `round_id` (UUID) FK -> rounds.id
- `player_id` (UUID) FK -> players.id
- `penalty_points` (INT) — points received this round (0 for the round winner)

### game_players
Tracks per-player state within a game (active/out, buy-ins).
- `game_id` (UUID) FK -> games.id
- `player_id` (UUID) FK -> players.id
- `is_active` (BOOLEAN) — false when eliminated (cumulative score ≥ 15)
- `buy_ins` (INT, default 0) — number of times this player bought back in
- `total_score` (INT, default 0) — cumulative penalty points across all rounds
- `can_buy_in` (BOOLEAN, default false) — true only in the round a player is eliminated, enabling the buy-in option

Composite PK: (game_id, player_id)

### Derived values (not stored, computed)
- **Current game pot**: `stake_per_game × (player_count + total_buy_ins_across_all_players)`
- **Player tournament balance**: computed from finished games only. Per finished game: winner gains `pot − stake_per_game × (1 + own_buy_ins)`, losers lose `stake_per_game × (1 + own_buy_ins)`.

### users
Registered users who can create and manage tournaments.
- `username` (TEXT) — PK, 3-30 chars, alphanumeric + underscores
- `password_hash` (TEXT, nullable) — NULL until account is activated
- `is_admin` (BOOLEAN, default false)
- `activation_token` (TEXT, nullable) — temporary token for account activation
- `activation_expires` (TIMESTAMPTZ, nullable) — expiry for activation token (72h)
- `created_at` (TIMESTAMPTZ)

### user_tournaments
Tracks which tournaments a user has visited or created.
- `username` (TEXT) FK -> users.username
- `tournament_id` (TEXT) FK -> tournaments.id
- `last_visited` (TIMESTAMPTZ)

Composite PK: (username, tournament_id)

## Notes
- Players are created at tournament level by the admin (not per-game, not self-registered).
- Player count is fixed per tournament: minimum 2, maximum 6.
- Round-by-round score history is derived by summing `round_scores` up to each round.
- A player on exactly 14 cumulative points is on "Pelt" (UI warning). At ≥ 15, the player is out.
- Buy-in resets a player's `is_active` to true and sets their `total_score` to the **highest active player's score** (so they rejoin at the worst surviving position). A `buy_in` round is inserted to record this score adjustment.
- Users and tournament players are separate concepts. Users are registered accounts; players are display names within a tournament.
- The `tournaments.created_by` column links a tournament to the user who created it.
