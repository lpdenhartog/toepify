# Toepify

Realtime scorekeeping app for the Dutch card game **Toepen**. Tracks scores, eliminations, buy-ins, and balances across tournaments and games with live updates for all connected players.

## Tech stack

- **Frontend**: React 19 + TypeScript, Vite, React Router
- **Backend**: Node.js + Express, Socket.IO
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt, with PIN bootstrap for first deploy
- **Testing**: Vitest (unit), Playwright (E2E), GitHub Actions CI

The project uses npm workspaces with two packages: `server/` and `client/`.

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and ADMIN_PIN

# Create the database
createdb toepify

# Initialize the schema (auto-applied on server start, or manually)
npm run db:init

# Start dev servers (backend + frontend with hot reload)
npm run dev
```

The client dev server proxies `/api` and `/socket.io` to the backend at `localhost:3000`.

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ADMIN_PIN` | PIN for bootstrap admin login (used when no activated users exist) |
| `PORT` | Server port (default 3000) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both server and client in dev mode |
| `npm run build` | Build client and server for production |
| `npm start` | Run the production server (serves client from `client/dist/`) |
| `npm test` | Run server-side unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright E2E tests (requires `toepify_test` DB) |
| `npm run db:init` | Apply database schema via psql |

## How it works

**Tournaments** are created by logged-in users. Each tournament has a secret UUID link (`/t/{tournamentId}`) that anyone can open to view and interact with the scoreboard. Tournaments contain one or more **games**, and games consist of **rounds** where players receive penalty points.

**Game mechanics**: players accumulate penalty points across rounds. At 14 points = "Pelt" (warning). At 15+ = eliminated. Eliminated players can buy back in (one extra stake) in the round they're knocked out, rejoining at the highest active player's score. Last player standing wins the pot.

**Realtime updates** use a hybrid HTTP + WebSocket approach. All game mutations (finish round, buy-in, undo, etc.) go through REST endpoints. After each mutation, the server broadcasts the full updated game state via Socket.IO to all clients in the game room. Pending penalty inputs are relayed over WebSocket for live preview without hitting the database.

## Project structure

```
├── server/
│   └── src/
│       ├── index.ts           # Express + Socket.IO entry point
│       ├── socket.ts          # WebSocket event handlers
│       ├── db/
│       │   ├── connection.ts  # PostgreSQL pool
│       │   └── schema.sql     # Database schema
│       ├── middleware/
│       │   └── auth.ts        # JWT auth middleware
│       ├── routes/
│       │   ├── admin.ts       # User management, tournament admin
│       │   ├── auth.ts        # Login, activation, bootstrap
│       │   ├── tournaments.ts # CRUD, close, settlement
│       │   └── games.ts       # Round flow, buy-in, undo
│       └── services/
│           ├── game.ts        # Game logic + DB queries
│           └── game.test.ts   # Unit tests
├── e2e/                           # Playwright E2E tests
│   ├── tests/                 # Test spec files
│   ├── fixtures/              # Auth fixture
│   ├── helpers/               # API helpers for test setup
│   ├── global-setup.ts        # Create test user + auth state
│   └── global-teardown.ts     # Cleanup test user
├── playwright.config.ts       # Playwright configuration
├── client/
│   └── src/
│       ├── App.tsx            # Router + auth provider
│       ├── contexts/
│       │   └── AuthContext.tsx # JWT auth state
│       ├── api/               # HTTP + Socket.IO client helpers
│       ├── pages/             # Landing, Tournament, Admin, Login, Activate
│       └── components/        # Scoreboard, GameEndCelebration, etc.
└── docs/                      # Design documentation and ADRs
```

## Documentation

Design docs live in `docs/`:

- `vision.md` + `release-plan.md` — scope and phasing
- `user-stories.md` — backlog with acceptance criteria
- `user-flows.md` + `ux-guidelines.md` — UI design guidance
- `data-model.md` + `realtime-design.md` — backend specs
- `functional-requirements.md` — feature requirements
- `adr/` — architectural decision records
