# Release plan

## MVP (Phase 1)
- Admin PIN login
- Create tournament (generates secret tournamentId)
- Create initial game automatically
- Public join via `/t/{tournamentId}`
- Enter display name (stored locally)
- Live scoreboard with realtime updates
- Persistent state in Postgres

## Phase 2 (Hardening)
- Rate limiting
- Basic monitoring/logging
- Better reconnection + offline messaging
- Optional: separate view/write link

## Phase 3 (Accounts)
- Proper users + roles
- Admin management per tournament
- Invitations and permissions

## Phase 4 (Game features)
- History and undo
- Multiple games browsing
- Stats
