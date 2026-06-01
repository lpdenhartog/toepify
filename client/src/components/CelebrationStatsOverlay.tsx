import { useMemo } from "react";
import type { GameState } from "../api/game";
import GameDramaGrid from "./GameDramaGrid";
import {
  getMostPenaltyStat,
  getNormalRounds,
  getSloperStat,
  getSnurkerStat,
} from "./celebrationStats";
import "./CelebrationStatsOverlay.css";

interface GameEndCelebrationProps {
  gameState: GameState;
  onNewGame: () => void;
  isCreator: boolean;
  onCloseTournament: () => void;
  excludedPlayers: Set<string>;
}

export default function CelebrationStatsOverlay({
  gameState,
  onNewGame,
  isCreator,
  onCloseTournament,
  excludedPlayers,
}: GameEndCelebrationProps) {
  const { players, rounds, pot, balances, tournament } = gameState;

  const winner = players.find(
    (p) => p.player_id === gameState.game.winner_player_id
  );

  const totalBuyIns = players.reduce((sum, p) => sum + p.buy_ins, 0);
  const normalRounds = useMemo(() => getNormalRounds(rounds), [rounds]);
  const roundCount = normalRounds.length;
  const mostPenalty = useMemo(
    () => getMostPenaltyStat(rounds, players),
    [rounds, players]
  );
  const sloper = useMemo(
    () => getSloperStat(rounds, players),
    [rounds, players]
  );
  const snurker = useMemo(
    () => getSnurkerStat(rounds, players),
    [rounds, players]
  );

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => b.balance - a.balance),
    [balances]
  );

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+\u20AC${formatted}`;
    return `-\u20AC${formatted}`;
  };

  const formatPot = (amount: number) =>
    `\u20AC${amount.toFixed(2).replace(".", ",")}`;

  const formatNames = (names: string[]) =>
    names.length > 0 ? names.join(", ") : "-";

  const formatSnurkers = () =>
    snurker.players.length > 0
      ? snurker.players
          .map(
            (player) =>
              `${player.playerName} (${player.matchingRounds} keer van ${player.playedRounds} ronden)`
          )
          .join(", ")
      : "-";

  // Generate deterministic confetti pieces so rendering remains pure.
  const confettiPieces = useMemo(() => {
    const colors = ["#e8a817", "#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#f39c12"];
    const pseudoRandom = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };

    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${pseudoRandom(i + 1) * 100}%`,
      delay: `${pseudoRandom(i + 101) * 3}s`,
      duration: `${2 + pseudoRandom(i + 201) * 3}s`,
      color: colors[i % colors.length],
      size: 6 + pseudoRandom(i + 301) * 6,
      isCircle: pseudoRandom(i + 401) > 0.5,
    }));
  }, []);

  return (
    <div className="celebration-overlay">
      {/* Confetti */}
      <div className="confetti-container" aria-hidden="true">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className={`confetti-piece ${piece.isCircle ? "confetti-circle" : ""}`}
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              backgroundColor: piece.color,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
            }}
          />
        ))}
      </div>

      {/* Winner name */}
      <div className="celebration-winner">
        {winner?.player_name ?? "Winnaar"}
      </div>
      <div className="celebration-subtitle">
        wint de pot: <span>{formatPot(pot)}</span>
      </div>

      {/* Stats */}
      <div className="celebration-stats" aria-label="Spelstatistieken">
        <div className="celebration-stat-row">
          <span className="celebration-stat-label">Sloper</span>
          <span className="celebration-stat-value">
            {sloper.points > 0
              ? `${formatNames(sloper.playerNames)} (${sloper.points} punten)`
              : "-"}
          </span>
        </div>
        <div className="celebration-stat-row">
          <span className="celebration-stat-label">Snurker</span>
          <span className="celebration-stat-value">{formatSnurkers()}</span>
        </div>
        <div className="celebration-stat-row">
          <span className="celebration-stat-label">Aantal inkopen</span>
          <span className="celebration-stat-value">{totalBuyIns}</span>
        </div>
        <div className="celebration-stat-row">
          <span className="celebration-stat-label">Meeste punten in 1 ronde</span>
          <span className="celebration-stat-value">
            {mostPenalty.points > 0
              ? `${mostPenalty.points} (${mostPenalty.playerNames.join(", ")})`
              : "0"}
          </span>
        </div>
        <div className="celebration-stat-row">
          <span className="celebration-stat-label">Aantal ronden</span>
          <span className="celebration-stat-value">{roundCount}</span>
        </div>
      </div>

      {/* Drama grid */}
      {normalRounds.length > 0 && (
        <GameDramaGrid gameState={gameState} excludedPlayers={excludedPlayers} />
      )}

      {/* Leaderboard */}
      <div className="celebration-leaderboard">
        <table className="player-summary-table">
          <thead>
            <tr>
              <th className="pos-col">#</th>
              <th>Speler</th>
              <th>Balans</th>
              <th>Inzet</th>
            </tr>
          </thead>
          <tbody>
            {sortedBalances.map((bal, index) => {
              const gamePlayer = players.find(
                (p) => p.player_id === bal.player_id
              );
              const stake = gamePlayer
                ? tournament.stake_per_game * (1 + gamePlayer.buy_ins)
                : 0;
              return (
                <tr key={bal.player_id}>
                  <td className="pos-col">{index + 1}</td>
                  <td>{bal.player_name}</td>
                  <td
                    className={
                      bal.balance > 0
                        ? "balance-positive"
                        : bal.balance < 0
                        ? "balance-negative"
                        : ""
                    }
                  >
                    {formatEuro(bal.balance)}
                  </td>
                  <td>
                    {"\u20AC"}
                    {stake.toFixed(2).replace(".", ",")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New game button */}
      <button className="btn-primary celebration-new-game" onClick={onNewGame}>
        Nieuw spel
      </button>

      {/* Close tournament button (creator only) */}
      {isCreator && (
        <button
          className="btn-primary celebration-close-tournament"
          onClick={() => {
            if (window.confirm("Weet je zeker dat je het toernooi wilt afsluiten? Er kunnen dan geen nieuwe spellen meer worden gestart.")) {
              onCloseTournament();
            }
          }}
        >
          Toernooi afsluiten
        </button>
      )}
    </div>
  );
}
