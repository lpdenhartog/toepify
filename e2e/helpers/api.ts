import fs from "fs";

const BASE_URL = "http://localhost:3000";

/** Read the stored JWT token from the auth state file */
export function getToken(): string {
  const state = JSON.parse(fs.readFileSync("e2e/.auth-state.json", "utf-8"));
  const origin = state.origins?.find(
    (o: { origin: string }) => o.origin === BASE_URL
  );
  const entry = origin?.localStorage?.find(
    (e: { name: string }) => e.name === "toepify_auth_token"
  );
  if (!entry?.value) throw new Error("No auth token found in storage state");
  return entry.value;
}

/** Truncate all game data tables (keeps users) */
export async function resetDb(): Promise<void> {
  const res = await fetch(`${BASE_URL}/__test__/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`resetDb failed: ${res.status}`);
}

interface CreateTournamentResult {
  id: string;
  name: string;
  stakePerGame: number;
  players: Array<{ id: string; name: string }>;
  joinLink: string;
}

/** Create a tournament via API, returns tournament data */
export async function createTournament(
  name: string,
  playerNames: string[],
  stakePerGame = 2.5
): Promise<CreateTournamentResult> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/tournaments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, stakePerGame, playerNames }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`createTournament failed: ${body.error || res.status}`);
  }
  return res.json();
}

/** Get the latest game state for a tournament */
export async function getLatestGame(tournamentId: string) {
  const res = await fetch(
    `${BASE_URL}/api/tournaments/${tournamentId}/latest`
  );
  if (!res.ok) throw new Error(`getLatestGame failed: ${res.status}`);
  return res.json();
}

/** Finish a round via API */
export async function finishRound(
  gameId: string,
  penalties: Array<{ playerId: string; points: number }>,
  excludedPlayerIds?: string[]
): Promise<unknown> {
  const body: Record<string, unknown> = { penalties };
  if (excludedPlayerIds?.length) body.excludedPlayerIds = excludedPlayerIds;
  const res = await fetch(`${BASE_URL}/api/games/${gameId}/finish-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`finishRound failed: ${res.status}`);
  return res.json();
}

/** Buy in a player via API */
export async function apiBuyIn(
  gameId: string,
  playerId: string
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/games/${gameId}/buy-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error(`buyIn failed: ${res.status}`);
  return res.json();
}

/** Finish a game via API */
export async function finishGame(
  gameId: string,
  excludedPlayerIds?: string[]
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (excludedPlayerIds?.length) body.excludedPlayerIds = excludedPlayerIds;
  const res = await fetch(`${BASE_URL}/api/games/${gameId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`finishGame failed: ${res.status}`);
  return res.json();
}

/** Start a new game via API */
export async function startNewGame(tournamentId: string): Promise<unknown> {
  const res = await fetch(
    `${BASE_URL}/api/tournaments/${tournamentId}/games`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) throw new Error(`startNewGame failed: ${res.status}`);
  return res.json();
}

/** Undo the last round via API */
export async function undoRound(gameId: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/games/${gameId}/undo-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`undoRound failed: ${res.status}`);
  return res.json();
}

/** Close a tournament via API */
export async function closeTournament(tournamentId: string): Promise<unknown> {
  const token = getToken();
  const res = await fetch(
    `${BASE_URL}/api/tournaments/${tournamentId}/close`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error(`closeTournament failed: ${res.status}`);
  return res.json();
}
