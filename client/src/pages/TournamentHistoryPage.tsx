import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTournamentHistory, type GameState } from "../api/game";
import GameDramaGrid from "../components/GameDramaGrid";
import {
  formatMostPenaltyStat,
  getMostPenaltyStat,
  getNormalRounds,
  getSloperStat,
  getSnurkerStat,
} from "../components/celebrationStats";

function formatPot(amount: number): string {
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

function formatNames(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "-";
}

function getWinnerSummary(game: GameState): string {
  const winner = game.players.find(
    (player) => player.player_id === game.game.winner_player_id,
  );

  if (!winner) return "Nog geen winnaar";

  return `${winner.player_name} won ${formatPot(game.pot)}`;
}

function getGameStats(game: GameState): Array<{ label: string; value: string }> {
  const normalRounds = getNormalRounds(game.rounds);
  const mostPenalty = getMostPenaltyStat(game.rounds, game.players);
  const sloper = getSloperStat(game.rounds, game.players);
  const snurker = getSnurkerStat(game.rounds, game.players);
  const totalBuyIns = game.players.reduce((sum, player) => sum + player.buy_ins, 0);

  const snurkerValue =
    snurker.players.length > 0
      ? snurker.players
          .map(
            (player) =>
              `${player.playerName} (${player.matchingRounds} keer van ${player.playedRounds} ronden)`,
          )
          .join(", ")
      : "-";

  return [
    {
      label: "Sloper",
      value:
        sloper.points > 0
          ? `${formatNames(sloper.playerNames)} (${sloper.points} punten)`
          : "-",
    },
    { label: "Snurker", value: snurkerValue },
    { label: "Aantal inkopen", value: String(totalBuyIns) },
    {
      label: "Meeste punten in 1 ronde",
      value: formatMostPenaltyStat(mostPenalty),
    },
    { label: "Aantal ronden", value: String(normalRounds.length) },
  ];
}

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
        <Link
          className="tournament-history-back"
          to={`/t/${tournamentId}`}
          aria-label="Terug naar spel"
          title="Terug naar spel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
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
          {games.map((game, index) => {
            const stats = getGameStats(game);

            return (
              <details className="tournament-history-game" key={game.game.id}>
                <summary className="tournament-history-game-summary">
                  <h3 className="tournament-history-game-number">
                    Spel {index + 1}
                  </h3>
                  <span className="tournament-history-game-winner">
                    {getWinnerSummary(game)}
                  </span>
                  <span className="tournament-history-game-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>

                <div className="tournament-history-game-body">
                  {game.rounds.length > 0 ? (
                    <GameDramaGrid
                      gameState={game}
                      excludedPlayers={new Set()}
                      title={null}
                    />
                  ) : (
                    <p className="tournament-history-empty">Nog geen rondes.</p>
                  )}

                  <dl className="tournament-history-stats" aria-label="Spelstatistieken">
                    {stats.map((stat) => (
                      <div className="tournament-history-stat" key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
