import { describe, it, expect } from "vitest";
import { buildDramaGridData } from "./buildDramaGridData";
import type { GamePlayer, Round } from "../api/game";

// --- Helpers ---

function makePlayer(id: string, name: string): GamePlayer {
  return {
    player_id: id,
    player_name: name,
    is_active: true,
    buy_ins: 0,
    total_score: 0,
    can_buy_in: false,
  };
}

function makeRound(roundNumber: number, scores: Record<string, number>): Round {
  return {
    round_number: roundNumber,
    scores: Object.entries(scores).map(([player_id, penalty_points]) => ({
      player_id,
      penalty_points,
    })),
  };
}

const alice = makePlayer("a", "Alice");
const bob = makePlayer("b", "Bob");

// ==========================================
// Basic accumulation
// ==========================================

describe("basic accumulation", () => {
  it("produces one column per normal round", () => {
    const rounds = [makeRound(1, { a: 2, b: 3 }), makeRound(2, { a: 1, b: 0 })];
    const { columns } = buildDramaGridData([alice, bob], rounds, null);
    expect(columns).toHaveLength(2);
  });

  it("accumulates running totals correctly", () => {
    const rounds = [makeRound(1, { a: 2, b: 3 }), makeRound(2, { a: 4, b: 1 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].totalAfter).toBe(2);
    expect(a.cells[1].totalAfter).toBe(6);
  });

  it("stores the per-round penalty on each cell", () => {
    const rounds = [makeRound(1, { a: 3, b: 1 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].penalty).toBe(3);
  });

  it("assigns 'none' event for an unremarkable round", () => {
    const rounds = [makeRound(1, { a: 2, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].event).toBe("none");
  });
});

// ==========================================
// Pelt (score reaches exactly 14)
// ==========================================

describe("pelt", () => {
  it("marks event as 'pelt' when total reaches 14", () => {
    const rounds = [makeRound(1, { a: 14, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].event).toBe("pelt");
  });

  it("does not eliminate the player on pelt — they remain active next round", () => {
    const rounds = [makeRound(1, { a: 14, b: 0 }), makeRound(2, { a: 0, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[1].event).not.toBe("dead");
    expect(a.cells[1].event).not.toBe("eliminated");
  });
});

// ==========================================
// Elimination (score reaches ≥15)
// ==========================================

describe("elimination", () => {
  it("marks event as 'eliminated' when total reaches 15", () => {
    const rounds = [makeRound(1, { a: 15, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].event).toBe("eliminated");
  });

  it("marks event as 'eliminated' when total exceeds 15", () => {
    const rounds = [makeRound(1, { a: 10, b: 0 }), makeRound(2, { a: 8, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[1].event).toBe("eliminated");
  });

  it("produces 'dead' cells for eliminated player in subsequent rounds", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 0 }),
      makeRound(2, { a: 0, b: 2 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[1].event).toBe("dead");
    expect(a.cells[1].penalty).toBeNull();
  });
});

// ==========================================
// Buy-in — single player
// ==========================================

describe("buy-in (single player)", () => {
  it("does not create a column for the buy-in round", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),           // buy-in round: Alice resets
      makeRound(3, { a: 2, b: 1 }),
    ];
    const { columns } = buildDramaGridData([alice, bob], rounds, null);
    expect(columns).toHaveLength(2);     // rounds 1 and 3 only
  });

  it("marks the elimination cell as 'buyin' instead of 'eliminated'", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].event).toBe("buyin");
  });

  it("does not show a skull (eliminated) on a buy-in cell", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].event).not.toBe("eliminated");
  });

  it("stores the post-buy-in score in buyInTotal", () => {
    // Alice hits 15, buys in with delta -3 → post-buy-in total = 12
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].buyInTotal).toBe(12);
  });

  it("keeps the elimination round's totalAfter (pre-buy-in) on the cell itself", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[0].totalAfter).toBe(15);
  });

  it("player is active again in the round following buy-in", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
      makeRound(3, { a: 2, b: 1 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[1].event).not.toBe("dead");
  });
});

