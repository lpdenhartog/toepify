# User stories

Stories are grouped into **MVP** and **Later**. Each story includes acceptance criteria.

## MVP — Admin

### A1 — Admin login via PIN
**As an admin**, I want to enter a PIN to access admin tools, **so that** only authorized people can create tournaments.

Acceptance criteria:
- Admin page prompts for PIN if not authenticated.
- Correct PIN grants access for a limited time (session).
- Wrong PIN shows an error and does not grant access.

### A2 — Create tournament
**As an admin**, I want to create a tournament, **so that** players can join and track scores.

Acceptance criteria:
- Admin can enter a tournament name (required).
- Admin can set the stake per game (default €2.50).
- Admin enters player names (minimum 2, maximum 6).
- System generates an unguessable `tournamentId` (secret).
- System shows a shareable join link containing the `tournamentId`.
- Tournament is persisted in the database.

### A3 — Create/start a game in a tournament (optional MVP but recommended)
**As an admin**, I want to start a new game for a tournament, **so that** players join the most recent game.

Acceptance criteria:
- Admin can create a new game associated with a tournament.
- The new game becomes the “most recent game”.
- Players opening the tournament link see the newest game.

## MVP — Player (anonymous)

### P1 — Join tournament with secret ID
**As a player**, I want to join a tournament by opening a link, **so that** I can view the current game and scores.

Acceptance criteria:
- Visiting `/t/{tournamentId}` loads the tournament if it exists.
- If the tournament does not exist, show a friendly error.
- If a current game exists, show the latest game.

### P2 — View scores (realtime)
**As a player**, I want to see the current scores update automatically, **so that** everyone stays in sync.

Acceptance criteria:
- Scoreboard shows one column per player with their name.
- Each column shows round-by-round cumulative scores (each round on a new line).
- Players on 14 points display a **Pelt warning icon**.
- Players on ≥ 15 points are shown as **out** (with buy-in icon if eligible).
- The scoreboard shows the **current game pot** (base stakes + buy-ins).
- **Tournament balance** per player is visible (updated only after game finishes).
- When any participant updates a score, all connected clients update within ~1 second.
- Reconnecting refreshes to the authoritative score state.

### P3 — Enter round penalties
**As a player**, I want to enter penalty points per player for the current round, **so that** we can record each round's results.

Acceptance criteria:
- Each player column has **+/−** buttons (at the bottom) to adjust that player's round penalty.
- Round winner gets 0 penalty points.
- Changes are reflected in realtime for all clients.

### P4 — Finish round
**As a player**, I want to finish the current round, **so that** round penalties are committed to the game.

Acceptance criteria:
- A **"Finish Round"** button/icon commits the round.
- Round penalties are added to each player's cumulative game score.
- New cumulative scores appear on a new line below the previous round.
- Players reaching ≥ 15 points are eliminated.
- Players eliminated this round are offered a **buy-in** option (only in the round they are eliminated).

### P5 — Buy back in
**As a player**, I want to buy back into the game after being eliminated, **so that** I can continue playing.

Acceptance criteria:
- Buy-in icon appears next to an eliminated player immediately after the round they are knocked out.
- Buy-in costs one additional `stake_per_game` (as configured in the tournament).
- Buying in increases the current game pot and updates the stake display.
- After buying in, the player continues at 14 points (on Pelt).
- Buy-in is only available immediately after elimination — not in later rounds.

### P6 — Finish game
**As a player**, I want to finish the game when only one player remains, **so that** the winner is recorded and balances are updated.

Acceptance criteria:
- When only one active player remains, the game can be finished.
- A **"Start New Game"** button appears after a game is finished.
- Tournament balances are updated: winner takes the full pot, losers' balances decrease by their stakes + buy-ins.

### P7 — Resume later
**As a player**, I want to reopen the link later and see the latest state, **so that** we can continue.

Acceptance criteria:
- Latest game and scores are loaded from DB on page load.
- The UI shows current scoreboard even after refresh.

## Later (post-MVP)

### L1 — Replace admin PIN with real accounts + roles
- Admin role per tournament
- Invite + manage permissions

### L2 — Separate view and write links / write PIN
- Optional “write key” to prevent accidental edits

### L3 — Score history + undo
- Track each score event for auditing and undo

### L4 — Multiple games within a tournament UI
- List past games and statistics
