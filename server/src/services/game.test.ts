import { describe, it, expect } from "vitest";
import {
  computePot,
  computeSettlements,
  computeBalancesFromGames,
  applyPenalties,
  computeBuyIn,
  type PlayerState,
  type GameData,
} from "./game.js";

// --- Helper to create player state ---

function makePlayer(
  id: string,
  score: number,
  overrides?: Partial<PlayerState>
): PlayerState {
  return {
    player_id: id,
    total_score: score,
    is_active: true,
    buy_ins: 0,
    can_buy_in: false,
    ...overrides,
  };
}

// ==========================================
// computePot
// ==========================================

describe("computePot", () => {
  it("calculates pot with no buy-ins", () => {
    expect(computePot(2.5, 4, 0)).toBe(10);
  });

  it("calculates pot with buy-ins", () => {
    expect(computePot(2.5, 4, 2)).toBe(15);
  });

  it("calculates pot with 2 players", () => {
    expect(computePot(2.5, 2, 0)).toBe(5);
  });

  it("calculates pot with custom stake", () => {
    expect(computePot(5, 3, 1)).toBe(20);
  });

  it("returns 0 when stake is 0", () => {
    expect(computePot(0, 4, 2)).toBe(0);
  });
});

// ==========================================
// applyPenalties
// ==========================================

describe("applyPenalties", () => {
  it("adds penalty points to players", () => {
    const players = [makePlayer("a", 5), makePlayer("b", 3), makePlayer("c", 0)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 2 },
      { playerId: "b", points: 0 },
      { playerId: "c", points: 1 },
    ]);

    expect(result.players.find((p) => p.player_id === "a")!.total_score).toBe(7);
    expect(result.players.find((p) => p.player_id === "b")!.total_score).toBe(3);
    expect(result.players.find((p) => p.player_id === "c")!.total_score).toBe(1);
    expect(result.eliminated).toEqual([]);
    expect(result.gameFinished).toBe(false);
  });

  it("eliminates player reaching exactly 15", () => {
    const players = [makePlayer("a", 14), makePlayer("b", 5)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 1 },
      { playerId: "b", points: 0 },
    ]);

    const playerA = result.players.find((p) => p.player_id === "a")!;
    expect(playerA.total_score).toBe(15);
    expect(playerA.is_active).toBe(false);
    expect(playerA.can_buy_in).toBe(true);
    expect(result.eliminated).toEqual(["a"]);
  });

  it("eliminates player exceeding 15", () => {
    const players = [makePlayer("a", 12), makePlayer("b", 5)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 5 },
      { playerId: "b", points: 0 },
    ]);

    const playerA = result.players.find((p) => p.player_id === "a")!;
    expect(playerA.total_score).toBe(17);
    expect(playerA.is_active).toBe(false);
    expect(playerA.can_buy_in).toBe(true);
    expect(result.eliminated).toEqual(["a"]);
  });

  it("does not eliminate player at 14 (pelt)", () => {
    const players = [makePlayer("a", 12), makePlayer("b", 5)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 2 },
      { playerId: "b", points: 0 },
    ]);

    const playerA = result.players.find((p) => p.player_id === "a")!;
    expect(playerA.total_score).toBe(14);
    expect(playerA.is_active).toBe(true);
    expect(result.eliminated).toEqual([]);
  });

  it("game finishes when all players eliminated simultaneously", () => {
    const players = [makePlayer("a", 14), makePlayer("b", 14)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 1 },
      { playerId: "b", points: 2 },
    ]);

    expect(result.eliminated).toEqual(["a", "b"]);
    expect(result.gameFinished).toBe(true);
  });

  it("game does not finish when 1 player remains active", () => {
    const players = [makePlayer("a", 14), makePlayer("b", 5), makePlayer("c", 14)];
    const result = applyPenalties(players, [
      { playerId: "a", points: 1 },
      { playerId: "b", points: 0 },
      { playerId: "c", points: 3 },
    ]);

    expect(result.eliminated).toEqual(["a", "c"]);
    expect(result.gameFinished).toBe(false);
    expect(result.players.find((p) => p.player_id === "b")!.is_active).toBe(true);
  });

  it("resets can_buy_in for all players before processing", () => {
    const players = [
      makePlayer("a", 5, { can_buy_in: true }),
      makePlayer("b", 3),
    ];
    const result = applyPenalties(players, [
      { playerId: "a", points: 0 },
      { playerId: "b", points: 0 },
    ]);

    expect(result.players.find((p) => p.player_id === "a")!.can_buy_in).toBe(false);
  });

  it("does not modify inactive players' scores", () => {
    const players = [
      makePlayer("a", 16, { is_active: false }),
      makePlayer("b", 5),
    ];
    const result = applyPenalties(players, [
      { playerId: "a", points: 3 },
      { playerId: "b", points: 0 },
    ]);

    expect(result.players.find((p) => p.player_id === "a")!.total_score).toBe(16);
  });

  it("does not mutate the original players array", () => {
    const players = [makePlayer("a", 10), makePlayer("b", 5)];
    const original = JSON.parse(JSON.stringify(players));
    applyPenalties(players, [
      { playerId: "a", points: 5 },
      { playerId: "b", points: 0 },
    ]);

    expect(players).toEqual(original);
  });
});

