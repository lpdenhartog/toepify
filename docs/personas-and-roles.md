# Personas and roles

## Roles

### Admin
- Accesses `/admin` (redirects to login if not authenticated)
- Authenticates with username + password (or PIN during bootstrap)
- Can create and manage user accounts
- Can view and delete all tournaments
- Can create tournaments

### Registered user
- Logs in with username + password
- Can create tournaments from the landing page
- Can view their own tournaments (created or visited)
- Can delete their own tournaments

### Player (anonymous)
- Joins a tournament by secret tournament ID link
- Can view the latest game and current scores
- Can edit scores (allowed for all players who have the tournament link)

## Assumptions
- Tournament access is **capability-based**: if you have the secret ID, you can access it.
- Users and tournament players are separate concepts. Users are accounts; players are display names within a tournament.
- We trust participants who have the link.
- Abuse risk is mitigated by long random tournament IDs and basic rate limiting.
