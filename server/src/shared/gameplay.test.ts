import { describe, it, expect } from 'vitest';
import { transition, type State, type Action } from './gameplay.js';
const ids = ['a', 'b', 'c'];
function initial(): State {
  return {
    tournament: { id: 't', name: 'Offline', status: 'active', stake_per_game: 2.5, created_by: null, revision: 1 },
    game: { id: 'game', status: 'active', winner_player_id: null, revision: 0 },
    roster: ids.map(id => ({ player_id: id, player_name: id })),
    players: ids.map(id => ({ player_id: id, player_name: id, total_score: 0, buy_ins: 0, is_active: true, can_buy_in: false })),
    rounds: [], pot: 7.5, balances: ids.map(id => ({ player_id: id, player_name: id, balance: 0 })),
  };
}
const apply = (s: State, action: Action) => transition(s, { requestId: 'request', gameId: s.game.id, action });
const round = (points: number[], excludedPlayerIds: string[] = []): Action => ({ type: 'round', penalties: points.map((points, i) => ({ playerId: ids[i], points })), excludedPlayerIds });
describe('shared authoritative and offline gameplay', () => {
  it('does not mutate its baseline and clears expired buy-in eligibility', () => {
    const s = initial(); const next = apply(s, round([15, 1, 0]));
    expect(s.rounds).toHaveLength(0);
    expect(next.players[0].can_buy_in).toBe(true);
    const expired = apply(next, { type: 'round', penalties: [{ playerId: 'b', points: 1 }, { playerId: 'c', points: 0 }], excludedPlayerIds: [] });
    expect(expired.players[0].can_buy_in).toBe(false);
  });
  it('buys in at the highest active score and reverses a buy-in', () => {
    const knockedOut = apply(initial(), round([15, 4, 0]));
    const boughtIn = apply(knockedOut, { type: 'buy-in', playerId: 'a' });
    expect(boughtIn.players[0]).toMatchObject({ total_score: 4, buy_ins: 1, is_active: true });
    expect(boughtIn.rounds[1].scores[0].penalty_points).toBe(-11);
    expect(boughtIn.pot).toBe(10);
    const undone = apply(boughtIn, { type: 'undo' });
    expect(undone.players[0]).toMatchObject({ total_score: 15, buy_ins: 0, is_active: false, can_buy_in: false });
    expect(undone.pot).toBe(7.5);
  });
  it('undoes a win and removes only that game contribution from balances', () => {
    const s = initial(); s.balances[0].balance = 12;
    const won = apply(s, round([0, 15, 15]));
    expect(won.balances.map(b => b.balance)).toEqual([17, -2.5, -2.5]);
    const undone = apply(won, { type: 'undo' });
    expect(undone.game.status).toBe('active');
    expect(undone.balances.map(b => b.balance)).toEqual([12, 0, 0]);
    expect(undone.game.revision).toBe(2);
  });
  it('restores the complete roster in the next game and carries balances', () => {
    const won = apply(initial(), { type: 'round', penalties: [{ playerId: 'a', points: 0 }, { playerId: 'b', points: 15 }], excludedPlayerIds: ['c'] });
    expect(won.pot).toBe(5);
    const next = apply(won, { type: 'new-game', newGameId: 'de305d54-75b4-431b-adb2-eb6b9e546014' });
    expect(next.players).toHaveLength(3); expect(next.pot).toBe(7.5);
    expect(next.balances.map(b => b.balance)).toEqual([2.5, -2.5, 0]);
    const second = apply(next, round([15, 0, 15]));
    expect(second.balances.map(b => b.balance)).toEqual([0, 2.5, -2.5]);
  });
  it('rejects invalid players, scores, stale game IDs, and closed tournaments', () => {
    expect(() => apply(initial(), round([0, 0, 1]))).toThrow();
    expect(() => apply(initial(), round([0, -1, 1]))).toThrow();
    expect(() => apply(initial(), { type: 'new-game', newGameId: 'bad' })).toThrow();
    expect(() => apply(initial(), { type: 'buy-in', playerId: 'a' })).toThrow();
    const s = initial(); s.tournament.status = 'closed';
    expect(() => apply(s, round([0, 1, 1]))).toThrow();
    expect(() => transition(initial(), { requestId: 'x', gameId: 'stale', action: round([0, 1, 1]) })).toThrow();
  });
});