// ==========================================
// computeBuyIn
// ==========================================

describe("computeBuyIn", () => {
  it("sets player score to highest active player's score", () => {
    const players = [
      makePlayer("a", 16, { is_active: false, can_buy_in: true }),
      makePlayer("b", 10),
      makePlayer("c", 8),
    ];
    const result = computeBuyIn(players, "a");

    const playerA = result.players.find((p) => p.player_id === "a")!;
    expect(playerA.total_score).toBe(10);
    expect(playerA.is_active).toBe(true);
    expect(playerA.can_buy_in).toBe(false);
    expect(playerA.buy_ins).toBe(1);
    expect(result.buyInScore).toBe(10);
    expect(result.adjustment).toBe(-6); // 10 - 16
  });

  it("increments buy_ins counter correctly for multiple buy-ins", () => {
    const players = [
      makePlayer("a", 16, { is_active: false, can_buy_in: true, buy_ins: 1 }),
      makePlayer("b", 10),
      makePlayer("c", 8),
    ];
    const result = computeBuyIn(players, "a");

    expect(result.players.find((p) => p.player_id === "a")!.buy_ins).toBe(2);
  });

  it("throws when player is still active", () => {
    const players = [makePlayer("a", 10), makePlayer("b", 5)];

    expect(() => computeBuyIn(players, "a")).toThrow("Player is still active");
  });

  it("throws when buy-in not allowed", () => {
    const players = [
      makePlayer("a", 16, { is_active: false, can_buy_in: false }),
      makePlayer("b", 10),
      makePlayer("c", 8),
    ];

    expect(() => computeBuyIn(players, "a")).toThrow("Buy-in not allowed");
  });

  it("throws when fewer than 2 active players", () => {
    const players = [
      makePlayer("a", 16, { is_active: false, can_buy_in: true }),
      makePlayer("b", 10),
      makePlayer("c", 16, { is_active: false }),
    ];

    expect(() => computeBuyIn(players, "a")).toThrow("Not enough active players");
  });

  it("throws when player not found", () => {
    const players = [makePlayer("a", 10), makePlayer("b", 5)];

    expect(() => computeBuyIn(players, "z")).toThrow("Player not found");
  });

  it("does not mutate the original players array", () => {
    const players = [
      makePlayer("a", 16, { is_active: false, can_buy_in: true }),
      makePlayer("b", 10),
      makePlayer("c", 8),
    ];
    const original = JSON.parse(JSON.stringify(players));
    computeBuyIn(players, "a");

    expect(players).toEqual(original);
  });
});

// ==========================================
// computeBalancesFromGames
// ==========================================

