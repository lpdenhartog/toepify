import type { GameState } from "../api/game";

export interface RoundSubmission {
  requestId: string;
  expectedRevision: number;
  penalties: Array<{ playerId: string; points: number }>;
  excludedPlayerIds: string[];
  autoFinish: true;
}

/** Predict the writer's round result; the server always confirms the final state. */
export function predictRound(state: GameState, submission: RoundSubmission): GameState {
  const players = state.players
    .filter((p) => !submission.excludedPlayerIds.includes(p.player_id))
    .map((p) => {
      const points = submission.penalties.find((s) => s.playerId === p.player_id)?.points ?? 0;
      const total = p.total_score + (p.is_active ? points : 0);
      const eliminated = p.is_active && total >= 15;
      return { ...p, total_score: total, is_active: p.is_active && !eliminated, can_buy_in: eliminated };
    });
  const active = players.filter((p) => p.is_active);
  const finished = active.length <= 1;
  const winner = active.length === 1 ? active[0].player_id : null;
  const stake = state.tournament.stake_per_game;
  const pot = stake * players.reduce((sum, p) => sum + 1 + p.buy_ins, 0);
  return {
    ...state,
    game: { ...state.game, status: finished ? "finished" : "active", winner_player_id: winner },
    players,
    pot,
    rounds: [...state.rounds, {
      round_number: (state.rounds.at(-1)?.round_number ?? 0) + 1,
      round_type: "normal",
      scores: submission.penalties.map((p) => ({ player_id: p.playerId, penalty_points: p.points })),
    }],
    balances: state.balances.map((balance) => {
      const player = players.find((p) => p.player_id === balance.player_id);
      return finished && player ? {
        ...balance,
        balance: balance.balance - stake * (1 + player.buy_ins) + (player.player_id === winner ? pot : 0),
      } : balance;
    }),
  };
}
