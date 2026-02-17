const BASE = "/api/tournaments";

export interface Tournament {
  id: string;
  name: string;
  stakePerGame: number;
  players: { id: string; name: string }[];
  joinLink: string;
}

export interface MyTournament {
  id: string;
  name: string;
  stakePerGame: number;
  createdAt: string;
  createdBy: string | null;
  players: { name: string }[];
  isOwner: boolean;
}

export interface CreateTournamentInput {
  name: string;
  stakePerGame: number;
  playerNames: string[];
}

export async function createTournament(token: string, input: CreateTournamentInput): Promise<Tournament> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Toernooi aanmaken mislukt");
  }
  return res.json();
}

export async function fetchMyTournaments(token: string): Promise<MyTournament[]> {
  const res = await fetch(`${BASE}/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Toernooien ophalen mislukt");
  }
  const data = await res.json();
  return data.tournaments;
}

export async function visitTournament(token: string, tournamentId: string): Promise<void> {
  const res = await fetch(`${BASE}/visit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tournamentId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Bezoek opslaan mislukt");
  }
}

export async function deleteTournament(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Toernooi verwijderen mislukt");
  }
}

export interface Settlement {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  amount: number;
}

export interface SettlementData {
  name: string;
  balances: Array<{ player_id: string; player_name: string; balance: number }>;
  settlements: Settlement[];
}

export async function closeTournament(token: string, tournamentId: string): Promise<SettlementData> {
  const res = await fetch(`${BASE}/${tournamentId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Toernooi afsluiten mislukt");
  }
  return res.json();
}

export async function fetchSettlement(tournamentId: string): Promise<SettlementData> {
  const res = await fetch(`${BASE}/${tournamentId}/settlement`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Afrekening ophalen mislukt");
  }
  return res.json();
}
