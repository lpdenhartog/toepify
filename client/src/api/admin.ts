const BASE = "/api/admin";

export async function login(pin: string): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }
  const data = await res.json();
  return data.token;
}

export interface CreateTournamentInput {
  name: string;
  stakePerGame: number;
  playerNames: string[];
}

export interface Tournament {
  id: string;
  name: string;
  stakePerGame: number;
  players: { id: string; name: string }[];
  joinLink: string;
}

export async function createTournament(
  token: string,
  input: CreateTournamentInput
): Promise<Tournament> {
  const res = await fetch(`${BASE}/tournaments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create tournament");
  }
  return res.json();
}
