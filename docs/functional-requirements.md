# Functional requirements

## Tournament management
- Admin can create tournament with:
  - **Name** (required).
  - **Stake per game** (default €2.50) — the amount each player puts in per game (winner takes all).
  - **Player names** (min 2, max 6).
- System generates secret `tournamentId`.
- Tournament is not discoverable without `tournamentId`.
- Tournament has one "most recent game".

## Game management
- A tournament contains one or more games.
- The “most recent game” is the one with the latest creation timestamp (or active flag).
- Players joining a tournament always land in the most recent game.

## Player participation
- Players are defined at tournament creation (names entered by admin, min 2, max 6).
- Scoreboard displays per player:
  - **Player name** (column header).
  - **Current balance** — running total across all games (each game costs the stake to enter; winner takes the full pot).
  - **Current game stake** — the amount at stake in the active game (e.g. €2.50 if that's the tournament's stake per game).

## Score updates
- Any connected player can edit scores (MVP).
- Updates are persisted immediately.
- All clients receive updates in realtime.

## Admin authentication (MVP)
- `/admin` requires a PIN.
- Admin session expires.

## Sharing
- Join link includes the secret tournamentId.
- Join link can be copied and shared via messaging/email.

