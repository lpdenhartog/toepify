# Sync design

## Goals
- Game pages open in read-only viewer mode by default.
- Viewers see persisted score changes shortly after they are saved.
- Writers can enter scores quickly and see their own saved changes immediately.
- The app avoids mobile WebSocket disconnect issues by using plain HTTP.

## Transport
- HTTP only.
- Authoritative game mutations use existing `POST` endpoints.
- Viewer refresh uses polling against `GET /api/tournaments/{tournamentId}/latest`.

## Client lifecycle
1. Load the latest game with `GET /api/tournaments/{tournamentId}/latest`.
2. Default the tournament page to `viewer` mode.
3. In viewer mode, poll the latest game every 10 seconds.
4. In writer mode, stop viewer polling and update local state from mutation responses.
5. When returning to viewer mode, resume 10-second polling.

## Modes

### Viewer mode
- Shows the same scoreboard, pot, balances, pelt/out indicators, settlement, QR sharing, and celebration stats.
- Hides all mutation controls: penalty buttons, finish/cancel/undo round, buy-in, sit-out selection, new game, and close tournament.
- Does not show in-progress penalty inputs from other clients because those values are not persisted.

### Writer mode
- Shows the existing score entry controls.
- Sends mutations through HTTP.
- Uses the returned game state from each mutation as the immediate UI update.
- Multiple writers are allowed; no locking or conflict prevention is required.

## Mutation endpoints
- `POST /api/games/:gameId/finish-round`
- `POST /api/games/:gameId/buy-in`
- `POST /api/games/:gameId/finish`
- `POST /api/games/:gameId/undo-round`
- `POST /api/tournaments/:tournamentId/games`

## Reconnect behavior
- A browser reload or reconnect performs a fresh HTTP load of the latest game.
- Viewer polling also detects newly started games and closed tournaments within the polling interval.
