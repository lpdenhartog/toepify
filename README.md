# Toepen Scorekeeper — Project Documentation Pack

This folder contains a lightweight, practical documentation set to define **requirements, UX, and architecture** for the Toepen scorekeeping app.

## Current MVP Decisions (as of 2026-02-13)

- **Anonymous users** (no logins yet)
- **Only an Admin can create tournaments**
  - Admin access via an **/admin** page protected by a **PIN** in MVP
  - Later: replace PIN with full user accounts/roles
- **Tournament access is by possession of a secret tournament ID**
  - Tournament ID is **unguessable** (UUIDv4 or longer random token)
- **Realtime updates required**
  - Score updates must appear **immediately on all connected clients**
- **Chosen implementation approach**
  - **Option 1**: Railway-hosted **Node.js backend + WebSockets + Postgres (Railway Postgres)**

## Folder structure

- `docs/vision.md` — product vision & scope
- `docs/personas-and-roles.md` — roles and assumptions
- `docs/user-stories.md` — user stories with acceptance criteria (MVP + later)
- `docs/user-flows.md` — core flows (admin + player)
- `docs/ux-guidelines.md` — UX principles for game-night usage
- `docs/functional-requirements.md` — functional requirements (structured)
- `docs/non-functional-requirements.md` — performance, reliability, security, etc.
- `docs/data-model.md` — minimal DB model and key fields
- `docs/realtime-design.md` — WebSocket rooms/events and consistency rules
- `docs/tech-stack.md` — stack overview (Railway + Node + Postgres + React PWA)
- `docs/release-plan.md` — MVP scope and phases
- `docs/adr/` — Architecture Decision Records

## How to use

1. Read `docs/vision.md` and `docs/release-plan.md` to confirm scope.
2. Use `docs/user-stories.md` as your backlog.
3. Build UI screens based on `docs/user-flows.md` and `docs/ux-guidelines.md`.
4. Implement backend + realtime according to `docs/realtime-design.md`.
5. Add ADRs whenever you make a new architectural decision.

