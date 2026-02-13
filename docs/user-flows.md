# User flows

## Admin flow: create tournament
1. Open `/admin`
2. Enter PIN
3. Click "Create Tournament"
4. Enter tournament name
5. Set stake per game (default €2.50)
6. Enter player names (min 2, max 6)
7. System creates tournament and shows join link
8. Admin shares join link with players

## Admin flow: start a new game (if enabled)
1. On admin tournament screen, click “Start New Game”
2. System creates new game as the most recent game
3. Players opening the join link see this new game

## Player flow: join tournament
1. Open join link `/t/{tournamentId}`
2. App loads latest game and scoreboard (player names, balances, current game stake)
3. App connects to WebSocket and subscribes to updates

## Player flow: play a round
1. During the round, use +/− buttons per player column to enter penalty points
2. Tap "Finish Round" button/icon
3. Server adds round penalties to cumulative scores, persists, broadcasts
4. New cumulative scores appear on a new line below previous round
5. If any player reaches ≥ 15 points:
   - Player is marked as **out**
   - Buy-in icon appears (only for this round)
6. If a player taps buy-in:
   - Player is re-activated at 14 points (on Pelt)
   - Game pot increases by one stake
   - Stake display updates for all clients

## Player flow: finish game
1. When only one active player remains, game can be finished
2. Tap "Finish Game" (or auto-triggered)
3. Winner takes the pot; tournament balances update
4. "Start New Game" button appears

## Player flow: reconnect
1. Player reloads page or loses connection
2. Client fetches latest state from server (rounds, scores, active/out status, pot)
3. Client reconnects to WebSocket room
