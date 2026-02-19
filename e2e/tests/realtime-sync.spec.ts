import { test, expect } from "@playwright/test";
import { resetDb, createTournament, getLatestGame } from "../helpers/api";

test.describe("Realtime Sync", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("two browser contexts see the same game state updates", async ({
    browser,
  }) => {
    // Create tournament via API
    const tournament = await createTournament("Realtime Test", [
      "Alice",
      "Bob",
    ]);

    // Create two separate browser contexts (both authenticated via storageState)
    const context1 = await browser.newContext({
      storageState: "e2e/.auth-state.json",
    });
    const context2 = await browser.newContext({
      storageState: "e2e/.auth-state.json",
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both navigate to the same tournament
    await page1.goto(`/t/${tournament.id}`);
    await page2.goto(`/t/${tournament.id}`);

    // Both should see the scoreboard
    await expect(page1.locator(".scoreboard")).toBeVisible();
    await expect(page2.locator(".scoreboard")).toBeVisible();

    // Page 1 enters penalties and finishes a round
    const penaltyBtns = page1.locator(".penalty-btn");
    // Alice gets 5 points, Bob gets 0
    for (let i = 0; i < 5; i++) {
      await penaltyBtns.nth(0).click();
    }
    await page1.click('[aria-label="Ronde afsluiten"]');

    // Page 1 should see updated scores
    const page1Scores = page1.locator(".score-row-current td");
    await expect(page1Scores.nth(0)).toHaveText("5");
    await expect(page1Scores.nth(1)).toHaveText("0");

    // Page 2 should see the same updated scores via WebSocket
    const page2Scores = page2.locator(".score-row-current td");
    await expect(page2Scores.nth(0)).toHaveText("5", { timeout: 5000 });
    await expect(page2Scores.nth(1)).toHaveText("0", { timeout: 5000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
