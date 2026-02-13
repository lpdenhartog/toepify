# Realtime design (Option 1: Node.js WebSockets)

## Goals
- Any score update is broadcast immediately to all connected clients viewing the same game.
- Clients can join using only the tournamentId.
- Server is the authority and persists updates to Postgres.

## Transport
- WebSockets (Socket.IO recommended for rooms and reconnection)

## Room model
- Room name: `tournament:{tournamentId}` or `game:{gameId}`
- Recommended: `game:{gameId}` so “most recent game” can change cleanly.

## Client lifecycle
1. HTTP fetch: `GET /api/tournaments/{tournamentId}/latest`
   - returns `gameId`, tournament name, current scoreboard state
2. WebSocket connect
3. Join room: `join_game` with `{ gameId, tournamentId }`
4. Server verifies that `gameId` belongs to `tournamentId` and allows join.

## Events (suggested)

### Client -> Server
- `join_game` { gameId }
- `set_player_name` { gameId, deviceId, name }
- `score_update` { gameId, playerId, delta, deviceId, clientTs }

### Server -> Client
- `game_state` { gameId, players: [...], scores: {...}, version, updatedAt }
- `score_updated` { gameId, playerId, value, version, updatedAt }
- `error` { code, message }

## Consistency
- Maintain a `version` integer on game state (or updated_at timestamps).
- On `score_update`, server:
  1) reads current score (or uses atomic SQL update)
  2) writes updated score
  3) increments version
  4) broadcasts authoritative update

## Reconnect behavior
- On reconnect, client requests `game_state` again (or server pushes it on join).

## Security notes (MVP)
- TournamentId is treated as a secret.
- Consider rate limiting score_update per client/IP.
