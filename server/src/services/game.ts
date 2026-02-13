import pg from "pg";

export interface GamePlayer {
  player_id: string;
  player_name: string;
  is_active: boolean;
  buy_ins: number;
  total_score: number;
}

export interface RoundScore {
  player_id: string;
  penalty_points: number;
}

export interface Round {
  round_number: number;
  scores: RoundScore[];
}

export interface GameState {
  tournament: { id: string; name: string; stake_per_game: number };
  game: { id: string; status: string; winner_player_id: string | null };
  players: GamePlayer[];
  rounds: Round[];
  pot: number;
  balances: Array<{ player_id: string; player_name: string; balance: number }>;
}

export function computePot(
  stakePerGame: number,
  playerCount: number,
  totalBuyIns: number
): number {
  return stakePerGame * (playerCount + totalBuyIns);
}

export async function getFullGameState(
  pool: pg.Pool,
  gameId: string
): Promise<GameState> {
  // Get game + tournament info
  const gameRes = await pool.query(
    `SELECT g.id, g.status, g.winner_player_id, g.tournament_id,
            t.name as tournament_name, t.stake_per_game
     FROM games g
     JOIN tournaments t ON t.id = g.tournament_id
     WHERE g.id = $1`,
    [gameId]
  );
  if (gameRes.rows.length === 0) throw new Error("Game not found");
  const game = gameRes.rows[0];

  // Get game players
  const playersRes = await pool.query(
    `SELECT gp.player_id, p.name as player_name, gp.is_active, gp.buy_ins, gp.total_score
     FROM game_players gp
     JOIN players p ON p.id = gp.player_id
     WHERE gp.game_id = $1
     ORDER BY p.created_at`,
    [gameId]
  );
  const players: GamePlayer[] = playersRes.rows;

  // Get rounds with scores
  const roundsRes = await pool.query(
    `SELECT r.round_number, rs.player_id, rs.penalty_points
     FROM rounds r
     JOIN round_scores rs ON rs.round_id = r.id
     WHERE r.game_id = $1
     ORDER BY r.round_number, rs.player_id`,
    [gameId]
  );

  const roundsMap = new Map<number, RoundScore[]>();
  for (const row of roundsRes.rows) {
    if (!roundsMap.has(row.round_number)) {
      roundsMap.set(row.round_number, []);
    }
    roundsMap.get(row.round_number)!.push({
      player_id: row.player_id,
      penalty_points: row.penalty_points,
    });
  }
  const rounds: Round[] = Array.from(roundsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([round_number, scores]) => ({ round_number, scores }));

  // Compute pot
  const totalBuyIns = players.reduce((sum, p) => sum + p.buy_ins, 0);
  const pot = computePot(
    Number(game.stake_per_game),
    players.length,
    totalBuyIns
  );

  // Compute tournament balances
  const balances = await computeTournamentBalances(
    pool,
    game.tournament_id
  );

  return {
    tournament: {
      id: game.tournament_id,
      name: game.tournament_name,
      stake_per_game: Number(game.stake_per_game),
    },
    game: {
      id: game.id,
      status: game.status,
      winner_player_id: game.winner_player_id,
    },
    players,
    rounds,
    pot,
    balances,
  };
}

export async function computeTournamentBalances(
  pool: pg.Pool,
  tournamentId: string
): Promise<Array<{ player_id: string; player_name: string; balance: number }>> {
  // Get all players in tournament
  const playersRes = await pool.query(
    `SELECT id, name FROM players WHERE tournament_id = $1 ORDER BY created_at`,
    [tournamentId]
  );

  const balanceMap = new Map<string, number>();
  for (const p of playersRes.rows) {
    balanceMap.set(p.id, 0);
  }

  // Get all finished games with their game_players
  const gamesRes = await pool.query(
    `SELECT g.id as game_id, g.winner_player_id, t.stake_per_game,
            gp.player_id, gp.buy_ins
     FROM games g
     JOIN tournaments t ON t.id = g.tournament_id
     JOIN game_players gp ON gp.game_id = g.id
     WHERE g.tournament_id = $1 AND g.status = 'finished'`,
    [tournamentId]
  );

  // Group by game
  const gameMap = new Map<
    string,
    { winner_player_id: string; stake_per_game: number; players: Array<{ player_id: string; buy_ins: number }> }
  >();
  for (const row of gamesRes.rows) {
    if (!gameMap.has(row.game_id)) {
      gameMap.set(row.game_id, {
        winner_player_id: row.winner_player_id,
        stake_per_game: Number(row.stake_per_game),
        players: [],
      });
    }
    gameMap.get(row.game_id)!.players.push({
      player_id: row.player_id,
      buy_ins: row.buy_ins,
    });
  }

  // Calculate balances per finished game
  for (const game of gameMap.values()) {
    const totalBuyIns = game.players.reduce((s, p) => s + p.buy_ins, 0);
    const pot = computePot(game.stake_per_game, game.players.length, totalBuyIns);

    for (const p of game.players) {
      const cost = game.stake_per_game * (1 + p.buy_ins);
      if (p.player_id === game.winner_player_id) {
        balanceMap.set(p.player_id, (balanceMap.get(p.player_id) || 0) + (pot - cost));
      } else {
        balanceMap.set(p.player_id, (balanceMap.get(p.player_id) || 0) - cost);
      }
    }
  }

  return playersRes.rows.map((p: { id: string; name: string }) => ({
    player_id: p.id,
    player_name: p.name,
    balance: balanceMap.get(p.id) || 0,
  }));
}
