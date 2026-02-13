# Tech stack

## Chosen approach (MVP)
**Railway-hosted Node.js backend + WebSockets + Railway Postgres + React PWA frontend**

### Frontend
- React + TypeScript
- Vite for build tooling
- PWA support (manifest + service worker)
- Deployed as a web app (works on desktop and can be installed on mobile)

### Backend (Railway)
- Node.js (recommended: Fastify or Express)
- WebSockets:
  - Socket.IO (recommended for rooms and reconnection handling)
- API endpoints:
  - Admin login (PIN)
  - Create tournament
  - Get latest game state
  - Update scores (can be via WebSocket only, or HTTP + broadcast)

### Database
- Postgres (Railway managed Postgres)
- Schema as defined in `data-model.md`

### Hosting
- Railway for backend and Postgres
- Frontend can be hosted on Railway or a static host (Vercel/Netlify/Cloudflare Pages).
  - For simplicity, you can host both frontend + backend on Railway in MVP.

## Why this stack
- Supports strict realtime requirements with low latency
- Keeps DB credentials server-side
- Simple security model for MVP (admin PIN + secret tournament ID)
- Easy to evolve into full user accounts later
