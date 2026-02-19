import { useMemo } from "react";
import type { GameState } from "../api/game";
import { buildDramaGridData, type GridCell, type CellEvent } from "./buildDramaGridData";

interface GameDramaGridProps {
  gameState: GameState;
  excludedPlayers: Set<string>;
}

function cellPenaltyClass(cell: GridCell): string {
  if (cell.event === "dead") return "drama-cell--dead";
  if (cell.event === "winner") return "drama-cell--winner";
  const p = cell.penalty ?? 0;
  if (p === 0) return "drama-cell--penalty-0";
  if (p === 1) return "drama-cell--penalty-1";
  if (p === 2) return "drama-cell--penalty-2";
  if (p === 3) return "drama-cell--penalty-3";
  return "drama-cell--penalty-4";
}

function cellIcon(event: CellEvent): string | null {
  if (event === "pelt") return "⚠";
  if (event === "eliminated") return "💀";
  if (event === "buyin") return "💵";
  if (event === "winner") return "🏆";
  return null;
}

function cellTooltip(playerName: string, cell: GridCell): string {
  const delta = cell.penalty !== null ? (cell.penalty === 0 ? "+0" : `+${cell.penalty}`) : "";
  const base = `${playerName}: ${delta}`;
  if (cell.event === "pelt") return `${base} — Pelt!`;
  if (cell.event === "eliminated") return `${base} — Uitgeschakeld`;
  if (cell.event === "buyin") return `${playerName}: ${delta} — Inkoop naar ${cell.buyInTotal}`;
  if (cell.event === "winner") return `${base} — Winnaar`;
  if (cell.event === "dead") return `${playerName} — Uit`;
  return base;
}

export default function GameDramaGrid({ gameState, excludedPlayers }: GameDramaGridProps) {
  const { players, rounds } = gameState;
  const includedPlayers = players.filter((p) => !excludedPlayers.has(p.player_id));

  const { rows, columns } = useMemo(
    () => buildDramaGridData(includedPlayers, rounds, gameState.game.winner_player_id),
    [includedPlayers, rounds, gameState.game.winner_player_id]
  );

  if (columns.length === 0) return null;

  return (
    <div className="drama-grid-container">
      <div className="drama-grid-header-row">
        <div className="drama-grid-sticky-corner" />
        {columns.map((col, idx) => (
          <div key={col.roundNumber} className="drama-grid-col-header">
            {idx + 1}
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.playerId} className="drama-grid-row">
          <div className="drama-grid-player-label" title={row.playerName}>
            {row.playerName}
          </div>
          {row.cells.map((cell, colIdx) => {
            const icon = cellIcon(cell.event);
            return (
              <div
                key={colIdx}
                className={`drama-cell ${cellPenaltyClass(cell)}`}
                title={cellTooltip(row.playerName, cell)}
              >
                {cell.event !== "dead" && (
                  <>
                    <span className="drama-cell-value">
                      {cell.totalAfter > 0 ? cell.totalAfter : "0"}
                    </span>
                    {icon && <span className="drama-cell-icon">{icon}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
