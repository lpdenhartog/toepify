# UX guidelines

## Design principles
- **Fast and obvious:** minimal taps to update a score.
- **Large touch targets:** designed for thumbs and game-night conditions.
- **One-screen gameplay:** scoreboard should be usable without navigating away.
- **Optimistic UI with server authority:** reflect taps immediately, then reconcile to server state if needed.
- **Clear game state:** Pelt warnings and elimination status must be immediately visible.
- **UI language:** All user interface elements must be in Dutch language.


## Key screens
- Tournament join / loading screen (landing page)
- Scoreboard (main screen) — columns per player, round history rows, +/− buttons, finish round button, game pot, tournament balances
- Login page (username/password, optional PIN toggle for bootstrap)
- Account activation page (set password for new account)
- Landing page (logged in) — "Nieuw Toernooi" form, "Mijn Toernooien" list, admin panel link
- Admin panel — user management (create users, reset passwords), all tournaments list

## Scoreboard layout
- Each player is a **column**: name at top, current game stake, round-by-round score rows, +/− buttons at bottom for current round input
- **Pelt icon** (warning) on players at 14 points
- **Out indicator** on players at ≥ 15 points, with **buy-in icon** when eligible
- **"Finish Round"** button below the round input area
- **Game pot** displayed prominently (updates on buy-ins)
- **Tournament balance** per player visible (greyed out / secondary during active game, updates after game finishes)
- **"Start New Game"** button appears when a game is finished
- **"Landscape mode"** Scoreboard is intented to be used in landscape mode, mainly because it is intented to be mirrored to a television.

## Accessibility + readability
- High contrast by default
- Support landscape and portrait, but scoreboard is intented in landscape
- Avoid tiny text and dense layouts
- toepify should always be stylised in lowercase: toepify