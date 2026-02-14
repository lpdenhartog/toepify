export interface GamePlayer {
  player_id: string;
  player_name: string;
  is_active: boolean;
  buy_ins: number;
  total_score: number;
  can_buy_in: boolean;
}

export interface RoundScore {
  player_id: string;
  penalty_points: number;
}

export interface Round {
  round_number: number;
  scores: RoundScore[];
}

export interface PlayerBalance {
  player_id: string;
  player_name: string;
  balance: number;
}

export interface GameState {
  tournament: { id: string; name: string; stake_per_game: number };
  game: { id: string; status: string; winner_player_id: string | null };
  players: GamePlayer[];
  rounds: Round[];
  pot: number;
  balances: PlayerBalance[];
}

export async function fetchLatestGame(tournamentId: string): Promise<GameState> {
  const res = await fetch(`/api/tournaments/${tournamentId}/latest`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij laden");
  }
  return res.json();
}

export async function finishRound(
  gameId: string,
  penalties: Array<{ playerId: string; points: number }>
): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/finish-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ penalties }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij afsluiten ronde");
  }
  return res.json();
}

export async function buyIn(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/buy-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij inkopen");
  }
  return res.json();
}

export async function finishGame(gameId: string): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij beëindigen spel");
  }
  return res.json();
}

export async function startNewGame(tournamentId: string): Promise<GameState> {
  const res = await fetch(`/api/tournaments/${tournamentId}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij starten nieuw spel");
  }
  return res.json();
}
