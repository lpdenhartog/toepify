# Functional requirements

## Tournament management
- Admin can create tournament (name required).
- System generates secret `tournamentId`.
- Tournament is not discoverable without `tournamentId`.
- Tournament has one “most recent game”.

## Game management
- A tournament contains one or more games.
- The “most recent game” is the one with the latest creation timestamp (or active flag).
- Players joining a tournament always land in the most recent game.

## Player participation
- Players are anonymous.
- A player can set a local display name (per tournament on a device).
- Scoreboard displays player names and scores.

## Score updates
- Any connected player can edit scores (MVP).
- Updates are persisted immediately.
- All clients receive updates in realtime.

## Admin authentication (MVP)
- `/admin` requires a PIN.
- Admin session expires.

## Sharing
- Join link includes the secret tournamentId.
- Join link can be copied and shared via messaging/email.

