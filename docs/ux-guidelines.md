# UX guidelines

## Design principles
- **Fast and obvious:** minimal taps to update a score.
- **Large touch targets:** designed for thumbs and game-night conditions.
- **One-screen gameplay:** scoreboard should be usable without navigating away.
- **Optimistic UI with server authority:** reflect taps immediately, then reconcile to server state if needed.
- **Clear game state:** Pelt warnings and elimination status must be immediately visible.

## Key screens (MVP)
- Tournament join / loading screen
- Scoreboard (main screen) — columns per player, round history rows, +/− buttons, finish round button, game pot, tournament balances
- Admin login (PIN)
- Admin tournament creation (name, stake, player names)

## Scoreboard layout
- Each player is a **column**: name at top, current game stake, round-by-round score rows, +/− buttons at bottom for current round input
- **Pelt icon** (warning) on players at 14 points
- **Out indicator** on players at ≥ 15 points, with **buy-in icon** when eligible
- **"Finish Round"** button below the round input area
- **Game pot** displayed prominently (updates on buy-ins)
- **Tournament balance** per player visible (greyed out / secondary during active game, updates after game finishes)
- **"Start New Game"** button appears when a game is finished

## Accessibility + readability
- High contrast by default
- Support landscape and portrait
- Avoid tiny text and dense layouts
