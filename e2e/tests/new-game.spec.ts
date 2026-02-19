import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
  finishGame,
} from "../helpers/api";

test.describe("New Game", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("start new game after finishing one, scores reset", async ({
    authPage,
  }) => {
    // Create tournament
    const tournament = await createTournament("Nieuw Spel Test", [
      "Alice",
      "Bob",
    ]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;
    const players = gameState.players;

    // Eliminate Alice via API to finish the game
    // Round 1: Alice 10, Bob 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 10 : 0,
      }))
    );
    // Round 2: Alice 5 (now 15, eliminated), Bob 0 — game finishes automatically
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 5 : 0,
      }))
    );
    // Finish the game explicitly
    await finishGame(gameId);

    // Navigate to tournament page — should show celebration overlay
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".celebration-overlay")).toBeVisible();

    // Click "Nieuw spel"
    await authPage.click("text=Nieuw spel");

    // Celebration should disappear
    await expect(authPage.locator(".celebration-overlay")).not.toBeVisible();

    // Scoreboard should be visible with fresh game
    await expect(authPage.locator(".scoreboard")).toBeVisible();

    // Scores should be reset to 0
    const currentScores = authPage.locator(".score-row-current td");
    await expect(currentScores.nth(0)).toHaveText("0");
    await expect(currentScores.nth(1)).toHaveText("0");

    // Penalty buttons should be available
    const penaltyBtns = authPage.locator(".penalty-btn");
    await expect(penaltyBtns).toHaveCount(2);
  });
});
