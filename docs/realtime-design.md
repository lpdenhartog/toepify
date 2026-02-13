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
- `round_penalty_update` { gameId, playerId, penalty, deviceId } — update a player's pending round penalty (before finishing round)
- `finish_round` { gameId, deviceId } — commit all pending round penalties
- `buy_in` { gameId, playerId, deviceId } — player buys back into the game
- `finish_game` { gameId, deviceId } — end the game, compute winner and balances
- `start_new_game` { tournamentId, deviceId } — create a new game in the tournament

### Server -> Client
- `game_state` { gameId, players: [...], rounds: [...], gamePlayers: [...], pot, version }
- `round_penalty_updated` { gameId, playerId, penalty, version } — pending round penalty changed
- `round_finished` { gameId, roundNumber, scores: [...], eliminations: [...], version }
- `player_bought_in` { gameId, playerId, newPot, version }
- `game_finished` { gameId, winnerId, balanceUpdates: [...], version }
- `new_game_started` { gameId, tournamentId }
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
