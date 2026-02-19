import { useMemo } from "react";
import type { GameState } from "../api/game";

interface GameEndCelebrationProps {
  gameState: GameState;
  onNewGame: () => void;
  isCreator: boolean;
  onCloseTournament: () => void;
  excludedPlayers: Set<string>;
}

export default function GameEndCelebration({
  gameState,
  onNewGame,
  isCreator,
  onCloseTournament,
  excludedPlayers,
}: GameEndCelebrationProps) {
  const { players, rounds, pot, balances, tournament } = gameState;
  const includedPlayers = players.filter((p) => !excludedPlayers.has(p.player_id));
  const chartColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#ff69b4"];

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

  const scoreProgression = useMemo(() => {
    const orderedRounds = [...rounds].sort(
      (a, b) => a.round_number - b.round_number
    );
    const runningTotals: Record<string, number> = {};
    for (const p of includedPlayers) runningTotals[p.player_id] = 0;

    const series = includedPlayers.map((player, index) => ({
      playerId: player.player_id,
      playerName: player.player_name,
      color: chartColors[index % chartColors.length],
      points: [] as number[],
    }));

    for (const round of orderedRounds) {
      for (const score of round.scores) {
        if (excludedPlayers.has(score.player_id)) continue;
        runningTotals[score.player_id] =
          (runningTotals[score.player_id] || 0) + score.penalty_points;
      }
      for (const line of series) {
        line.points.push(runningTotals[line.playerId] || 0);
      }
    }

    const allValues = series.flatMap((line) => line.points);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;

    return {
      roundCount: orderedRounds.length,
      series,
      yMin: 0,
      yMax: Math.max(1, maxValue),
    };
  }, [rounds, includedPlayers, excludedPlayers, chartColors]);

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

      {/* Score progression chart */}
      {scoreProgression.roundCount > 0 && (
        <div className="celebration-chart">
          <div className="celebration-chart-title">Punten per ronde</div>
          <div className="celebration-chart-body">
            <svg
              className="celebration-chart-svg"
              viewBox="0 0 560 240"
              role="img"
              aria-label="Score progression per ronde"
              preserveAspectRatio="xMidYMid meet"
            >
              {(() => {
                const width = 560;
                const height = 240;
                const padding = { top: 16, right: 16, bottom: 36, left: 44 };
                const plotWidth = width - padding.left - padding.right;
                const plotHeight = height - padding.top - padding.bottom;
                const roundCount = scoreProgression.roundCount;
                const yRange = scoreProgression.yMax - scoreProgression.yMin || 1;

                const xForIndex = (i: number) =>
                  roundCount === 1
                    ? padding.left + plotWidth / 2
                    : padding.left + (i / (roundCount - 1)) * plotWidth;
                const yForValue = (v: number) =>
                  padding.top +
                  plotHeight -
                  ((v - scoreProgression.yMin) / yRange) * plotHeight;

                const yTicks = 4;
                const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
                  const value =
                    scoreProgression.yMin +
                    (i / yTicks) * (scoreProgression.yMax - scoreProgression.yMin);
                  const y = yForValue(value);
                  return { value: Math.round(value), y };
                });

                const firstRound = 1;
                const lastRound = roundCount;

                return (
                  <>
                    {gridLines.map((tick) => (
                      <g key={`grid-${tick.y}`}>
                        <line
                          x1={padding.left}
                          y1={tick.y}
                          x2={width - padding.right}
                          y2={tick.y}
                          className="celebration-chart-grid"
                        />
                        <text
                          x={padding.left - 8}
                          y={tick.y + 4}
                          textAnchor="end"
                          className="celebration-chart-axis-label"
                        >
                          {tick.value}
                        </text>
                      </g>
                    ))}

                    <line
                      x1={padding.left}
                      y1={padding.top}
                      x2={padding.left}
                      y2={height - padding.bottom}
                      className="celebration-chart-axis"
                    />
                    <line
                      x1={padding.left}
                      y1={height - padding.bottom}
                      x2={width - padding.right}
                      y2={height - padding.bottom}
                      className="celebration-chart-axis"
                    />

                    <text
                      x={padding.left}
                      y={height - 18}
                      textAnchor="start"
                      className="celebration-chart-axis-label"
                    >
                      {firstRound}
                    </text>
                    <text
                      x={width - padding.right}
                      y={height - 18}
                      textAnchor="end"
                      className="celebration-chart-axis-label"
                    >
                      {lastRound}
                    </text>
                    <text
                      x={width / 2}
                      y={height - 4}
                      textAnchor="middle"
                      className="celebration-chart-axis-title"
                    >
                      Rondes
                    </text>
                    <text
                      x={18}
                      y={padding.top - 2}
                      textAnchor="start"
                      className="celebration-chart-axis-title"
                    >
                      Punten
                    </text>

                    {scoreProgression.series.map((line) => {
                      const path = line.points
                        .map((value, index) => {
                          const x = xForIndex(index);
                          const y = yForValue(value);
                          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                        })
                        .join(" ");
                      return (
                        <path
                          key={line.playerId}
                          d={path}
                          className="celebration-chart-line"
                          style={{ stroke: line.color }}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            <div className="celebration-chart-legend">
              {scoreProgression.series.map((line) => (
                <div className="celebration-chart-legend-item" key={line.playerId}>
                  <span
                    className="celebration-chart-legend-swatch"
                    style={{ backgroundColor: line.color }}
                  />
                  <span>{line.playerName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