// ==========================================
// Buy-in — two players buying in across
// separate consecutive buy-in rounds
// ==========================================

describe("buy-in (two players, separate rounds)", () => {
  const charlie = makePlayer("c", "Charlie");

  it("neither player shows a skull", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 15, c: 2 }),
      makeRound(2, { a: -3 }),           // Alice buys in
      makeRound(3, { b: -4 }),           // Bob buys in
      makeRound(4, { a: 1, b: 1, c: 1 }),
    ];
    const { rows } = buildDramaGridData([alice, bob, charlie], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    const b = rows.find((r) => r.playerId === "b")!;
    expect(a.cells[0].event).toBe("buyin");
    expect(b.cells[0].event).toBe("buyin");
  });

  it("only creates columns for normal rounds", () => {
    const rounds = [
      makeRound(1, { a: 15, b: 15, c: 2 }),
      makeRound(2, { a: -3 }),
      makeRound(3, { b: -4 }),
      makeRound(4, { a: 1, b: 1, c: 1 }),
    ];
    const { columns } = buildDramaGridData([alice, bob, charlie], rounds, null);
    expect(columns).toHaveLength(2);     // rounds 1 and 4 only
  });

  it("bob shows 'dead' on round 1 cell before his own buy-in — not applied yet", () => {
    // Bob is eliminated in round 1. Alice buys in (round 2). Bob then buys in (round 3).
    // After round 1 (the only normal pre-buy-in round), Bob's cell should end up as "buyin"
    // because his buy-in (round 3) eventually retroactively updates it.
    const rounds = [
      makeRound(1, { a: 15, b: 15, c: 2 }),
      makeRound(2, { a: -3 }),
      makeRound(3, { b: -4 }),
    ];
    const { rows } = buildDramaGridData([alice, bob, charlie], rounds, null);
    const b = rows.find((r) => r.playerId === "b")!;
    expect(b.cells[0].event).toBe("buyin");
  });

  it("stores correct buyInTotal for each player", () => {
    // Alice: 15 - 3 = 12. Bob: 15 - 4 = 11.
    const rounds = [
      makeRound(1, { a: 15, b: 15, c: 2 }),
      makeRound(2, { a: -3 }),
      makeRound(3, { b: -4 }),
    ];
    const { rows } = buildDramaGridData([alice, bob, charlie], rounds, null);
    const a = rows.find((r) => r.playerId === "a")!;
    const b = rows.find((r) => r.playerId === "b")!;
    expect(a.cells[0].buyInTotal).toBe(12);
    expect(b.cells[0].buyInTotal).toBe(11);
  });
});

// ==========================================
// Winner marker
// ==========================================

describe("winner", () => {
  it("marks the winner's last cell as 'winner'", () => {
    const rounds = [makeRound(1, { a: 2, b: 3 }), makeRound(2, { a: 1, b: 0 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, "a");
    const a = rows.find((r) => r.playerId === "a")!;
    expect(a.cells[a.cells.length - 1].event).toBe("winner");
  });

  it("does not mark the loser as winner", () => {
    const rounds = [makeRound(1, { a: 2, b: 3 })];
    const { rows } = buildDramaGridData([alice, bob], rounds, "a");
    const b = rows.find((r) => r.playerId === "b")!;
    expect(b.cells[b.cells.length - 1].event).not.toBe("winner");
  });

  it("winner marker goes on the buyin cell when winner bought back in last", () => {
    // Alice wins, and her last event was a buy-in
    const rounds = [
      makeRound(1, { a: 15, b: 3 }),
      makeRound(2, { a: -3 }),
    ];
    const { rows } = buildDramaGridData([alice, bob], rounds, "a");
    const a = rows.find((r) => r.playerId === "a")!;
    // The buy-in overwrites the cell, and then winner should overwrite that too
    expect(a.cells[0].event).toBe("winner");
  });
});
