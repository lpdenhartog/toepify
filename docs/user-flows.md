# User flows

## Login flow
1. Click login icon in header
2. Enter username and password (or PIN if bootstrap mode)
3. On success, redirect to previous page or landing page
4. Token stored in localStorage for 24h session

## Account activation flow
1. Admin creates user in admin panel
2. Admin copies activation link and shares with new user
3. User opens activation link
4. User sets password (min 10 characters) and confirms
5. Account is activated, user can log in

## Logged-in user: create tournament
1. Open landing page (logged in)
2. Fill in "Nieuw Toernooi" form (name, stake, player names)
3. System creates tournament linked to user's account
4. Tournament appears in "Mijn Toernooien" list

## Admin flow: user management
1. Log in as admin
2. Open admin panel (link on landing page)
3. Create new user: enter username, receive activation link
4. View all users with status (active/pending)
5. Reset user password if needed (generates new activation link)

## Admin flow: manage tournaments
1. Admin panel shows all tournaments
2. Admin can delete any tournament

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
