import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
} from "../helpers/api";

test.describe("Buy-in", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("eliminated player buys in with correct score", async ({
    authPage,
  }) => {
    // Create tournament with 3 players
    const tournament = await createTournament("Inkoop Test", [
      "Alice",
      "Bob",
      "Charlie",
    ]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;
    const players = gameState.players;

    // Bring Alice to elimination via API
    // Round 1: Alice gets 10, Bob 5, Charlie 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points:
          p.player_name === "Alice" ? 10 : p.player_name === "Bob" ? 5 : 0,
      }))
    );
    // Round 2: Alice gets 5 (now at 15, eliminated), Bob 3 (now at 8), Charlie 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points:
          p.player_name === "Alice" ? 5 : p.player_name === "Bob" ? 3 : 0,
      }))
    );

    // Navigate to tournament page
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Alice should be eliminated
    await expect(authPage.locator(".status-out")).toBeVisible();

    // Buy-in button should be visible in the buyin-section
    const buyInBtn = authPage.locator(".buyin-section .btn-buyin").first();
    await expect(buyInBtn).toBeVisible();
    // Button text should contain Alice's name and the buy-in score (8 = Bob's score, the highest active)
    await expect(buyInBtn).toContainText("Alice");
    await expect(buyInBtn).toContainText("inkopen op 8");

    // Click buy-in
    await buyInBtn.click();

    // Alice should be active again — the buyin-section should disappear
    await expect(authPage.locator(".buyin-section")).not.toBeVisible();

    // Alice's score should now be 8 (matching Bob's score)
    // Check that Alice is no longer showing "Uit"
    await expect(authPage.locator(".status-out")).not.toBeVisible();
  });
});
