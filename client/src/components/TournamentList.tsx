import { useState, useEffect, useCallback } from "react";
import { fetchTournaments, deleteTournaments } from "../api/admin";
import type { TournamentSummary } from "../api/admin";

interface Props {
  token: string;
}

export default function TournamentList({ token }: Props) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchTournaments(token);
      setTournaments(data);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Weet je zeker dat je ${selected.size} toernooi${selected.size > 1 ? "en" : ""} wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      await deleteTournaments(token, Array.from(selected));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tournaments");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <h2>Toernooien</h2>
      {error && <p className="error-msg">{error}</p>}
      {loading ? (
        <p className="loading-text">Laden...</p>
      ) : tournaments.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.9rem" }}>
          Geen toernooien gevonden
        </p>
      ) : (
        <>
          {tournaments.map((t) => (
            <label key={t.id} className="tournament-row">
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => toggleSelect(t.id)}
              />
              <div style={{ flex: 1 }}>
                <div>{t.name}</div>
                <div className="tournament-players">
                  {t.players.map((p) => p.name).join(", ")}
                </div>
              </div>
              <a
                href={`/t/${t.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tournament-link"
                onClick={(e) => e.stopPropagation()}
                title="Open toernooi"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10.5V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5" />
                  <path d="M12 3h5v5" />
                  <path d="M17 3L9 11" />
                </svg>
              </a>
            </label>
          ))}
          <button
            className="btn-primary btn-danger-full"
            disabled={selected.size === 0 || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Verwijderen..." : "Verwijderen"}
          </button>
        </>
      )}
    </div>
  );
}
