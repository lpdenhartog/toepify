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

## Phase 3 (Accounts) ✅ Done
- Proper users + roles (username/password login, admin flag)
- User management in admin panel (create users, reset passwords, activation links)
- Logged-in users can create tournaments from landing page
- "My tournaments" tracking (created + visited)
- PIN login preserved as bootstrap mechanism for first deploy

## Phase 4 (Game features)
- History and undo
- Multiple games browsing
- Stats
