import { useMemo, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { GameState } from "../api/game";
import GameEndCelebration from "./GameEndCelebration";

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
  buyingIn: boolean;
  onNewGame: () => void;
  excludedPlayers: Set<string>;
  onTogglePlayer: (playerId: string) => void;
  onUndoRound: () => void;
  undoingRound: boolean;
  isCreator: boolean;
  onCloseTournament: () => void;
}

export default function Scoreboard({
  gameState,
  pendingPenalties,
  onPenaltyChange,
  onFinishRound,
  finishingRound,
  onCancelRound,
  onBuyIn,
  buyingIn,
  onNewGame,
  excludedPlayers,
  onTogglePlayer,
  onUndoRound,
  undoingRound,
  isCreator,
  onCloseTournament,
}: ScoreboardProps) {
  const { tournament, game, players, rounds, pot, balances } = gameState;
  const abbreviations = useMemo(
    () => getUniqueAbbreviations(players.map((p) => p.player_name)),
    [players]
  );
  const isActive = game.status === "active";
  const showPlayerSelection = isActive && rounds.length === 0;
  const activePlayers = players.filter((p) => p.is_active && !excludedPlayers.has(p.player_id));
  const zeroCount = activePlayers.filter(
    (p) => !pendingPenalties[p.player_id]
  ).length;
  const penaltiesValid = zeroCount === 1 && activePlayers.length >= 2;
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

  // Split cumulative scores into history (scrollable) and current (always visible)
  const historyScores = cumulativeScores.slice(0, -1);
  const currentScores: Record<string, number> =
    cumulativeScores.length > 0
      ? cumulativeScores[cumulativeScores.length - 1]
      : Object.fromEntries(players.map((p) => [p.player_id, 0]));

  // Auto-scroll history to bottom so most recent rounds are visible
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historyScores.length]);

  const [showQR, setShowQR] = useState(false);
  const shareUrl = window.location.href;

  const displayScore = (val: number) => (val === 14 ? "P" : val);

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+€${formatted}`;
    return `-€${formatted}`;
  };

  return (
    <div className="scoreboard">
      {/* Celebration overlay */}
      {game.status === "finished" && (
        <GameEndCelebration gameState={gameState} onNewGame={onNewGame} isCreator={isCreator} onCloseTournament={onCloseTournament} />
      )}

      {/* Score table */}
      <div className="score-table-wrapper">
        {/* Player header */}
        <table className="score-table score-table-fixed">
          <thead>
            <tr>
              {players.map((p) => {
                const isExcluded = excludedPlayers.has(p.player_id);
                return (
                  <th key={p.player_id} className={`player-col${isExcluded ? " player-excluded" : ""}`}>
                    <div className="player-header">
                      {showPlayerSelection && (
                        <input
                          type="checkbox"
                          className="player-checkbox"
                          checked={!isExcluded}
                          onChange={() => onTogglePlayer(p.player_id)}
                        />
                      )}
                      <div className="player-header-name" title={p.player_name}>{abbreviations.get(p.player_name)}</div>
                      {!showPlayerSelection && p.is_active && p.total_score === 14 && (
                        <span className="status-pelt">Pelt!</span>
                      )}
                      {!showPlayerSelection && !p.is_active && (
                        <span className="status-out">Uit</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
        </table>

        {/* Scrollable history rows */}
        {historyScores.length > 0 && (
          <div className="score-table-scroll" ref={scrollRef}>
            <table className="score-table score-table-fixed">
              <tbody>
                {historyScores.map((scores, i) => (
                  <tr key={i} className="score-row-history">
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
                          {displayScore(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Current score row — always visible */}
        <table className="score-table score-table-fixed">
          <tbody>
            <tr className="score-row-current">
              {players.map((p) => {
                const val = currentScores[p.player_id] || 0;
                const isExcluded = excludedPlayers.has(p.player_id);
                return (
                  <td
                    key={p.player_id}
                    className={
                      (isExcluded ? "player-excluded " : "") +
                      (val >= 15
                        ? "score-cell score-out"
                        : val === 14
                        ? "score-cell score-pelt"
                        : "score-cell")
                    }
                  >
                    {displayScore(val)}
                  </td>
                );
              })}
            </tr>
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
                  disabled={buyingIn}
                  onClick={() => onBuyIn(p.player_id)}
                >
                  {p.player_name} inkopen op {displayScore(maxActiveScore)} (€{tournament.stake_per_game.toFixed(2).replace(".", ",")})
                </button>
              );
            })}
        </div>
      )}

      {/* Penalty input for current round */}
      {isActive && (
        <div className="penalty-section">
          <div className="penalty-grid">
            {players.map((p) => {
              const isExcluded = excludedPlayers.has(p.player_id);
              return (
                <div key={p.player_id} className={`penalty-column${isExcluded ? " player-excluded" : ""}`}>
                  {p.is_active && !isExcluded ? (
                    <div className="penalty-input">
                      <button
                        className={`penalty-btn${p.total_score === 14 ? " penalty-btn-pelt" : ""}`}
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
              );
            })}
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
            {rounds.length > 0 && (
              <button
                className="round-action-btn undo-btn"
                disabled={undoingRound}
                onClick={() => {
                  if (window.confirm("Laatste ronde ongedaan maken?")) {
                    onUndoRound();
                  }
                }}
                aria-label="Laatste ronde ongedaan maken"
              >
                ↩︎
              </button>
            )}
          </div>

        </div>
      )}

      {/* Undo button for finished games (active games show it in round-actions) */}
      {!isActive && game.status === "finished" && rounds.length > 0 && (
        <div className="round-actions">
          <button
            className="round-action-btn undo-btn"
            disabled={undoingRound}
            onClick={() => {
              if (window.confirm("Laatste ronde ongedaan maken?")) {
                onUndoRound();
              }
            }}
            aria-label="Laatste ronde ongedaan maken"
          >
            ↩︎
          </button>
        </div>
      )}

      {/* QR overlay */}
      {showQR && (
        <div className="qr-overlay" onClick={() => setShowQR(false)}>
          <button
            className="qr-overlay-close"
            onClick={() => setShowQR(false)}
            aria-label="Sluiten"
          >
            ✕
          </button>
          <div className="qr-overlay-content" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG
              value={shareUrl}
              size={280}
              bgColor="transparent"
              fgColor="#ffffff"
              level="M"
            />
            <p className="qr-overlay-label">{tournament.name}</p>
          </div>
        </div>
      )}

      {/* Tournament info */}
      <div className="scoreboard-header">
        <div className="scoreboard-title">{tournament.name}</div>
        <div className="pot-display">
          Pot: €{pot.toFixed(2).replace(".", ",")}
        </div>
      </div>

      {/* Player summary table */}
      <div className="player-summary-wrapper">
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
            {[...balances]
              .sort((a, b) => b.balance - a.balance)
              .map((bal, index) => {
                const gamePlayer = players.find((p) => p.player_id === bal.player_id);
                const stake = gamePlayer
                  ? tournament.stake_per_game * (1 + gamePlayer.buy_ins)
                  : 0;
                return (
                  <tr key={bal.player_id}>
                    <td className="pos-col">{index + 1}</td>
                    <td>{bal.player_name}</td>
                    <td className={
                      bal.balance > 0
                        ? "balance-positive"
                        : bal.balance < 0
                        ? "balance-negative"
                        : ""
                    }>
                      {formatEuro(bal.balance)}
                    </td>
                    <td>€{stake.toFixed(2).replace(".", ",")}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="btn-share-wrapper">
        <button
          className="btn-primary btn-buyin btn-share"
          onClick={() => setShowQR(true)}
        >
          Deel link
        </button>
      </div>

      {/* Close tournament button on scoreboard (creator, active game, no rounds played) */}
      {isCreator && isActive && rounds.length === 0 && (
        <div className="btn-share-wrapper" style={{ marginTop: "0.75rem" }}>
          <button
            className="btn-primary btn-buyin btn-share"
            onClick={() => {
              if (window.confirm("Weet je zeker dat je het toernooi wilt afsluiten? Er kunnen dan geen nieuwe spellen meer worden gestart.")) {
                onCloseTournament();
              }
            }}
          >
            Toernooi afsluiten
          </button>
        </div>
      )}

    </div>
  );
}
