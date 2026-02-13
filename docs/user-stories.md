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

### P2 — Enter my name for the game
**As a player**, I want to enter a display name, **so that** my name appears on the scoreboard.

Acceptance criteria:
- If no player name exists in local storage for this tournament, prompt once.
- Name is stored locally on that device (localStorage).
- Name appears on the scoreboard for that player slot.

### P3 — View scores (realtime)
**As a player**, I want to see the current scores update automatically, **so that** everyone stays in sync.

Acceptance criteria:
- When any participant updates a score, all connected clients update within ~1 second.
- Reconnecting refreshes to the authoritative score state.

### P4 — Edit scores (write mode in MVP = always enabled)
**As a player**, I want to adjust scores during the game, **so that** we can track the game live.

Acceptance criteria:
- Player can increment/decrement scores for any player (MVP).
- Each change is persisted immediately.
- Conflicts are resolved by server authority (server broadcasts final state).

### P5 — Resume later
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
