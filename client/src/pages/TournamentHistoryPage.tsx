import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTournamentHistory, type GameState } from "../api/game";
import GameDramaGrid from "../components/GameDramaGrid";

export default function TournamentHistoryPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tournamentId) return;

    let cancelled = false;

    async function loadHistory() {
      try {
        const history = await fetchTournamentHistory(tournamentId!);
        if (cancelled) return;
        setGames(history);
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Fout bij laden geschiedenis");
        setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  if (!tournamentId) return null;
  if (loading) return <p className="loading-text">Laden...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  const tournamentName = games[0]?.tournament.name ?? "Toernooi";

  return (
    <main className="tournament-history tp pal-chalk">
      <div className="tournament-history-header">
        <Link className="btn-secondary tournament-history-back" to={`/t/${tournamentId}`}>
          Terug naar spel
        </Link>
        <div>
          <p className="tournament-history-eyebrow">Geschiedenis</p>
          <h2>{tournamentName}</h2>
        </div>
      </div>

      {games.length === 0 ? (
        <p className="tournament-history-empty">Nog geen spellen gespeeld.</p>
      ) : (
        <div className="tournament-history-list">
          {games.map((game, index) => (
            <section className="tournament-history-game" key={game.game.id}>
              <h3>Spel {index + 1}</h3>
              {game.rounds.length > 0 ? (
                <GameDramaGrid
                  gameState={game}
                  excludedPlayers={new Set()}
                  title={null}
                />
              ) : (
                <p className="tournament-history-empty">Nog geen rondes.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
