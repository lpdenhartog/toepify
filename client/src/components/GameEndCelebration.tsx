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

    const totals: Record<string, number> = {};
    const active: Record<string, boolean> = {};
    const pendingEjectionRound: Record<string, number | null> = {};
    const pendingEjectionValue: Record<string, number> = {};

    for (const p of includedPlayers) {
      totals[p.player_id] = 0;
      active[p.player_id] = true;
      pendingEjectionRound[p.player_id] = null;
      pendingEjectionValue[p.player_id] = 0;
    }

    const series = includedPlayers.map((player, index) => ({
      playerId: player.player_id,
      playerName: player.player_name,
      color: chartColors[index % chartColors.length],
      points: [] as Array<number | null>,
      markers: [] as Array<{ type: "buy_in" | "ejection"; roundIndex: number; value: number }>,
      buyInRounds: [] as number[],
    }));
    const seriesById = new Map(series.map((line) => [line.playerId, line]));

    orderedRounds.forEach((round, roundIndex) => {
      const scoresByPlayer = new Map(
        round.scores.map((score) => [score.player_id, score.penalty_points])
      );
      const isBuyInRound = round.scores.some((score) => score.penalty_points < 0);
      const ejectedThisRound = new Set<string>();

      if (isBuyInRound) {
        const preBuyInTotals: Record<string, number> = {};
        for (const score of round.scores) {
          if (score.penalty_points < 0) {
            preBuyInTotals[score.player_id] = totals[score.player_id] || 0;
          }
        }

        for (const player of includedPlayers) {
          const delta = scoresByPlayer.get(player.player_id) ?? 0;
          totals[player.player_id] = (totals[player.player_id] || 0) + delta;
        }

        for (const score of round.scores) {
          if (score.penalty_points >= 0) continue;
          if (excludedPlayers.has(score.player_id)) continue;
          const line = seriesById.get(score.player_id);
          if (!line) continue;
          line.buyInRounds.push(roundIndex);
          const markerRoundIndex =
            pendingEjectionRound[score.player_id] ?? Math.max(0, roundIndex - 1);
          const markerValue =
            pendingEjectionValue[score.player_id] ??
            preBuyInTotals[score.player_id] ??
            totals[score.player_id] ??
            0;
          line.markers.push({
            type: "buy_in",
            roundIndex: markerRoundIndex,
            value: markerValue,
          });
          active[score.player_id] = true;
          pendingEjectionRound[score.player_id] = null;
        }
      } else {
        for (const player of includedPlayers) {
          const delta = scoresByPlayer.get(player.player_id) ?? 0;
          totals[player.player_id] = (totals[player.player_id] || 0) + delta;
        }

        for (const player of includedPlayers) {
          const playerId = player.player_id;
          if (active[playerId] && (totals[playerId] || 0) >= 15) {
            active[playerId] = false;
            ejectedThisRound.add(playerId);
            pendingEjectionRound[playerId] = roundIndex;
            pendingEjectionValue[playerId] = totals[playerId] || 0;
          }
        }
      }

      for (const line of series) {
        if (active[line.playerId] || ejectedThisRound.has(line.playerId)) {
          line.points.push(totals[line.playerId] || 0);
        } else {
          line.points.push(null);
        }
      }
    });

    for (const line of series) {
      const roundIndex = pendingEjectionRound[line.playerId];
      if (roundIndex !== null) {
        line.markers.push({
          type: "ejection",
          roundIndex,
          value: pendingEjectionValue[line.playerId] || 0,
        });
      }
    }

    const allValues = series
      .flatMap((line) => line.points)
      .filter((value): value is number => value !== null);
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

                    {(() => {
                      const yOffsetMap = new Map<string, number>();
                      const offsetStep = 3;

                      const overlapThreshold = 3;

                      for (let roundIndex = 0; roundIndex < scoreProgression.roundCount; roundIndex++) {
                        const items: Array<{
                          line: typeof scoreProgression.series[number];
                          y: number;
                        }> = [];
                        for (const line of scoreProgression.series) {
                          const value = line.points[roundIndex];
                          if (value === null) continue;
                          items.push({ line, y: yForValue(value) });
                        }
                        items.sort((a, b) => a.y - b.y);

                        let group: typeof items = [];
                        const flushGroup = () => {
                          if (group.length <= 1) {
                            group = [];
                            return;
                          }
                          const center = (group.length - 1) / 2;
                          group.forEach((item, idx) => {
                            yOffsetMap.set(
                              `${item.line.playerId}:${roundIndex}`,
                              (idx - center) * offsetStep
                            );
                          });
                          group = [];
                        };

                        for (const item of items) {
                          if (group.length === 0) {
                            group.push(item);
                            continue;
                          }
                          const last = group[group.length - 1];
                          if (Math.abs(item.y - last.y) <= overlapThreshold) {
                            group.push(item);
                          } else {
                            flushGroup();
                            group.push(item);
                          }
                        }
                        flushGroup();
                      }

                      const yWithOffset = (
                        line: typeof scoreProgression.series[number],
                        index: number,
                        value: number
                      ) => {
                        const directOffset = yOffsetMap.get(`${line.playerId}:${index}`);
                        if (directOffset !== undefined) {
                          return yForValue(value) + directOffset;
                        }
                        if (line.buyInRounds.includes(index) && index > 0) {
                          const priorOffset = yOffsetMap.get(`${line.playerId}:${index - 1}`) || 0;
                          return yForValue(value) + priorOffset;
                        }
                        return yForValue(value);
                      };

                      return (
                        <>
                          <defs>
                            {scoreProgression.series.map((line) => {
                              const maskId = `line-mask-${line.playerId}`;
                              return (
                                <mask key={maskId} id={maskId} maskUnits="userSpaceOnUse">
                                  <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
                                  {line.markers.map((marker, idx) => {
                                    const x = xForIndex(marker.roundIndex);
                                    const y = yWithOffset(line, marker.roundIndex, marker.value);
                                    return (
                                      <circle key={idx} cx={x} cy={y} r={13} fill="#000000" />
                                    );
                                  })}
                                </mask>
                              );
                            })}
                          </defs>

                          {scoreProgression.series.map((line) => {
                            const maskId = `line-mask-${line.playerId}`;
                            let started = false;
                            const path = line.points
                              .map((value, index) => {
                                if (value === null) {
                                  started = false;
                                  return null;
                                }
                                const x = xForIndex(index);
                                const y = yWithOffset(line, index, value);
                                const segment = `${started ? "L" : "M"} ${x} ${y}`;
                                started = true;
                                return segment;
                              })
                              .filter(Boolean)
                              .join(" ");
                            return (
                              <path
                                key={line.playerId}
                                d={path}
                                className="celebration-chart-line"
                                mask={`url(#${maskId})`}
                                style={{ stroke: line.color }}
                              />
                            );
                          })}

                          {scoreProgression.series.flatMap((line) =>
                            line.markers.map((marker, idx) => {
                              const x = xForIndex(marker.roundIndex);
                              const y = yWithOffset(line, marker.roundIndex, marker.value);
                              const isCross = marker.type === "ejection";
                              const label = isCross ? "†" : "\u20AC";
                              return (
                                <g
                                  key={`${line.playerId}-${marker.type}-${idx}`}
                                  className="celebration-chart-marker"
                                >
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={12}
                                    fill="none"
                                    stroke={line.color}
                                    strokeWidth={2}
                                  />
                                  <text
                                    x={x}
                                    y={isCross ? y + 7 : y + 4}
                                    textAnchor="middle"
                                    className="celebration-chart-marker-icon"
                                    style={{ fill: line.color }}
                                  >
                                    {isCross ? (
                                      <tspan style={{ fontSize: "17px" }}>{label}</tspan>
                                    ) : (
                                      label
                                    )}
                                  </text>
                                </g>
                              );
                            })
                          )}
                        </>
                      );
                    })()}
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
