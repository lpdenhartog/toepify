import { describe, expect, it } from "vitest";
import type { GameState } from "../api/game";
import { predictRound, type RoundSubmission } from "./optimisticRound";

function state(): GameState {
  return {
    tournament: { id: "t", name: "Test", stake_per_game: 2.5, created_by: null, status: "active" },
    game: { id: "g", status: "active", winner_player_id: null, revision: 4 },
    players: ["a", "b", "c"].map((id) => ({ player_id: id, player_name: id, is_active: true, buy_ins: 0, total_score: 0, can_buy_in: false })),
    rounds: [], pot: 7.5,
    balances: ["a", "b", "c"].map((id) => ({ player_id: id, player_name: id, balance: 10 })),
  };
}
function submission(points = [1, 1, 0]): RoundSubmission {
  return { requestId: "request", expectedRevision: 4, autoFinish: true, excludedPlayerIds: [], penalties: points.map((points, i) => ({ playerId: ["a", "b", "c"][i], points })) };
}

describe("optimistic round", () => {
  it("adds history and scores without mutating the authoritative snapshot", () => {
    const before = state();
    const result = predictRound(before, submission());
    expect(result.players.map((p) => p.total_score)).toEqual([1, 1, 0]);
    expect(result.rounds[0]).toMatchObject({ round_number: 1, round_type: "normal" });
    expect(result.game.status).toBe("active");
    expect(result.balances).toEqual(before.balances);
    expect(before.players[0].total_score).toBe(0);
    expect(before.rounds).toEqual([]);
  });
  it("keeps 14 active and eliminates at 15, clearing old buy-in eligibility", () => {
    const before = state();
    before.players[0].total_score = 13;
    before.players[1].total_score = 14;
    before.players[2].can_buy_in = true;
    const result = predictRound(before, submission());
    expect(result.players[0]).toMatchObject({ total_score: 14, is_active: true, can_buy_in: false });
    expect(result.players[1]).toMatchObject({ total_score: 15, is_active: false, can_buy_in: true });
    expect(result.players[2].can_buy_in).toBe(false);
  });
  it("predicts a winning round and balances including prior buy-ins", () => {
    const before = state();
    before.players[0].buy_ins = 1;
    const result = predictRound(before, submission([15, 15, 0]));
    expect(result.game).toMatchObject({ status: "finished", winner_player_id: "c" });
    expect(result.pot).toBe(10);
    expect(result.balances.map((p) => p.balance)).toEqual([5, 7.5, 17.5]);
  });
  it("removes sat-out players and adjusts the pot without charging them", () => {
    const before = state();
    const input = submission([15, 0, 0]);
    input.excludedPlayerIds = ["c"];
    input.penalties.pop();
    const result = predictRound(before, input);
    expect(result.players.map((p) => p.player_id)).toEqual(["a", "b"]);
    expect(result.pot).toBe(5);
    expect(result.balances.map((p) => p.balance)).toEqual([7.5, 12.5, 10]);
  });
  it("handles no remaining players and continues numbering after buy-in rounds", () => {
    const before = state();
    before.rounds = [{ round_number: 7, round_type: "buy_in", scores: [] }];
    const result = predictRound(before, submission([15, 15, 15]));
    expect(result.game).toMatchObject({ status: "finished", winner_player_id: null });
    expect(result.rounds.at(-1)?.round_number).toBe(8);
    expect(result.balances.map((p) => p.balance)).toEqual([7.5, 7.5, 7.5]);
  });
});
