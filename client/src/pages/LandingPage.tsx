import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

interface RecentTournament {
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

function parseTournamentId(input: string): string {
  const trimmed = input.trim();
  // Try to extract from URL like /t/xxx or https://...toepify.com/t/xxx
  const match = trimmed.match(/\/t\/([^/?#]+)/);
  if (match) return match[1];
  // Otherwise treat the whole input as the ID
  return trimmed;
}

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState<RecentTournament[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRecent(getRecentTournaments());
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseTournamentId(input);
    if (id) navigate(`/t/${id}`);
  }

  return (
    <div className="landing-page">
      <div className="card">
        <h2>Ga naar toernooi</h2>
        <form className="landing-input-group" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Toernooi ID of link"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary landing-go-btn" disabled={!input.trim()}>
            Ga
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h2>Recente toernooien</h2>
          {recent.map((t) => (
            <Link key={t.id} to={`/t/${t.id}`} className="tournament-row recent-tournament-row">
              <div style={{ flex: 1 }}>
                <div>{t.name}</div>
                <div className="tournament-players">{t.players.join(", ")}</div>
              </div>
              <svg
                className="tournament-link-icon"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 4l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
