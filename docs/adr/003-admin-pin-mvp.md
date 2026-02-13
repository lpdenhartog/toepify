# ADR 003: Admin authentication via PIN for MVP

- Date: 2026-02-13
- Status: Accepted

## Context
Only admins should create tournaments. MVP must remain lightweight and avoid a full auth system.

## Decision
Protect `/admin` with a server-verified PIN. On successful PIN entry, issue a time-limited admin session token.

## Consequences
### Positive
- Fast to implement
- Sufficient for MVP

### Negative
- PIN is weaker than full accounts and should be replaced later
- Must implement brute-force protection (rate limit + lockouts)
