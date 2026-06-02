# Tech stack

## Chosen approach (MVP)
**Railway-hosted Node.js backend + HTTP polling + Railway Postgres + React PWA frontend**

### Frontend
- React + TypeScript
- Vite for build tooling
- PWA support (manifest + service worker)
- Deployed as a web app (works on desktop and can be installed on mobile)

### Backend (Railway)
- Node.js (recommended: Fastify or Express)
- API endpoints:
  - Admin login (PIN)
  - Create tournament
  - Get latest game state
  - Update scores through HTTP mutations
  - Viewer refresh through 10-second polling

### Database
- Postgres (Railway managed Postgres)
- Schema as defined in `data-model.md`

### Hosting
- Railway for backend and Postgres
- Frontend can be hosted on Railway or a static host (Vercel/Netlify/Cloudflare Pages).
  - For simplicity, you can host both frontend + backend on Railway in MVP.

### Testing
- Vitest for server-side unit tests (game logic)
- Playwright for browser E2E tests (full user flows against built app + test database)
- GitHub Actions CI runs both unit and E2E tests (with PostgreSQL service container)

## Why this stack
- Avoids fragile mobile WebSocket connections while keeping viewer sync simple
- Keeps DB credentials server-side
- Simple security model for MVP (admin PIN + secret tournament ID)
- Easy to evolve into full user accounts later
