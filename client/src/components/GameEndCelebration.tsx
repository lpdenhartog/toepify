import { useMemo } from "react";
import type { GameState } from "../api/game";

interface GameEndCelebrationProps {
  gameState: GameState;
  onNewGame: () => void;
}

export default function GameEndCelebration({
  gameState,
  onNewGame,
}: GameEndCelebrationProps) {
  const { players, rounds, pot, balances, tournament } = gameState;

  const winner = players.find(
    (p) => p.player_id === gameState.game.winner_player_id
  );

  const totalBuyIns = players.reduce((sum, p) => sum + p.buy_ins, 0);
  const roundCount = rounds.length;

  const mostPenalty = useMemo(() => {
    let maxPoints = 0;
    let maxPlayerName = "";
    for (const round of rounds) {
      for (const score of round.scores) {
        if (score.penalty_points > maxPoints) {
          maxPoints = score.penalty_points;
          const player = players.find((p) => p.player_id === score.player_id);
          maxPlayerName = player?.player_name ?? "";
        }
      }
    }
    return { name: maxPlayerName, points: maxPoints };
  }, [rounds, players]);

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => b.balance - a.balance),
    [balances]
  );

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+\u20AC${formatted}`;
    return `-\u20AC${formatted}`;
  };

  // Generate confetti pieces
  const confettiPieces = useMemo(() => {
    const colors = ["#e8a817", "#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#f39c12"];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
      isCircle: Math.random() > 0.5,
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
      <div className="celebration-subtitle">wint de pot!</div>

      {/* Stats */}
      <div className="celebration-stats">
        <div className="stat-card">
          <div className="stat-value">
            {"\u20AC"}
            {pot.toFixed(2).replace(".", ",")}
          </div>
          <div className="stat-label">Pot</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalBuyIns}</div>
          <div className="stat-label">Inkopen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{roundCount}</div>
          <div className="stat-label">Rondes</div>
        </div>
        {mostPenalty.points > 0 && (
          <div className="stat-card">
            <div className="stat-value">{mostPenalty.name}</div>
            <div className="stat-label">
              Meeste punten in een ronde ({mostPenalty.points})
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
