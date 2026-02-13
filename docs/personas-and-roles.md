# Personas and roles

## Roles

### Admin (MVP)
- Accesses `/admin`
- Authenticates with a **PIN**
- Can create tournaments
- Can create/start a new game in a tournament (optional MVP toggle)
- Can reset/end a game (optional)

### Player (anonymous)
- Joins a tournament by secret tournament ID link
- Can view the latest game and current scores
- Can edit scores (MVP decision: allowed for all players who have the tournament link)

## Assumptions
- Tournament access is **capability-based**: if you have the secret ID, you can access it.
- In MVP, we trust participants who have the link.
- Abuse risk is mitigated by long random tournament IDs and basic rate limiting.
