import type { GameState } from "../api/game";

interface ScoreboardProps {
  gameState: GameState;
  pendingPenalties: Record<string, number>;
  onPenaltyChange: (playerId: string, delta: number) => void;
  onFinishRound: () => void;
  onBuyIn: (playerId: string) => void;
  onFinishGame: () => void;
  onNewGame: () => void;
}

export default function Scoreboard({
  gameState,
  pendingPenalties,
  onPenaltyChange,
  onFinishRound,
  onBuyIn,
  onFinishGame,
  onNewGame,
}: ScoreboardProps) {
  const { tournament, game, players, rounds, pot, balances } = gameState;
  const isActive = game.status === "active";
  const activePlayers = players.filter((p) => p.is_active);
  const winner = game.winner_player_id
    ? players.find((p) => p.player_id === game.winner_player_id)
    : null;

  // Buy-in allowed if: game active, player is out, and at least 2 players still active
  const canBuyIn = (playerId: string) => {
    if (!isActive) return false;
    const player = players.find((p) => p.player_id === playerId);
    if (!player || player.is_active) return false;
    return activePlayers.length >= 2;
  };

  // Build cumulative scores per round per player
  const cumulativeScores: Array<Record<string, number>> = [];
  const runningTotals: Record<string, number> = {};
  for (const p of players) runningTotals[p.player_id] = 0;

  for (const round of rounds) {
    for (const score of round.scores) {
      runningTotals[score.player_id] =
        (runningTotals[score.player_id] || 0) + score.penalty_points;
    }
    cumulativeScores.push({ ...runningTotals });
  }

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+€${formatted}`;
    return `-€${formatted}`;
  };

  return (
    <div className="scoreboard">
      {/* Header */}
      <div className="scoreboard-header">
        <div className="scoreboard-title">{tournament.name}</div>
        <div className="pot-display">
          Pot: €{pot.toFixed(2).replace(".", ",")}
        </div>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className="winner-banner">
          Winnaar: {winner.player_name}!
        </div>
      )}

      {/* Score table */}
      <div className="score-table-wrapper">
        <table className="score-table">
          <thead>
            <tr>
              {players.map((p) => {
                const balance = balances.find((b) => b.player_id === p.player_id);
                const stake = tournament.stake_per_game * (1 + p.buy_ins);
                return (
                  <th key={p.player_id} className="player-col">
                    <div className="player-header">
                      <div className="player-header-left">
                        <div className="player-header-name">{p.player_name}</div>
                        {p.is_active && p.total_score === 14 && (
                          <span className="status-pelt">Pelt!</span>
                        )}
                        {!p.is_active && (
                          <span className="status-out">Uit</span>
                        )}
                      </div>
                      <div className="player-header-amounts">
                        <span className={
                          balance && balance.balance > 0
                            ? "player-balance balance-positive"
                            : balance && balance.balance < 0
                            ? "player-balance balance-negative"
                            : "player-balance"
                        }>
                          {balance ? formatEuro(balance.balance) : "€0,00"}
                        </span>
                        <span className="player-stake">
                          €{stake.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cumulativeScores.map((scores, i) => (
              <tr key={i}>
                {players.map((p) => {
                  const val = scores[p.player_id] || 0;
                  return (
                    <td
                      key={p.player_id}
                      className={
                        val >= 15
                          ? "score-cell score-out"
                          : val === 14
                          ? "score-cell score-pelt"
                          : "score-cell"
                      }
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Empty state */}
            {rounds.length === 0 && (
              <tr>
                {players.map((p) => (
                  <td key={p.player_id} className="score-cell">0</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Buy-in buttons */}
      {isActive && players.some((p) => canBuyIn(p.player_id)) && (
        <div className="buyin-section">
          {players
            .filter((p) => canBuyIn(p.player_id))
            .map((p) => {
              const maxActiveScore = Math.max(
                ...players.filter((pl) => pl.is_active).map((pl) => pl.total_score),
                0
              );
              return (
                <button
                  key={p.player_id}
                  className="btn-primary btn-buyin"
                  onClick={() => onBuyIn(p.player_id)}
                >
                  {p.player_name} inkopen op {maxActiveScore} (€{tournament.stake_per_game.toFixed(2).replace(".", ",")})
                </button>
              );
            })}
        </div>
      )}

      {/* Penalty input for current round */}
      {isActive && (
        <div className="penalty-section">
          <div className="penalty-grid">
            {players.map((p) => (
              <div key={p.player_id} className="penalty-column">
                <div className="penalty-player-name">{p.player_name}</div>
                {p.is_active ? (
                  <div className="penalty-input">
                    <button
                      className="penalty-btn"
                      onClick={() => onPenaltyChange(p.player_id, -1)}
                      disabled={!pendingPenalties[p.player_id]}
                    >
                      -
                    </button>
                    <span className="penalty-value">
                      {pendingPenalties[p.player_id] || 0}
                    </span>
                    <button
                      className="penalty-btn"
                      onClick={() => onPenaltyChange(p.player_id, 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="penalty-input penalty-disabled">
                    <span className="penalty-value">-</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="btn-primary scoreboard-action" onClick={onFinishRound}>
            Ronde afsluiten
          </button>

          {activePlayers.length === 1 && (
            <button
              className="btn-primary scoreboard-action finish-game-btn"
              onClick={onFinishGame}
            >
              Spel beëindigen
            </button>
          )}
        </div>
      )}

      {/* New game button */}
      {game.status === "finished" && (
        <button className="btn-primary scoreboard-action" onClick={onNewGame}>
          Nieuw spel
        </button>
      )}

    </div>
  );
}
