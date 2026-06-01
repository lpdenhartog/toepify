export interface RecentTournament {
  id: string;
  name: string;
  players: string[];
  lastVisited: number;
}

const STORAGE_KEY = "toepify_recent_tournaments";

export function getRecentTournaments(): RecentTournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentTournament[];
  } catch {
    return [];
  }
}

export function saveRecentTournament(id: string, name: string, players: string[]) {
  const existing = getRecentTournaments().filter((t) => t.id !== id);
  const updated = [{ id, name, players, lastVisited: Date.now() }, ...existing].slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
