# Realtime design

## Goals
- Any score update is broadcast immediately to all connected clients viewing the same game.
- Clients can join using only the tournamentId.
- Server is the authority and persists updates to Postgres.

## Transport
- Socket.IO (provides rooms, reconnection, and fallback to long-polling).

## Room model
- Room name: `game:{gameId}`
- When a new game starts, clients are notified and join the new room.

## Architecture: Hybrid HTTP + WebSocket

All authoritative game mutations go through **HTTP POST** endpoints. After each mutation, the server fetches the full updated game state from the database and **broadcasts** it to the Socket.IO room. This is simpler and less error-prone than fine-grained per-event messages.

The one exception is **pending penalty inputs**: these are relayed via WebSocket only (not persisted to the database) so all connected players see each other's in-progress inputs in real time.

## Client lifecycle
1. HTTP fetch: `GET /api/tournaments/{tournamentId}/latest`
   - returns full game state: tournament info, game, players, rounds, scores, pot, balances
2. WebSocket connect (Socket.IO, same origin)
3. Emit `join_game { gameId }` to join the room
4. Listen for `game_state` broadcasts after any mutation
5. On `new_game_started`: re-fetch latest state and join new game room

## Events

### Client -> Server (WebSocket)
- `join_game` `{ gameId }` — join the Socket.IO room for this game
- `round_penalty_update` `{ gameId, playerId, penalty }` — relay pending penalty to other clients (not persisted)

### Server -> Client (WebSocket broadcast)
- `game_state` `{ ...fullGameState }` — broadcast after every HTTP mutation (finish round, buy-in, finish game, undo round, etc.)
- `round_penalty_updated` `{ gameId, playerId, penalty }` — relayed from another client's `round_penalty_update`
- `new_game_started` `{ gameId }` — new game created in the tournament

### HTTP mutations that trigger `game_state` broadcast
- `POST /api/games/:gameId/finish-round` — commit round penalties, handle eliminations
- `POST /api/games/:gameId/buy-in` — player buys back in
- `POST /api/games/:gameId/finish` — set winner, close game
- `POST /api/games/:gameId/undo-round` — delete last round, recalculate scores
- `POST /api/tournaments/:tournamentId/games` — create new game (broadcasts `new_game_started` to old game room)

## Reconnect behavior
- On reconnect, client re-fetches full game state via HTTP and re-joins the Socket.IO room.

## Security notes (MVP)
- TournamentId is treated as a secret.
- Consider rate limiting score_update per client/IP.
