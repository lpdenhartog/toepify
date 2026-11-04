import type { RoundSubmission } from "../utils/optimisticRound";

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
  round_type?: "normal" | "buy_in";
  scores: RoundScore[];
}

export interface PlayerBalance {
  player_id: string;
  player_name: string;
  balance: number;
}

export interface GameState {
  tournament: { id: string; name: string; stake_per_game: number; created_by: string | null; status: string };
  game: { id: string; status: string; winner_player_id: string | null; revision: number };
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

export async function fetchTournamentHistory(tournamentId: string): Promise<GameState[]> {
  const res = await fetch(`/api/tournaments/${tournamentId}/history`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij laden geschiedenis");
  }
  const data = await res.json() as { games: GameState[] };
  return data.games;
}

export class RoundSaveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function finishRound(gameId: string, submission: RoundSubmission): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/finish-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new RoundSaveError(body.error || "Fout bij afsluiten ronde", res.status);
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

export async function finishGame(gameId: string, excludedPlayerIds?: string[]): Promise<GameState> {
  const body: Record<string, unknown> = {};
  if (excludedPlayerIds && excludedPlayerIds.length > 0) {
    body.excludedPlayerIds = excludedPlayerIds;
  }
  const res = await fetch(`/api/games/${gameId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij beëindigen spel");
  }
  return res.json();
}

export async function undoRound(gameId: string): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/undo-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Fout bij ongedaan maken ronde");
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
