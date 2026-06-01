import type { GamePlayer, Round } from "../api/game";
import { isBuyInRound } from "./celebrationStats";

export type CellEvent = "none" | "pelt" | "eliminated" | "buyin" | "dead" | "winner";

export interface GridCell {
  penalty: number | null;
  totalAfter: number;
  buyInTotal?: number;
  event: CellEvent;
}

export interface GridRow {
  playerId: string;
  playerName: string;
  cells: GridCell[];
}

export interface GridColumn {
  roundNumber: number;
}

export interface DramaGridData {
  rows: GridRow[];
  columns: GridColumn[];
}

export function buildDramaGridData(
  players: GamePlayer[],
  rounds: Round[],
  winnerPlayerId: string | null
): DramaGridData {
  const orderedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  const totals: Record<string, number> = {};
  const isActive: Record<string, boolean> = {};

  for (const p of players) {
    totals[p.player_id] = 0;
    isActive[p.player_id] = true;
  }

  const rowsMap: Record<string, GridRow> = {};
  for (const p of players) {
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
    const isBuyIn = isBuyInRound(round);

    if (isBuyIn) {
      // Don't create a column. Retroactively mark the buying-in player's last
      // non-dead cell with "buyin" and update their running total.
      for (const p of players) {
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

      for (const p of players) {
        const delta = scoresByPlayer.get(p.player_id) ?? 0;
        totals[p.player_id] = (totals[p.player_id] ?? 0) + delta;
      }

      for (const p of players) {
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
  if (winnerPlayerId && rowsMap[winnerPlayerId]) {
    const winnerRow = rowsMap[winnerPlayerId];
    for (let i = winnerRow.cells.length - 1; i >= 0; i--) {
      const cell = winnerRow.cells[i];
      if (cell.event !== "dead") {
        winnerRow.cells[i] = { ...cell, event: "winner" };
        break;
      }
    }
  }

  const rows = players.map((p) => rowsMap[p.player_id]);
  return { rows, columns };
}
