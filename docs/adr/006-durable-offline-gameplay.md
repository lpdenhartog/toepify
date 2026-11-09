# ADR 006: Durable offline gameplay and explicit synchronization

- Date: 2026-11-09
- Status: Accepted
- Supersedes ADR 005's single pending round and session-only persistence restrictions.

## Decision

An existing tournament can enter explicit offline mode after a gameplay request cannot be confirmed. The user chooses retry or offline play. IndexedDB stores a versioned baseline, current state, input drafts, and ordered commands before displaying accepted changes. Full gameplay runs through the same pure transition function on client and server. New games use client-generated UUIDs and the full tournament roster.

Offline mode is a browser-wide restriction: normal API requests are blocked, viewer polling stops, and tournament creation, closure, deletion, and administration are unavailable. It does not end when connectivity returns. A persistent Dutch status bar exposes manual synchronization and a JSON recovery download. Other devices continue to show online state. Web Locks enforce one writer tab per tournament; BroadcastChannel updates local viewers. Browsers without Web Locks remain read-only.

Tournament revisions cover every game mutation and closure, including legacy endpoints. All mutation paths acquire tournament locks before game locks. New commands have durable payload receipts with before/after revisions. The command API accepts one command; sync accepts a sequence and its baseline revision. A contiguous already-committed prefix is accepted only when receipts and revisions match exactly. Any intervening external mutation causes HTTP 409. The remaining sequence commits in a single transaction or rolls back entirely. Repeated uploads, including uploads extended after a lost response, never duplicate commands.

A conflict preserves offline work, permits continued local play, and exposes a recovery file without credentials. Reconciliation and any deliberate database repair belong to an administrator outside this feature; the client never offers an overwrite or force-sync path.

The production service worker precaches the build's hashed assets and navigation shell, never API responses. Updates wait for the previous worker's clients to close. Existing version caches are retained to avoid deleting assets used by a running offline game. Browser storage may still be removed by the user or browser; this feature is local durability, not a remote backup.

## Interfaces

- `GameState.tournament.revision`: monotonic tournament revision.
- `GameState.roster`: all tournament players in stable order, including players sitting out the current game.
- `POST /api/tournaments/:id/commands`: `{ baseRevision, commands: [command] }`.
- `POST /api/tournaments/:id/sync`: `{ baseRevision, commands }`.
- Command: `{ requestId, gameId, action }`; actions: `round`, `buy-in`, `undo`, `finish`, `new-game`.
- Success: `{ state, acknowledged: requestId[] }`. HTTP 400 rejects invalid actions; HTTP 409 rejects changed, closed, or deleted tournaments. No partial batch writes.
- Game capability URLs retain their existing access model. Admin actions still require authentication.

Schema additions are applied before the server starts listening. Existing mutation endpoints and round-submission receipts remain supported. The new client uses command receipts for all gameplay.
