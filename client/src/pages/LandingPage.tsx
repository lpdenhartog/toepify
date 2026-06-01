import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import CreateTournament from "../components/CreateTournament";
import { fetchMyTournaments, deleteTournament, visitTournament, type MyTournament } from "../api/tournaments";
import { getRecentTournaments, type RecentTournament } from "../utils/recentTournaments";

function parseTournamentId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/t\/([^/?#]+)/);
  if (match) return match[1];
  return trimmed;
}

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState<RecentTournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<MyTournament[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token && user) {
      // Migrate localStorage tournaments to account (per-user key)
      const migratedKey = `toepify_tournaments_migrated_${user.username}`;
      const migrated = localStorage.getItem(migratedKey);
      const localTournaments = getRecentTournaments();
      if (!migrated && localTournaments.length > 0) {
        Promise.all(
          localTournaments.map((t) => visitTournament(token, t.id).catch(() => {}))
        ).then(() => {
          localStorage.setItem(migratedKey, "true");
          return fetchMyTournaments(token);
        }).then(setMyTournaments).catch(() => {});
      } else {
        fetchMyTournaments(token)
          .then(setMyTournaments)
          .catch(() => {});
      }
    } else {
      setRecent(getRecentTournaments());
    }
  }, [isAuthenticated, token, user]);

  function refreshMyTournaments() {
    if (token) {
      fetchMyTournaments(token).then(setMyTournaments).catch(() => {});
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseTournamentId(input);
    if (id) navigate(`/t/${id}`);
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeleting(id);
    try {
      await deleteTournament(token, id);
      setMyTournaments((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
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

      {isAuthenticated && <CreateTournament onCreated={refreshMyTournaments} />}

      {isAuthenticated && myTournaments.length > 0 && (
        <div className="card">
          <h2>Mijn Toernooien</h2>
          {myTournaments.map((t) => (
            <div key={t.id} className="tournament-row my-tournament-row">
              <Link to={`/t/${t.id}`} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
                <div>{t.name}</div>
                <div className="tournament-players">{t.players.map((p) => p.name).join(", ")}</div>
              </Link>
              {t.isOwner && (
                <button
                  className="btn-danger btn-small"
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                >
                  {deleting === t.id ? "..." : "Verwijder"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAuthenticated && user?.isAdmin && (
        <Link to="/admin" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Admin
        </Link>
      )}

      {!isAuthenticated && recent.length > 0 && (
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
