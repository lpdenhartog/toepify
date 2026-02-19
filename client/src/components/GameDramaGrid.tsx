import { useMemo } from "react";
import type { GameState } from "../api/game";

type CellEvent = "none" | "pelt" | "eliminated" | "buyin" | "dead" | "winner";

interface GridCell {
  penalty: number | null;
  totalAfter: number;
  buyInTotal?: number;
  event: CellEvent;
}

interface GridRow {
  playerId: string;
  playerName: string;
  cells: GridCell[];
}

interface GridColumn {
  roundNumber: number;
}

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

  const { rows, columns } = useMemo((): { rows: GridRow[]; columns: GridColumn[] } => {
    const orderedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

    const totals: Record<string, number> = {};
    const isActive: Record<string, boolean> = {};

    for (const p of includedPlayers) {
      totals[p.player_id] = 0;
      isActive[p.player_id] = true;
    }

    const rowsMap: Record<string, GridRow> = {};
    for (const p of includedPlayers) {
      rowsMap[p.player_id] = {
        playerId: p.player_id,
        playerName: p.player_name,
        cells: [],
      };
    }

    const columns: GridColumn[] = [];

    for (const round of orderedRounds) {
      const scoresByPlayer = new Map(
        round.scores.map((s) => [s.player_id, s.penalty_points])
      );
      const isBuyInRound = round.scores.some((s) => s.penalty_points < 0);

      if (isBuyInRound) {
        // Don't create a column. Instead, retroactively mark the buying-in
        // player's last non-dead cell with "buyin" and update their running total.
        for (const p of includedPlayers) {
          const delta = scoresByPlayer.get(p.player_id) ?? 0;
          if (delta < 0) {
            totals[p.player_id] = (totals[p.player_id] ?? 0) + delta;
            isActive[p.player_id] = true;
            const buyInTotal = totals[p.player_id];
            const row = rowsMap[p.player_id];
            for (let i = row.cells.length - 1; i >= 0; i--) {
              if (row.cells[i].event !== "dead") {
                row.cells[i] = { ...row.cells[i], event: "buyin", buyInTotal };
                break;
              }
            }
          }
        }
      } else {
        // Normal round: add a column and a cell for every player.
        columns.push({ roundNumber: round.round_number });

        for (const p of includedPlayers) {
          const delta = scoresByPlayer.get(p.player_id) ?? 0;
          totals[p.player_id] = (totals[p.player_id] ?? 0) + delta;
        }

        for (const p of includedPlayers) {
          const row = rowsMap[p.player_id];
          if (!isActive[p.player_id]) {
            row.cells.push({
              penalty: null,
              totalAfter: totals[p.player_id],
              event: "dead",
            });
            continue;
          }

          const delta = scoresByPlayer.get(p.player_id) ?? 0;
          const total = totals[p.player_id];
          let event: CellEvent = "none";

          if (total >= 15) {
            event = "eliminated";
            isActive[p.player_id] = false;
          } else if (total === 14) {
            event = "pelt";
          }

          row.cells.push({ penalty: delta, totalAfter: total, event });
        }
      }
    }

    // Override winner's last non-dead cell to "winner"
    const winnerId = gameState.game.winner_player_id;
    if (winnerId && rowsMap[winnerId]) {
      const winnerRow = rowsMap[winnerId];
      for (let i = winnerRow.cells.length - 1; i >= 0; i--) {
        const cell = winnerRow.cells[i];
        if (cell.event !== "dead") {
          winnerRow.cells[i] = { ...cell, event: "winner" };
          break;
        }
      }
    }

    const rows = includedPlayers.map((p) => rowsMap[p.player_id]);
    return { rows, columns };
  }, [rounds, includedPlayers, gameState.game.winner_player_id]);

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
