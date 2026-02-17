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

export interface TournamentSummary {
  id: string;
  name: string;
  stakePerGame: number;
  createdAt: string;
  createdBy: string | null;
  players: { name: string }[];
}

export async function fetchTournaments(token: string): Promise<TournamentSummary[]> {
  const res = await fetch(`${BASE}/tournaments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to fetch tournaments");
  }
  const data = await res.json();
  return data.tournaments;
}

export async function deleteTournaments(token: string, ids: string[]): Promise<void> {
  const res = await fetch(`${BASE}/tournaments`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tournamentIds: ids }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete tournaments");
  }
}
