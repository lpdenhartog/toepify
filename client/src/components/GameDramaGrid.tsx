import { useMemo } from "react";
import type { GameState } from "../api/game";
import { buildDramaGridData, type GridCell } from "./buildDramaGridData";
import { displayScore } from "./scoreboard/scoreboardHelpers";

interface GameDramaGridProps {
  gameState: GameState;
  excludedPlayers: Set<string>;
  title?: string | null;
}

// Colour by points gained THIS round (cell.penalty = the increase vs the
// player's previous cell): 0 = green … 4+ = red — an absolute per-round scale,
// matching production. (Winner/dead cells are marked separately.)
function tierClass(cell: GridCell): string {
  if (cell.event === "dead") return "tp-ddead";
  if (cell.event === "winner") return "tp-dwin";
  if (cell.event === "buyin") return "tp-dbuyin";
  if (cell.event === "eliminated") return "tp-deliminated";
  const p = cell.penalty ?? 0;
  if (p <= 0) return "tp-d0";
  if (p === 1) return "tp-d1";
  if (p === 2) return "tp-d2";
  if (p === 3) return "tp-d3";
  return "tp-d4";
}

// The number shows the player's cumulative score AFTER that round
// (cell.totalAfter); the cell's colour conveys the points gained that round.
function cellText(cell: GridCell): string {
  if (cell.event === "dead") return "";
  if (cell.event === "buyin" && cell.buyInTotal !== undefined) {
    return String(displayScore(cell.buyInTotal));
  }
  return String(displayScore(cell.totalAfter));
}

function cellBadge(cell: GridCell): string | null {
  if (cell.event === "buyin") return "€";
  if (cell.event === "eliminated") return "×";
  if (cell.event === "winner") return "✓";
  return null;
}

function cellBadgeLabel(cell: GridCell): string | undefined {
  if (cell.event === "buyin") return "Inkoop";
  if (cell.event === "eliminated") return "Uitgeschakeld";
  if (cell.event === "winner") return "Winnaar";
  return undefined;
}

function cellTooltip(playerName: string, cell: GridCell): string {
  const delta =
    cell.penalty !== null
      ? cell.penalty === 0
        ? "+0"
        : `+${cell.penalty}`
      : "";
  const base = `${playerName}: ${delta}`;
  if (cell.event === "pelt") return `${base} — Pelt!`;
  if (cell.event === "eliminated") return `${base} — Uitgeschakeld`;
  if (cell.event === "buyin")
    return `${playerName}: ${delta} — Inkoop naar ${
      cell.buyInTotal === undefined ? "" : displayScore(cell.buyInTotal)
    }`;
  if (cell.event === "winner") return `${base} — Winnaar`;
  if (cell.event === "dead") return `${playerName} — Uit`;
  return base;
}

export default function GameDramaGrid({
  gameState,
  excludedPlayers,
  title = "Het verloop",
}: GameDramaGridProps) {
  const { players, rounds } = gameState;
  const winnerPlayerId = gameState.game.winner_player_id;
  const includedPlayers = players.filter(
    (p) => !excludedPlayers.has(p.player_id),
  );

  const { rows, columns } = useMemo(
    () => buildDramaGridData(includedPlayers, rounds, winnerPlayerId),
    [includedPlayers, rounds, winnerPlayerId],
  );

  if (columns.length === 0) return null;

  return (
    <div className="tp-drama">
      {title && <div className="tp-drama-title">{title}</div>}
      {rows.map((row) => {
        const isWinner = row.playerId === winnerPlayerId;
        return (
          <div className="tp-drow" key={row.playerId}>
            <span
              className="tp-dname"
              title={row.playerName}
              style={
                isWinner
                  ? { color: "var(--accent)", fontWeight: 700 }
                  : undefined
              }
            >
              {row.playerName}
            </span>
            <div className="tp-dcells">
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`tp-dcell ${tierClass(cell)}`}
                  title={cellTooltip(row.playerName, cell)}
                >
                  <span>{cellText(cell)}</span>
                  {cellBadge(cell) && (
                    <span className="tp-dbadge" aria-label={cellBadgeLabel(cell)}>
                      {cellBadge(cell)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
