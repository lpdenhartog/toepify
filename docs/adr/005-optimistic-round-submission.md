# ADR 005: Optimistic writer round submission

- Date: 2026-11-04
- Status: Accepted

## Context

Waiting for round submission makes the writer's scoreboard feel slow. A timeout can happen after the database commits, so blindly resubmitting can add a duplicate round. Multiple writers can also submit against outdated scores.

## Decision

- Predict scores, history, eliminations, the winner, pot and balances immediately in writer mode. Replace the prediction with the confirmed server state.
- Allow one unconfirmed round at a time. Disable game controls while saving; display a small save status and a retry action when confirmation fails. Do not queue subsequent rounds offline.
- Persist the single in-flight submission in session storage before sending it. Recover it after a reload using its original request ID.
- Add optional `requestId`, `expectedRevision`, and `autoFinish` fields to the finish-round API. Writers send all three; existing callers keep their prior behavior.
- Serialize round, buy-in, undo and finish actions on the game row. Increment its monotonic revision on successful mutations, including undo. Reject stale submissions with HTTP 409.
- Store request payload receipts transactionally in `round_submissions`, independently of deletable rounds. Repeated requests return current game state without replaying the action; reused IDs with different payloads are rejected.
- Finish winning writer rounds within the round transaction instead of making a second HTTP call. Return consistent game snapshots, with their revisions.
- Restore inputs after a definitive rejection. Refresh on conflicts. Retain unconfirmed requests on network errors, timeouts, server errors or rate limiting, with one immediate retry and subsequent manual retries using the same ID.

## Consequences

- Writer feedback no longer waits for network latency; dependent actions still wait for confirmation.
- New schema additions are applied by the existing startup schema initializer before the server listens.
- The local prediction needs tests alongside authoritative behavior. Server state remains authoritative.
- Recovery lasts for the browser tab's session; closing the tab clears session storage. This is not durable offline play.
- Viewer polling and its interval remain unchanged.
