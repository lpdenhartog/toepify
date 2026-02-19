# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Never push to main without explicitly asking the user for confirmation first.**

## Project Overview

Toepify is a realtime scorekeeping app for the Dutch card game "Toepen". It tracks scores across tournaments and games with live updates for all connected players. The MVP and user accounts system are fully implemented.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite 7, React Router 7
- **Backend**: Node.js with Express, Socket.IO
- **Database**: PostgreSQL
- **Auth**: JWT (24h expiry), bcrypt password hashing, PIN bootstrap login
- **Hosting**: Railway (backend + DB, frontend served as static files from the same Express server)
- **Testing**: Vitest (server-side unit tests), Playwright (browser E2E tests), GitHub Actions CI

## Architecture

### Data Model (8 tables)
- **tournaments** — `id` is a UUIDv4 secret token (capability-based access); has `stake_per_game` (default €2.50), `status` (`active`/`closed`), `created_by` (FK to users)
- **games** — belongs to tournament, status `active`/`finished`, tracks winner
- **players** — belongs to tournament (not game), defined by creator at creation (min 2, max 6)
- **game_players** — per-player state within a game: active/out, buy-in count, cumulative score, buy-in eligibility (`can_buy_in`)
- **rounds** — sequential rounds within a game, `round_type` (`normal`/`buy_in`)
- **round_scores** — penalty points per player per round
- **users** — registered accounts with username/password, admin flag, activation tokens
- **user_tournaments** — tracks which tournaments a user has visited or created

Balances and pot are computed, not stored.

### Game Mechanics
- Players accumulate penalty points across rounds. At 14 = "Pelt" (warning). At ≥ 15 = out.
- Eliminated players can buy back in (costs extra stake, increases pot) only in the round they're knocked out. Buy-in sets the player's score to the highest active player's score.
- Last player standing wins the pot. Tournament balances update only when a game finishes.
- Rounds can be undone (deletes last round, recalculates all scores from scratch).
- Tournaments can be closed, which computes final settlement balances.

### Realtime Flow
1. Client fetches game state via HTTP (`GET /api/tournaments/:id/latest`)
2. Client connects via WebSocket, joins Socket.IO room `game:{gameId}`
3. All game mutations go through HTTP POST endpoints; server broadcasts full `game_state` to the room after each mutation
4. Pending penalty inputs are relayed via WebSocket only (not persisted) for live preview across clients

### Security Model
- **User accounts**: Username/password login with JWT (ADR 004). Admin users manage other accounts.
- **PIN bootstrap**: When no activated users exist, `ADMIN_PIN` env var enables initial admin login (ADR 003, superseded by accounts).
- **Tournament access**: Possession of secret tournamentId URL grants access (ADR 002).

## Key Documentation

All design docs live in `docs/`. Start with:
1. `docs/vision.md` + `docs/release-plan.md` — scope and phasing
2. `docs/user-stories.md` — backlog with acceptance criteria
3. `docs/user-flows.md` + `docs/ux-guidelines.md` — UI design guidance
4. `docs/data-model.md` + `docs/realtime-design.md` — backend implementation specs
5. `docs/adr/` — architectural decision records (add new ADRs for new decisions)

## Current State

MVP (Phase 1) and Accounts (Phase 3) are complete. Core gameplay loop: login → create tournament (name, stake, player names) → auto-create initial game → players join via `/t/{tournamentId}` → play rounds (enter penalties, finish round, handle eliminations/buy-ins) → finish game → start new game → close tournament with settlement. Undo round is also implemented.
