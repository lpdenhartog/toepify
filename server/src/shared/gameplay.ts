/** The same validated transition is used for offline play and server commands. */
export interface Player { player_id: string; player_name: string; is_active: boolean; buy_ins: number; total_score: number; can_buy_in: boolean }
export interface State {
  tournament: { id: string; name: string; stake_per_game: number; created_by: string | null; status: string; revision?: number };
  game: { id: string; status: string; winner_player_id: string | null; revision: number };
  players: Player[];
  roster?: { player_id: string; player_name: string }[];
  rounds: { round_number: number; round_type?: 'normal' | 'buy_in'; scores: { player_id: string; penalty_points: number }[] }[];
  pot: number;
  balances: { player_id: string; player_name: string; balance: number }[];
}
export type Action =
  | { type: 'round'; penalties: { playerId: string; points: number }[]; excludedPlayerIds: string[] }
  | { type: 'buy-in'; playerId: string }
  | { type: 'undo' }
  | { type: 'finish' }
  | { type: 'new-game'; newGameId: string };
export interface Command { requestId: string; gameId: string; action: Action }
function requireRule(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function contribution(state: State, playerId: string) {
  const p = state.players.find(p => p.player_id === playerId);
  return state.game.status === 'finished' && p ? -state.tournament.stake_per_game * (1 + p.buy_ins) + (state.game.winner_player_id === playerId ? state.pot : 0) : 0;
}
export function transition(before: State, command: Command): State {
  requireRule(before.tournament.status === 'active', 'Toernooi is afgesloten');
  requireRule(command.gameId === before.game.id, 'Het spel is gewijzigd');
  const state: State = JSON.parse(JSON.stringify(before));
  const a = command.action;
  requireRule(a && ['round', 'buy-in', 'undo', 'finish', 'new-game'].includes(a.type), 'Ongeldige actie');
  if (a.type === 'new-game') {
    requireRule(state.game.status === 'finished', 'Het huidige spel is nog niet afgelopen');
    requireRule(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.newGameId), 'Ongeldig spel-ID');
    state.game = { id: a.newGameId, status: 'active', winner_player_id: null, revision: 0 };
    state.players = (state.roster ?? state.balances).map(p => ({ player_id: p.player_id, player_name: p.player_name, is_active: true, buy_ins: 0, total_score: 0, can_buy_in: false }));
    state.rounds = [];
    state.pot = state.players.length * state.tournament.stake_per_game;
  } else {
    requireRule(['active', 'finished'].includes(state.game.status), 'Spel is niet actief');
    if (a.type === 'round') {
      requireRule(state.game.status === 'active', 'Spel is niet actief');
      requireRule(Array.isArray(a.excludedPlayerIds) && a.excludedPlayerIds.every(id => state.players.some(p => p.player_id === id)), 'Ongeldige spelers');
      requireRule(!a.excludedPlayerIds.length || !state.rounds.length, 'Spelers kiezen kan alleen voor de eerste ronde');
      state.players = state.players.filter(p => !a.excludedPlayerIds.includes(p.player_id));
      const active = state.players.filter(p => p.is_active);
      requireRule(active.length >= 2 && Array.isArray(a.penalties) && a.penalties.length === active.length && new Set(a.penalties.map(p => p.playerId)).size === active.length && a.penalties.every(p => active.some(ap => ap.player_id === p.playerId) && Number.isSafeInteger(p.points) && p.points >= 0 && p.points <= 2147483647), 'Ongeldige ronde');
      requireRule(a.penalties.filter(p => p.points === 0).length === 1, 'Er moet precies één winnaar zijn');
      state.players.forEach(p => {
        p.can_buy_in = false;
        if (p.is_active) {
          p.total_score += a.penalties.find(s => s.playerId === p.player_id)!.points;
          requireRule(p.total_score <= 2147483647, 'Score is te hoog');
          if (p.total_score >= 15) { p.is_active = false; p.can_buy_in = true; }
        }
      });
      state.rounds.push({ round_number: state.rounds.length + 1, round_type: 'normal', scores: a.penalties.map(p => ({ player_id: p.playerId, penalty_points: p.points })) });
      const remaining = state.players.filter(p => p.is_active);
      if (remaining.length <= 1) { state.game.status = 'finished'; state.game.winner_player_id = remaining[0]?.player_id ?? null; }
    } else if (a.type === 'buy-in') {
      const player = state.players.find(p => p.player_id === a.playerId);
      const active = state.players.filter(p => p.is_active);
      requireRule(state.game.status === 'active' && player && !player.is_active && player.can_buy_in && active.length >= 2, 'Inkopen is niet meer mogelijk');
      const score = Math.max(...active.map(p => p.total_score));
      const adjustment = score - player.total_score;
      Object.assign(player, { total_score: score, is_active: true, can_buy_in: false, buy_ins: player.buy_ins + 1 });
      state.rounds.push({ round_number: state.rounds.length + 1, round_type: 'buy_in', scores: state.players.map(p => ({ player_id: p.player_id, penalty_points: p.player_id === a.playerId ? adjustment : 0 })) });
    } else if (a.type === 'undo') {
      const removed = state.rounds.pop();
      requireRule(removed, 'Geen rondes om ongedaan te maken');
      if (removed.round_type === 'buy_in') {
        const id = removed.scores.find(s => s.penalty_points !== 0)?.player_id;
        const p = state.players.find(p => p.player_id === id);
        if (p) p.buy_ins = Math.max(0, p.buy_ins - 1);
      }
      state.players.forEach(p => {
        p.total_score = state.rounds.reduce((sum, r) => sum + (r.scores.find(s => s.player_id === p.player_id)?.penalty_points ?? 0), 0);
        p.is_active = p.total_score < 15;
        p.can_buy_in = false;
      });
      state.game.status = 'active'; state.game.winner_player_id = null;
    } else {
      const active = state.players.filter(p => p.is_active);
      requireRule(active.length === 1, 'Spel kan alleen beëindigd worden als er één speler over is');
      state.game.status = 'finished'; state.game.winner_player_id = active[0].player_id;
    }
    state.game.revision++;
    state.pot = state.tournament.stake_per_game * state.players.reduce((sum, p) => sum + 1 + p.buy_ins, 0);
    state.balances.forEach(b => { b.balance += contribution(state, b.player_id) - contribution(before, b.player_id); });
  }
  state.tournament.revision = (before.tournament.revision ?? 0) + 1;
  return state;
}
