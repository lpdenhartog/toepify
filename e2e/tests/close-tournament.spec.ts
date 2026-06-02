import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
  finishGame,
} from "../helpers/api";

test.describe("Close Tournament", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("close tournament shows settlement view", async ({ authPage }) => {
    // Create tournament
    const tournament = await createTournament("Afsluiting Test", [
      "Alice",
      "Bob",
    ]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;
    const players = gameState.players;

    // Play and finish a game via API
    // Round 1: Alice 10, Bob 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 10 : 0,
      }))
    );
    // Round 2: Alice 5 (eliminated), Bob 0
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 5 : 0,
      }))
    );
    await finishGame(gameId);

    // Navigate to tournament — should show celebration
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".celebration-overlay")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Accept the confirmation dialog when closing tournament
    authPage.on("dialog", (d) => d.accept());

    // Click "Toernooi afsluiten" (creator-only button in celebration)
    await authPage.click("text=Toernooi afsluiten");

    // Should show the closed tournament view
    await expect(authPage.locator(".tournament-closed")).toBeVisible({
      timeout: 5000,
    });
    await expect(authPage.locator(".tournament-closed-badge")).toHaveText(
      "Afgesloten"
    );

    // Should show settlement table
    await expect(authPage.locator(".settlement-table")).toBeVisible();

    // Should show balances
    await expect(authPage.locator(".player-summary-table")).toBeVisible();
  });
});