describe("computeBalancesFromGames", () => {
  const allPlayers = [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Charlie" },
    { id: "d", name: "Dan" },
  ];

  it("calculates correct balances for a single game", () => {
    const games: GameData[] = [
      {
        winner_player_id: "a",
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 0 },
          { player_id: "b", buy_ins: 0 },
          { player_id: "c", buy_ins: 0 },
          { player_id: "d", buy_ins: 0 },
        ],
      },
    ];

    const balances = computeBalancesFromGames(allPlayers, games);
    // Pot = 2.5 * 4 = 10. Winner gets 10 - 2.5 = 7.5. Losers pay 2.5 each.
    expect(balances.find((b) => b.player_id === "a")!.balance).toBe(7.5);
    expect(balances.find((b) => b.player_id === "b")!.balance).toBe(-2.5);
    expect(balances.find((b) => b.player_id === "c")!.balance).toBe(-2.5);
    expect(balances.find((b) => b.player_id === "d")!.balance).toBe(-2.5);
  });

  it("balances sum to zero", () => {
    const games: GameData[] = [
      {
        winner_player_id: "a",
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 1 },
          { player_id: "b", buy_ins: 0 },
          { player_id: "c", buy_ins: 1 },
          { player_id: "d", buy_ins: 0 },
        ],
      },
    ];

    const balances = computeBalancesFromGames(allPlayers, games);
    const total = balances.reduce((sum, b) => sum + b.balance, 0);
    expect(total).toBeCloseTo(0);
  });

  it("accounts for buy-ins increasing pot and cost", () => {
    const games: GameData[] = [
      {
        winner_player_id: "a",
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 1 }, // cost = 2.5 * 2 = 5
          { player_id: "b", buy_ins: 1 }, // cost = 2.5 * 2 = 5
          { player_id: "c", buy_ins: 0 }, // cost = 2.5
          { player_id: "d", buy_ins: 0 }, // cost = 2.5
        ],
      },
    ];

    const balances = computeBalancesFromGames(allPlayers, games);
    // Pot = 2.5 * (4 + 2) = 15
    // Alice wins: 15 - 5 = +10
    expect(balances.find((b) => b.player_id === "a")!.balance).toBe(10);
    expect(balances.find((b) => b.player_id === "b")!.balance).toBe(-5);
    expect(balances.find((b) => b.player_id === "c")!.balance).toBe(-2.5);
    expect(balances.find((b) => b.player_id === "d")!.balance).toBe(-2.5);
  });

  it("accumulates balances across multiple games", () => {
    const games: GameData[] = [
      {
        winner_player_id: "a",
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 0 },
          { player_id: "b", buy_ins: 0 },
          { player_id: "c", buy_ins: 0 },
          { player_id: "d", buy_ins: 0 },
        ],
      },
      {
        winner_player_id: "b",
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 0 },
          { player_id: "b", buy_ins: 0 },
          { player_id: "c", buy_ins: 0 },
          { player_id: "d", buy_ins: 0 },
        ],
      },
    ];

    const balances = computeBalancesFromGames(allPlayers, games);
    // Game 1: Alice +7.5, others -2.5
    // Game 2: Bob +7.5, others -2.5
    expect(balances.find((b) => b.player_id === "a")!.balance).toBe(5); // 7.5 - 2.5
    expect(balances.find((b) => b.player_id === "b")!.balance).toBe(5); // -2.5 + 7.5
    expect(balances.find((b) => b.player_id === "c")!.balance).toBe(-5); // -2.5 - 2.5
    expect(balances.find((b) => b.player_id === "d")!.balance).toBe(-5); // -2.5 - 2.5
  });

  it("returns zero balances when no games played", () => {
    const balances = computeBalancesFromGames(allPlayers, []);

    for (const b of balances) {
      expect(b.balance).toBe(0);
    }
  });

  it("handles game with no winner (all eliminated simultaneously)", () => {
    const games: GameData[] = [
      {
        winner_player_id: null,
        stake_per_game: 2.5,
        players: [
          { player_id: "a", buy_ins: 0 },
          { player_id: "b", buy_ins: 0 },
          { player_id: "c", buy_ins: 0 },
        ],
      },
    ];

    const balances = computeBalancesFromGames(allPlayers, games);
    // No winner — everyone just loses their cost
    expect(balances.find((b) => b.player_id === "a")!.balance).toBe(-2.5);
    expect(balances.find((b) => b.player_id === "b")!.balance).toBe(-2.5);
    expect(balances.find((b) => b.player_id === "c")!.balance).toBe(-2.5);
    // Dan wasn't in the game
    expect(balances.find((b) => b.player_id === "d")!.balance).toBe(0);
  });
});

// ==========================================
// computeSettlements
// ==========================================

describe("computeSettlements", () => {
  it("creates correct settlements for simple case", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 7.5 },
      { player_id: "b", player_name: "Bob", balance: -2.5 },
      { player_id: "c", player_name: "Charlie", balance: -2.5 },
      { player_id: "d", player_name: "Dan", balance: -2.5 },
    ];

    const settlements = computeSettlements(balances);

    // All debtors pay Alice
    expect(settlements.length).toBe(3);
    for (const s of settlements) {
      expect(s.to).toBe("a");
      expect(s.amount).toBe(2.5);
    }
  });

  it("total transfers from debtors equals total to creditors", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 10 },
      { player_id: "b", player_name: "Bob", balance: -5 },
      { player_id: "c", player_name: "Charlie", balance: 5 },
      { player_id: "d", player_name: "Dan", balance: -10 },
    ];

    const settlements = computeSettlements(balances);
    const totalFrom = settlements.reduce((s, t) => s + t.amount, 0);

    // Total transferred should equal total owed (15)
    expect(totalFrom).toBeCloseTo(15);
  });

  it("returns empty array when all balances are zero", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 0 },
      { player_id: "b", player_name: "Bob", balance: 0 },
    ];

    expect(computeSettlements(balances)).toEqual([]);
  });

  it("handles single debtor and single creditor", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 5 },
      { player_id: "b", player_name: "Bob", balance: -5 },
    ];

    const settlements = computeSettlements(balances);
    expect(settlements.length).toBe(1);
    expect(settlements[0]).toEqual({
      from: "b",
      from_name: "Bob",
      to: "a",
      to_name: "Alice",
      amount: 5,
    });
  });

  it("splits debt across multiple creditors", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 5 },
      { player_id: "b", player_name: "Bob", balance: 5 },
      { player_id: "c", player_name: "Charlie", balance: -10 },
    ];

    const settlements = computeSettlements(balances);

    // Charlie owes a total of 10
    const charliePayments = settlements.filter((s) => s.from === "c");
    const totalPaid = charliePayments.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(10);
  });

  it("rounds amounts to 2 decimal places", () => {
    const balances = [
      { player_id: "a", player_name: "Alice", balance: 3.333 },
      { player_id: "b", player_name: "Bob", balance: -3.333 },
    ];

    const settlements = computeSettlements(balances);
    expect(settlements[0].amount).toBe(3.33);
  });
});
