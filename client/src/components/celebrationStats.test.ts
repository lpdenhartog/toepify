import { describe, expect, it } from "vitest";
import type { GamePlayer, Round } from "../api/game";
import { getMostPenaltyStat, getNormalRounds } from "./celebrationStats";

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

function makeRound(
  roundNumber: number,
  scores: Record<string, number>,
  roundType?: Round["round_type"]
): Round {
  return {
    round_number: roundNumber,
    round_type: roundType,
    scores: Object.entries(scores).map(([player_id, penalty_points]) => ({
      player_id,
      penalty_points,
    })),
  };
}

const players = [
  makePlayer("a", "Alice"),
  makePlayer("b", "Bob"),
  makePlayer("c", "Charlie"),
];

describe("celebration stats", () => {
  it("counts only normal rounds", () => {
    const rounds = [
      makeRound(1, { a: 2, b: 0 }, "normal"),
      makeRound(2, { a: -3 }, "buy_in"),
      makeRound(3, { a: 1, b: 4 }, "normal"),
    ];

    expect(getNormalRounds(rounds)).toHaveLength(2);
  });

  it("falls back to negative scores to identify legacy buy-in rounds", () => {
    const rounds = [
      makeRound(1, { a: 2, b: 0 }),
      makeRound(2, { a: -3 }),
    ];

    expect(getNormalRounds(rounds)).toHaveLength(1);
  });

  it("returns all players tied for most points in one normal round", () => {
    const rounds = [
      makeRound(1, { a: 4, b: 2, c: 0 }, "normal"),
      makeRound(2, { a: -2 }, "buy_in"),
      makeRound(3, { a: 1, b: 4, c: 4 }, "normal"),
    ];

    expect(getMostPenaltyStat(rounds, players)).toEqual({
      points: 4,
      playerNames: ["Alice", "Bob", "Charlie"],
    });
  });
});
