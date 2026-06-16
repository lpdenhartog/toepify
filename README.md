# Toepify

Toepify is a scorekeeping app for the Dutch card game **Toepen**. It tracks rounds, penalties, eliminations, buy-ins, pots, balances, tournament history, and final settlements across a full tournament.

The app is built for phone-at-the-table use: tournament links are easy to share, pages open in read-only viewer mode by default, score entry can be enabled when needed, the scoreboard refreshes over plain HTTP, and the installed PWA can keep the screen awake on supported browsers.

## Current features

- Account login with JWT sessions, password activation links, admin user management, and PIN bootstrap for the first admin.
- Tournament creation with 2 to 6 players, configurable stake per game, secret UUID tournament links, and "Mijn Toernooien" history for created or visited tournaments.
- HTTP-only scoreboard sync: viewers poll the latest persisted game state every 10 seconds; writers update immediately from mutation responses.
- Viewer and writer modes, so shared links are safe for spectators while scorekeepers can switch into editing.
- Complete Toepen game flow: finish rounds, mark players as out at 15+, show pelt at 14, handle immediate buy-ins, undo the last round, finish games, start the next game, and close tournaments.
- Tournament history page with all games in a tournament.
- Final settlement calculation when a tournament is closed.
- Redesigned "Krijt & Klaver" scoreboard with portrait and landscape layouts, drama-grid game summaries, celebration stats, buy-in animation, and score readout via browser speech synthesis.
- PWA support with manifest, service worker, install icons, favicon/logo system, and a screen wake-lock toggle.
- API rate limiting for general traffic, writes, auth, admin, and game actions.
- Unit tests with Vitest and browser E2E tests with Playwright.

## Tech stack

- **Frontend**: React 19, TypeScript, Vite 7, React Router 7, PWA assets/service worker
- **Backend**: Node.js, Express, PostgreSQL, JWT, bcrypt, express-rate-limit
- **Database**: PostgreSQL
- **Testing**: Vitest, Playwright, GitHub Actions CI

The project uses npm workspaces with two packages: `server/` and `client/`.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and ADMIN_PIN

createdb toepify
npm run db:init
npm run dev
```

The server runs on `localhost:3000` by default. The Vite client proxies `/api` to the backend during development.

The server also applies `server/src/db/schema.sql` on startup, so `npm run db:init` is useful for explicit local setup but not the only way the schema is created.

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ADMIN_PIN` | PIN for bootstrap admin login when no activated users exist |
| `PORT` | Server port, defaults to `3000` |
| `ENV` | Optional environment label; `staging` shows the staging header label |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server and client dev servers together |
| `npm run build` | Build client and server for production |
| `npm start` | Run the production server, serving `client/dist/` |
| `npm test` | Run server and client unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:init` | Apply `server/src/db/schema.sql` with `psql` |
| `npm run lint -w client` | Run frontend linting |

## How it works

**Tournaments** are created by logged-in users. Each tournament has a secret UUID link at `/t/{tournamentId}`. Possession of that link grants access to view the tournament scoreboard.

Each tournament contains one or more **games**. A game contains **rounds**, and rounds contain each player's penalty points. Balances and pots are computed from persisted game data rather than stored as mutable totals.

**Game mechanics** follow Toepen scoring: players accumulate penalty points, reach **Pelt** at 14, and are out at 15 or more. A player eliminated in the current round may buy back in immediately, paying another stake and rejoining at the highest active player's score. When one active player remains, the game can be finished and the winner takes the pot.

**Sync is HTTP-only.** Initial page load calls `GET /api/tournaments/:tournamentId/latest`. Viewer mode polls that endpoint every 10 seconds. Writer mode sends score mutations through REST endpoints and uses the returned full game state immediately. There are no WebSocket or Socket.IO dependencies.

**PWA behavior** is handled in the client with a web app manifest, service worker, generated icons, and a screen wake-lock hook. The wake-lock control appears on tournament pages where browser support allows it.

## Project structure

```text
.
|-- server/
|   |-- src/
|   |   |-- index.ts              # Express app, API routes, static client serving
|   |   |-- db/
|   |   |   |-- connection.ts     # PostgreSQL pool
|   |   |   `-- schema.sql        # Database schema
|   |   |-- middleware/
|   |   |   |-- auth.ts           # JWT auth middleware
|   |   |   `-- rateLimiter.ts    # API rate limits
|   |   |-- routes/
|   |   |   |-- admin.ts          # User management
|   |   |   |-- auth.ts           # Login, activation, bootstrap
|   |   |   |-- tournaments.ts    # Tournament CRUD, close, settlement
|   |   |   `-- games.ts          # Latest state, history, rounds, buy-in, undo
|   |   `-- services/
|   |       |-- game.ts           # Game state, balances, settlement logic
|   |       `-- game.test.ts      # Server unit tests
|   `-- package.json
|-- client/
|   |-- public/
|   |   |-- manifest.webmanifest  # PWA manifest
|   |   |-- sw.js                 # Service worker
|   |   `-- icons/                # PWA icons
|   |-- src/
|   |   |-- App.tsx               # Router, header, mode/wake/readout actions
|   |   |-- api/                  # HTTP API clients
|   |   |-- components/           # Scoreboard, overlays, logo, stats
|   |   |-- contexts/             # Auth state
|   |   |-- hooks/                # Screen wake lock
|   |   |-- pages/                # Landing, tournament, history, admin, auth
|   |   `-- styles/               # Scoreboard styling
|   `-- package.json
|-- e2e/
|   |-- tests/                    # Playwright specs
|   |-- fixtures/                 # Auth fixture
|   |-- helpers/                  # API helpers
|   |-- global-setup.ts
|   `-- global-teardown.ts
|-- docs/                         # Product, architecture, ADRs, feature docs
|-- scripts/
|   `-- generate-icons.mjs        # PWA icon generation
|-- playwright.config.ts
`-- package.json
```

## Documentation

Design docs live in `docs/`:

- `vision.md` and `release-plan.md` - scope and phasing
- `user-stories.md` - backlog and acceptance criteria
- `user-flows.md` and `ux-guidelines.md` - UI and workflow guidance
- `data-model.md` and `realtime-design.md` - backend and sync specs
- `functional-requirements.md` and `non-functional-requirements.md` - requirements
- `tech-stack.md` - current stack notes
- `threat-model.md` - security review notes
- `adr/` - architectural decision records
- `features/logo-fanned-deck/` - branding/logo design and implementation notes
