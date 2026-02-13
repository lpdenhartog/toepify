# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toepify is a realtime scorekeeping app for the Dutch card game "Toepen". It tracks scores across tournaments and games with live updates for all connected players. Currently in the **design/documentation phase** — no source code exists yet.

## Tech Stack (planned)

- **Frontend**: React + TypeScript, Vite, PWA (installable)
- **Backend**: Node.js (Fastify or Express) on Railway
- **Realtime**: Socket.IO (WebSocket rooms per game)
- **Database**: PostgreSQL on Railway
- **Hosting**: Railway (backend + DB); frontend on Railway, Vercel, or Netlify

## Architecture

### Data Model (4 tables)
- **tournaments** — `id` is a UUIDv4 secret token (capability-based access, no auth needed to join); has `stake_per_game` (default €2.50)
- **games** — belongs to tournament, has `is_active` flag
- **players** — belongs to tournament (not game), defined by admin at creation (min 2, max 6)
- **scores** — one row per player per game; balance is computed (each game costs stake to enter, winner takes pot)

### Realtime Flow
1. Client fetches game state via HTTP
2. Client connects via WebSocket, joins Socket.IO room `game:{gameId}`
3. Score updates: client emits `score_update` → server validates & persists atomically → broadcasts `score_updated` to room
4. Server maintains a `version` integer for consistency

### Security Model (MVP)
- **Admin access**: PIN-protected `/admin` page (ADR 003) — to be replaced with full accounts later
- **Tournament access**: Possession of secret tournamentId URL grants access (ADR 002)
- Rate limiting on score updates and admin PIN attempts

## Key Documentation

All design docs live in `docs/`. Start with:
1. `docs/vision.md` + `docs/release-plan.md` — scope and phasing
2. `docs/user-stories.md` — backlog with acceptance criteria
3. `docs/user-flows.md` + `docs/ux-guidelines.md` — UI design guidance
4. `docs/data-model.md` + `docs/realtime-design.md` — backend implementation specs
5. `docs/adr/` — architectural decision records (add new ADRs for new decisions)

## MVP Scope (Phase 1)

Admin PIN login → create tournament → auto-create initial game → players join via `/t/{tournamentId}` → enter display name → live scoreboard with realtime updates → persistent Postgres state.
