# ADR 004: User accounts and authentication

- Date: 2026-02-16
- Status: Accepted
- Supersedes: [ADR 003](./003-admin-pin-mvp.md)

## Context

The MVP used a single admin PIN for tournament creation (ADR 003). As the app grows, multiple people need to create and manage tournaments independently. A proper user account system is needed.

## Decision

Introduce a `users` table with username/password authentication:

- **Users** are registered accounts (separate from tournament players).
- **Admin** creates user accounts and shares activation links.
- **Activation** flow: admin creates user → user receives link → user sets password (min 10 chars, bcrypt cost 12).
- **Login** via username + password, issuing JWT tokens (24h expiry).
- **PIN bootstrap** preserved: when no activated users exist and `ADMIN_PIN` is set, PIN login is available. This allows first deploy without manual DB seeding.
- **Tournament creation** moves from admin-only to any authenticated user.
- **"My tournaments"** tracked via `user_tournaments` join table (created + visited).
- **Admin panel** becomes user management + all-tournaments view.

## Consequences

### Positive
- Multiple users can create and manage tournaments independently
- Activation flow is simple (no email required, just share link)
- PIN bootstrap ensures smooth first deploy
- Users and tournament players remain separate concepts (no coupling)

### Negative
- Activation links must be shared out-of-band (no email integration)
- Admin must manually create user accounts (no self-registration)
- Password reset requires admin intervention
