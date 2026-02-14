import { useMemo } from "react";
import type { GameState } from "../api/game";

function getUniqueAbbreviations(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const lengths = new Map<string, number>();

  for (const name of names) {
    lengths.set(name, 1);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const abbrevToNames = new Map<string, string[]>();

    for (const name of names) {
      const len = lengths.get(name)!;
      const abbrev = name.slice(0, len).toUpperCase();
      if (!abbrevToNames.has(abbrev)) abbrevToNames.set(abbrev, []);
      abbrevToNames.get(abbrev)!.push(name);
    }

    for (const [, group] of abbrevToNames) {
      if (group.length > 1) {
        for (const name of group) {
          const cur = lengths.get(name)!;
          if (cur < name.length) {
            lengths.set(name, cur + 1);
            changed = true;
          }
        }
      }
    }
  }

  for (const name of names) {
    result.set(name, name.slice(0, lengths.get(name)!).toUpperCase());
  }
  return result;
}

interface ScoreboardProps {
  gameState: GameState;
  pendingPenalties: Record<string, number>;
  onPenaltyChange: (playerId: string, delta: number) => void;
  onFinishRound: () => void;
  finishingRound: boolean;
  onCancelRound: () => void;
  onBuyIn: (playerId: string) => void;
  onFinishGame: () => void;
  onNewGame: () => void;
}

export default function Scoreboard({
  gameState,
  pendingPenalties,
  onPenaltyChange,
  onFinishRound,
  finishingRound,
  onCancelRound,
  onBuyIn,
  onFinishGame,
  onNewGame,
}: ScoreboardProps) {
  const { tournament, game, players, rounds, pot, balances } = gameState;
  const abbreviations = useMemo(
    () => getUniqueAbbreviations(players.map((p) => p.player_name)),
    [players]
  );
  const isActive = game.status === "active";
  const activePlayers = players.filter((p) => p.is_active);
  const zeroCount = activePlayers.filter(
    (p) => !pendingPenalties[p.player_id]
  ).length;
  const penaltiesValid = zeroCount === 1;
  const winner = game.winner_player_id
    ? players.find((p) => p.player_id === game.winner_player_id)
    : null;

  // Buy-in allowed if: game active, server says can_buy_in, and at least 2 players still active
  const canBuyIn = (playerId: string) => {
    if (!isActive) return false;
    const player = players.find((p) => p.player_id === playerId);
    if (!player || !player.can_buy_in) return false;
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
              {players.map((p) => (
                  <th key={p.player_id} className="player-col">
                    <div className="player-header">
                      <div className="player-header-name" title={p.player_name}>{abbreviations.get(p.player_name)}</div>
                      {p.is_active && p.total_score === 14 && (
                        <span className="status-pelt">Pelt!</span>
                      )}
                      {!p.is_active && (
                        <span className="status-out">Uit</span>
                      )}
                    </div>
                  </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cumulativeScores.map((scores, i) => {
              const isCurrent = i === cumulativeScores.length - 1;
              return (
                <tr key={i} className={isCurrent ? "score-row-current" : "score-row-history"}>
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
              );
            })}
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
                  {abbreviations.get(p.player_name)} inkopen op {maxActiveScore} (€{tournament.stake_per_game.toFixed(2).replace(".", ",")})
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
                {p.is_active ? (
                  <div className="penalty-input">
                    <button
                      className="penalty-btn"
                      onClick={() => onPenaltyChange(p.player_id, 1)}
                    >
                      {pendingPenalties[p.player_id] || 0}
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

          <div className="round-actions">
            <button
              className="round-action-btn cancel-btn"
              onClick={onCancelRound}
              aria-label="Annuleer ronde"
            >
              ✕
            </button>
            <button
              className="btn-primary scoreboard-action"
              onClick={onFinishRound}
              disabled={finishingRound || !penaltiesValid}
              aria-label="Ronde afsluiten"
            >
              ✓
            </button>
          </div>


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

      {/* Player summary table */}
      <div className="player-summary-wrapper">
        <table className="player-summary-table">
          <thead>
            <tr>
              <th>Speler</th>
              <th>Balans</th>
              <th>Inzet</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const balance = balances.find((b) => b.player_id === p.player_id);
              const stake = tournament.stake_per_game * (1 + p.buy_ins);
              return (
                <tr key={p.player_id}>
                  <td>{p.player_name}</td>
                  <td className={
                    balance && balance.balance > 0
                      ? "balance-positive"
                      : balance && balance.balance < 0
                      ? "balance-negative"
                      : ""
                  }>
                    {balance ? formatEuro(balance.balance) : "€0,00"}
                  </td>
                  <td>€{stake.toFixed(2).replace(".", ",")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
