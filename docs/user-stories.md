# User stories

Stories are grouped into **MVP** and **Later**. Each story includes acceptance criteria.

## MVP — Admin

### A1 — User login
**As a user**, I want to log in with my username and password, **so that** I can create and manage tournaments.

Acceptance criteria:
- Login page prompts for username and password.
- Correct credentials grant a 24h session.
- Wrong credentials show an error.
- If no activated users exist and ADMIN_PIN is set, PIN login is available as bootstrap.
- Admin users can access the admin panel for user management.

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
- Each player column has a penalty button (tap to increment) to set that player's round penalty.
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
- After buying in, the player's score is set to the highest active player's score (they rejoin at the worst surviving position).
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

## Account stories

### AC1 — Account activation
**As a new user**, I want to activate my account via a link, **so that** I can set my password and start using the app.

Acceptance criteria:
- Admin creates user and receives an activation link.
- Activation link is valid for 72 hours.
- User sets a password (min 10 characters) on the activation page.
- After activation, user can log in with username and password.

### AC2 — Create tournament as logged-in user
**As a logged-in user**, I want to create tournaments from the landing page, **so that** I don't need admin access to create tournaments.

Acceptance criteria:
- Logged-in users see a "Nieuw Toernooi" form on the landing page.
- Created tournaments are linked to the user's account.
- Tournaments appear in "Mijn Toernooien" list.

### AC3 — View my tournaments
**As a logged-in user**, I want to see tournaments I created or visited, **so that** I can quickly access them.

Acceptance criteria:
- Landing page shows "Mijn Toernooien" with created and visited tournaments.
- Own tournaments have a delete button.
- Visited tournaments are tracked automatically.

### AC4 — Admin user management
**As an admin**, I want to create and manage user accounts, **so that** I can control who has access.

Acceptance criteria:
- Admin can create new users and receive activation links.
- Admin can list all users with their status.
- Admin can reset user passwords (generates new activation link).

## Implemented (post-MVP)

### P8 — Undo round
**As a player**, I want to undo the last round, **so that** I can correct mistakes.

Acceptance criteria:
- An "Undo" button is available when at least one round has been played.
- Undoing deletes the last round and recalculates all scores from scratch.
- If the game was finished (only one player left), undoing reopens the game.
- All connected clients receive the updated state in realtime.

### P9 — Close tournament
**As the tournament creator**, I want to close a tournament, **so that** final balances and settlements are calculated.

Acceptance criteria:
- Close button is visible when no rounds have been played in the active game.
- Closing a tournament computes final balances across all finished games.
- Settlement is computed (minimized transactions between players).
- Closed tournaments show a settlement view instead of the scoreboard.
- Settlement is accessible via `GET /api/tournaments/:id/settlement`.

### P10 — Player sit-out
**As a player**, I want to exclude players from a new game, **so that** players who aren't present can sit out.

Acceptance criteria:
- When starting a new game, checkboxes allow excluding tournament players.
- Excluded players are not added as game_players for that game.

## Later (post-MVP)

### L2 — Separate view and write links / write PIN
- Optional "write key" to prevent accidental edits

### L4 — Multiple games within a tournament UI
- List past games and statistics
