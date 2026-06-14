# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Never push to main without explicitly asking the user for confirmation first.**
- **When a new feature of fix is implemented, check is there are additonal tests (unit or e2e) to implement as well. Ask if the tests should be built.**

## Project Overview

Toepify is a realtime scorekeeping app for the Dutch card game "Toepen". It tracks scores across tournaments and games with live updates for all connected players. The MVP and user accounts system are fully implemented.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite 7, React Router 7
- **Backend**: Node.js with Express, Socket.IO
- **Database**: PostgreSQL
- **Auth**: JWT (24h expiry), bcrypt password hashing, PIN bootstrap login
- **Hosting**: Railway (backend + DB, frontend served as static files from the same Express server)
- **Testing**: Vitest (server-side unit tests), Playwright (browser E2E tests), GitHub Actions CI

## Development

- Run the built app for manual testing: `npm run build`, then `NODE_ENV=test DATABASE_URL=postgresql://localhost:5432/toepify_test JWT_SECRET=dev node server/dist/index.js` — serves `client/dist` on :3000. The `/__test__/reset` endpoint and rate-limit bypass exist **only** under `NODE_ENV=test`.
- E2E (Playwright): create the test DB once (`createdb toepify_test && psql postgresql://localhost:5432/toepify_test -f server/src/db/schema.sql`), then from the repo root `TEST_DATABASE_URL=postgresql://localhost:5432/toepify_test JWT_SECRET=e2e-test-jwt-secret npx playwright test`. globalSetup throws without `TEST_DATABASE_URL`/`DATABASE_URL`; `reuseExistingServer` reuses a server already on :3000.
- ⚠️ E2E `globalTeardown` truncates all game tables **and** deletes the `e2e_admin` user (`/__test__/reset` keeps users). Don't run E2E against a DB holding manual/demo data.
- **No image tooling** (no sharp/resvg). Rasterize SVG→PNG (e.g. PWA icons) with the repo-root Playwright via a throwaway script like `scripts/generate-icons.mjs`; commit the PNGs, don't wire it into the build.
- Quick test account: the `users` table uses `activation_token`/`activation_expires` (no `activated_at`). Insert an activated admin directly with bcryptjs, run from within `server/` so bare imports resolve. The built server binds `0.0.0.0` → reachable on the LAN at `http://<host-ip>:3000`.

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

## Frontend conventions

- Plain CSS (no Tailwind). Theme tokens (Krijt & Klaver light palette) live on `:root` in `client/src/index.css`; the scoreboard `.tp-*` system + `.pal-petrol` dark opt-in live in `client/src/styles/tp-scoreboard.css`.
- Component files must export **only** components (eslint `react-refresh/only-export-components`) — put hooks, pure helpers, and types in separate `.ts` files.
- Don't rename the class/label hooks Playwright specs depend on: `.scoreboard`, `.penalty-btn`, `.score-row-current td`, `.status-pelt`/`.status-out`, `.buyin-section`/`.btn-buyin`, `.celebration-overlay`, `[aria-label="Ronde afsluiten"]`, text "Nieuw spel".
- **Brand logo** lives in `client/src/components/logo/` (`LogoMark` = green casino tile with cream fanned 10♠ cards; `LogoLockup` = hero icon+wordmark). The mark geometry is **hand-synced across three files** — `LogoMark.tsx`, `client/public/favicon.svg`, `scripts/generate-icons.mjs` (PWA PNGs) — change one, change all three.
- **Logo colour = fixed brand hex** (green `#206848` / cream `#F0EADD`), theme-independent; only the wordmark adapts via `var(--logo-ink)`. ⚠️ In the `.pal-petrol` dark palette `--accent` is **coral** `#f47b5c`, NOT green — never bind logo/wordmark colour to `--accent`; use `--logo-ink` (dark-overridden to `#43c9a8`). The header/hero/favicon/PWA icon are all the same green-tile mark.
- **Fonts load via Google Fonts `@import`** at `client/src/styles/tp-scoreboard.css:1` (Space/Hanken Grotesk + Fredoka), NOT self-hosted. `:root` declares `"Inter"` but it is never actually loaded → falls back to system-ui (pre-existing quirk).

## Key Documentation

All design docs live in `docs/`. Start with:
1. `docs/vision.md` + `docs/release-plan.md` — scope and phasing
2. `docs/user-stories.md` — backlog with acceptance criteria
3. `docs/user-flows.md` + `docs/ux-guidelines.md` — UI design guidance
4. `docs/data-model.md` + `docs/realtime-design.md` — backend implementation specs
5. `docs/adr/` — architectural decision records (add new ADRs for new decisions)

## Current State

MVP (Phase 1) and Accounts (Phase 3) are complete. Core gameplay loop: login → create tournament (name, stake, player names) → auto-create initial game → players join via `/t/{tournamentId}` → play rounds (enter penalties, finish round, handle eliminations/buy-ins) → finish game → start new game → close tournament with settlement. Undo round is also implemented.
