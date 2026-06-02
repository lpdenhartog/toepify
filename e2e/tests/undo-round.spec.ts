import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
} from "../helpers/api";

test.describe("Undo Round", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("undo last round reverts scores", async ({ authPage }) => {
    // Create tournament with 2 players
    const tournament = await createTournament("Undo Test", ["Alice", "Bob"]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;
    const players = gameState.players;

    // Play a round via API: Alice 5, Bob 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 5 : 0,
      }))
    );

    // Play another round via API: Alice 3, Bob 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 3 : 0,
      }))
    );

    // Navigate to tournament page — Alice at 8, Bob at 0
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Current scores should show 8 and 0
    const currentScores = authPage.locator(".score-row-current td");
    await expect(currentScores.nth(0)).toHaveText("8");
    await expect(currentScores.nth(1)).toHaveText("0");

    // Click undo button (accepting the confirm dialog)
    authPage.on("dialog", (d) => d.accept());
    await authPage.click('[aria-label="Laatste ronde ongedaan maken"]');

    // After undo, scores should revert to round 1: Alice 5, Bob 0
    await expect(currentScores.nth(0)).toHaveText("5");
    await expect(currentScores.nth(1)).toHaveText("0");
  });
});
