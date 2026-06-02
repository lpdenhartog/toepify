import { test, expect } from "@playwright/test";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
  finishGame,
  startNewGame,
} from "../helpers/api";

test.describe("Viewer and writer mode", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("opens in viewer mode and toggles to writer controls", async ({
    page,
  }) => {
    const tournament = await createTournament("Mode Test", ["Alice", "Bob"]);

    await page.goto(`/t/${tournament.id}`);
    await expect(page.locator(".scoreboard")).toBeVisible();

    await expect(page.getByLabel("Schakel naar schrijver modus")).toBeVisible();
    await expect(page.locator(".penalty-btn")).toHaveCount(0);
    await expect(page.getByLabel("Ronde afsluiten")).not.toBeVisible();

    await page.getByLabel("Schakel naar schrijver modus").click();

    await expect(page.getByLabel("Schakel naar viewer modus")).toBeVisible();
    await expect(page.locator(".penalty-btn")).toHaveCount(2);
    await expect(page.getByLabel("Ronde afsluiten")).toBeVisible();
  });

  test("viewer polls committed score updates", async ({ browser }) => {
    const tournament = await createTournament("Polling Test", [
      "Alice",
      "Bob",
    ]);

    const context1 = await browser.newContext({
      storageState: "e2e/.auth-state.json",
    });
    const context2 = await browser.newContext({
      storageState: "e2e/.auth-state.json",
    });

    const writerPage = await context1.newPage();
    const viewerPage = await context2.newPage();

    await writerPage.goto(`/t/${tournament.id}`);
    await viewerPage.goto(`/t/${tournament.id}`);
    await expect(writerPage.locator(".scoreboard")).toBeVisible();
    await expect(viewerPage.locator(".scoreboard")).toBeVisible();

    await writerPage.getByLabel("Schakel naar schrijver modus").click();

    const penaltyBtns = writerPage.locator(".penalty-btn");
    for (let i = 0; i < 5; i++) {
      await penaltyBtns.nth(0).click();
    }
    await writerPage.getByLabel("Ronde afsluiten").click();

    const writerScores = writerPage.locator(".score-row-current td");
    await expect(writerScores.nth(0)).toHaveText("5");
    await expect(writerScores.nth(1)).toHaveText("0");

    const viewerScores = viewerPage.locator(".score-row-current td");
    await expect(viewerScores.nth(0)).toHaveText("5", { timeout: 15_000 });
    await expect(viewerScores.nth(1)).toHaveText("0");

    await context1.close();
    await context2.close();
  });

  test("viewer polling detects a newly started game", async ({ page }) => {
    const tournament = await createTournament("New Game Polling Test", [
      "Alice",
      "Bob",
    ]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;

    await finishRound(
      gameId,
      gameState.players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 15 : 0,
      }))
    );
    await finishGame(gameId);

    await page.goto(`/t/${tournament.id}`);
    await expect(page.locator(".celebration-overlay")).toBeVisible();

    await startNewGame(tournament.id);

    await expect(page.locator(".celebration-overlay")).not.toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".score-row-current td").nth(0)).toHaveText("0");
    await expect(page.locator(".score-row-current td").nth(1)).toHaveText("0");
    await expect(page.locator(".penalty-btn")).toHaveCount(0);
  });
});
