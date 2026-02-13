# ADR 002: Capability-based access via secret tournamentId

- Date: 2026-02-13
- Status: Accepted

## Context
MVP does not implement player accounts. Users must be able to join quickly. The app should not allow discovery of tournaments without authorization.

## Decision
Use a long, unguessable secret `tournamentId` in the join URL. Possession of the link grants access to the tournament and its latest game.

## Consequences
### Positive
- Extremely simple onboarding for players
- No account friction in MVP

### Negative
- If a link leaks, anyone with it can access/modify (MVP trust model)
- Requires strong randomness and rate limiting to mitigate brute force
