# ADR 001: Choose Railway + Node.js WebSockets + Postgres (Option 1)

- Date: 2026-02-13
- Status: Accepted

## Context
The app needs:
- Anonymous participation (no logins in MVP)
- Admin-only tournament creation (PIN-based in MVP)
- Tournament access by secret ID
- Realtime score updates to all clients
- Minimal operational overhead and cost

## Decision
Use:
- Railway to host a Node.js backend
- WebSockets (Socket.IO) for realtime sync
- Railway Postgres for persistence

## Consequences
### Positive
- Server controls access and hides DB credentials from clients
- Realtime sync is straightforward using rooms
- Easy to add rate limiting and future auth

### Negative
- Must operate a backend service (deployment, logs, uptime)
- Horizontal scaling may require additional coordination (e.g., Redis pub/sub) if multiple instances are used
