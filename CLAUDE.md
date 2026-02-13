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

### Data Model (6 tables)
- **tournaments** — `id` is a UUIDv4 secret token (capability-based access); has `stake_per_game` (default €2.50)
- **games** — belongs to tournament, status `active`/`finished`, tracks winner
- **players** — belongs to tournament (not game), defined by admin at creation (min 2, max 6)
- **game_players** — per-player state within a game: active/out, buy-in count, cumulative score
- **rounds** — sequential rounds within a game
- **round_scores** — penalty points per player per round

Balances and pot are computed, not stored.

### Game Mechanics
- Players accumulate penalty points across rounds. At 14 = "Pelt" (warning). At ≥ 15 = out.
- Eliminated players can buy back in (costs extra stake, increases pot) only in the round they're knocked out.
- Last player standing wins the pot. Tournament balances update only when a game finishes.

### Realtime Flow
1. Client fetches game state via HTTP
2. Client connects via WebSocket, joins Socket.IO room `game:{gameId}`
3. Round flow: clients set pending penalties → `finish_round` commits → server broadcasts new state
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

Admin PIN login → create tournament (name, stake, player names) → auto-create initial game → players join via `/t/{tournamentId}` → play rounds (enter penalties, finish round, handle eliminations/buy-ins) → finish game → start new game → tournament balances track winnings across games.
