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

## Player flow: update score
1. Tap + / - buttons on scoreboard
2. Client sends update to server
3. Server validates, updates DB, broadcasts new state
4. All clients update UI immediately

## Player flow: reconnect
1. Player reloads page or loses connection
2. Client fetches latest state from server
3. Client reconnects to WebSocket room
