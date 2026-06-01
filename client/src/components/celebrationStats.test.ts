import { describe, expect, it } from "vitest";
import type { GamePlayer, Round } from "../api/game";
import {
  formatMostPenaltyStat,
  getMostPenaltyStat,
  getNormalRounds,
  getSloperStat,
  getSnurkerStat,
} from "./celebrationStats";

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

  it("formats most points with player names before the point total", () => {
    expect(
      formatMostPenaltyStat({
        points: 4,
        playerNames: ["Alice", "Bob", "Charlie"],
      })
    ).toBe("Alice, Bob, Charlie (4)");
  });

  it("formats missing most points as zero", () => {
    expect(formatMostPenaltyStat({ points: 0, playerNames: [] })).toBe("0");
  });
});

describe("sloper", () => {
  it("awards damage to the zero-point player and ignores one-point penalties", () => {
    const rounds = [
      makeRound(1, { a: 0, b: 2, c: 1 }, "normal"),
      makeRound(2, { a: 1, b: 0, c: 3 }, "normal"),
      makeRound(3, { a: -2 }, "buy_in"),
    ];

    expect(getSloperStat(rounds, players)).toEqual({
      points: 3,
      playerNames: ["Bob"],
    });
  });

  it("returns all players tied for most damage", () => {
    const rounds = [
      makeRound(1, { a: 0, b: 2, c: 1 }, "normal"),
      makeRound(2, { a: 1, b: 0, c: 2 }, "normal"),
    ];

    expect(getSloperStat(rounds, players)).toEqual({
      points: 2,
      playerNames: ["Alice", "Bob"],
    });
  });
});

describe("snurker", () => {
  it("returns the player with exactly one point in the most normal rounds", () => {
    const rounds = [
      makeRound(1, { a: 1, b: 0, c: 2 }, "normal"),
      makeRound(2, { a: 1, b: 2, c: 0 }, "normal"),
      makeRound(3, { a: -2 }, "buy_in"),
    ];

    expect(getSnurkerStat(rounds, players)).toEqual({
      rounds: 2,
      players: [
        { playerName: "Alice", matchingRounds: 2, playedRounds: 2 },
      ],
    });
  });

  it("returns all players tied for most one-point rounds", () => {
    const rounds = [
      makeRound(1, { a: 1, b: 1, c: 0 }, "normal"),
      makeRound(2, { a: 0, b: 2, c: 1 }, "normal"),
    ];

    expect(getSnurkerStat(rounds, players)).toEqual({
      rounds: 1,
      players: [
        { playerName: "Alice", matchingRounds: 1, playedRounds: 2 },
        { playerName: "Bob", matchingRounds: 1, playedRounds: 2 },
        { playerName: "Charlie", matchingRounds: 1, playedRounds: 2 },
      ],
    });
  });

  it("counts played rounds per player from normal score entries only", () => {
    const rounds = [
      makeRound(1, { a: 1, b: 0 }, "normal"),
      makeRound(2, { a: 1, b: 1 }, "normal"),
      makeRound(3, { a: -2 }, "buy_in"),
      makeRound(4, { b: 1 }, "normal"),
    ];

    expect(getSnurkerStat(rounds, players)).toEqual({
      rounds: 2,
      players: [
        { playerName: "Alice", matchingRounds: 2, playedRounds: 2 },
        { playerName: "Bob", matchingRounds: 2, playedRounds: 3 },
      ],
    });
  });
});
