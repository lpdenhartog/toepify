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
- The "most recent game" is the one with the latest creation timestamp (or active flag).
- Players joining a tournament always land in the most recent game.
- When a game is finished, a "Start New Game" button appears.

## Game mechanics (Toepen rules)
- All players start a game at **0 penalty points**.
- A game consists of multiple **rounds**.
- In each round, a player receives **one or more penalty points** (the round's winner receives 0).
- When a player reaches **14 points**, they are on **"Pelt"** — display a warning icon.
- When a player reaches **15 points**, they are **out** of the game.
- A player who is eliminated can **buy back in** immediately after the round they were knocked out in (not later).
  - Buying in costs one additional `stake_per_game` and increases the current game pot.
  - After buying in, the player continues at 15 points reset to 14 (still on Pelt).
- The last player standing wins the game and takes the full pot.
- Tournament balances are only updated when a game is **finished** (not during).

## Round flow
1. During a round, use **+/−** buttons per player to set that round's penalty points.
2. Press a **"Finish Round"** button/icon to commit the round.
3. Round penalties are added to each player's cumulative game score.
4. New scores appear on a **new line** below the previous round's score (running history visible).
5. After finishing a round, check for eliminations (≥ 15 points) and offer buy-in if applicable.

## Player participation
- Players are defined at tournament creation (names entered by admin, min 2, max 6).
- Scoreboard displays per player (as columns):
  - **Player name** (column header).
  - **Current game stake** — the player's share at stake in the active game (base stake + any buy-ins).
  - **Round-by-round score history** — each round's cumulative total on a new line.
  - **Pelt warning icon** when on 14 points.
  - **Out indicator** when on ≥ 15 points (with buy-in icon if eligible).
  - **+/−** buttons at the bottom of the column for the current round's penalty input.
- Below/above the scoreboard:
  - **Current game pot** — total amount at stake in this game (base stakes + buy-ins from all players).
  - **Tournament balance** per player — running total across completed games (updated only when a game finishes).

## Score updates
- Any connected player can edit round penalties (MVP).
- Updates are persisted immediately.
- All clients receive updates in realtime.

## Admin authentication (MVP)
- `/admin` requires a PIN.
- Admin session expires.

## Sharing
- Join link includes the secret tournamentId.
- Join link can be copied and shared via messaging/email.

