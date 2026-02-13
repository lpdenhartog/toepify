# Vision

## Purpose
A simple, fast scorekeeping app for the card game **Toepen** that works on both desktop and mobile. The app supports tournaments and live score updates during play.

## Target users
- Friends playing at home or in a café/bar
- Small informal tournaments

## Primary goals (MVP)
- Admin can create a tournament quickly.
- Players can join by opening a link containing a **secret tournament ID**.
- Players can view the current game and scores immediately.
- Score changes are synced **in realtime** to all participants.
- State is persisted so sessions can be resumed later.

## Non-goals (MVP)
- Full user accounts / profiles
- Public discovery of tournaments
- Complex tournament brackets
- Offline-first mode with conflict resolution
- Chat, comments, or media sharing

## Success criteria
- A group can start using the app in under 60 seconds.
- Score updates propagate to all clients with near-instant feedback.
- The UI is usable one-handed on a phone.
