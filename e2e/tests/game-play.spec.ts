import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
} from "../helpers/api";

test.describe("Game Play", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("enter penalties, finish round, scores update", async ({
    authPage,
  }) => {
    // Create tournament via API
    const tournament = await createTournament("Spel Test", [
      "Alice",
      "Bob",
      "Charlie",
    ]);

    // Navigate to tournament page
    await authPage.goto(`/t/${tournament.id}`);

    // Wait for scoreboard to load
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Click penalty buttons to add penalties
    // Each player has a penalty-btn; find them in order
    const penaltyBtns = authPage.locator(".penalty-btn");
    await expect(penaltyBtns).toHaveCount(3);

    // Give Alice 5 points, Bob 0 points, Charlie 3 points
    for (let i = 0; i < 5; i++) {
      await penaltyBtns.nth(0).click();
    }
    for (let i = 0; i < 3; i++) {
      await penaltyBtns.nth(2).click();
    }

    // Verify penalty values displayed on buttons
    await expect(penaltyBtns.nth(0)).toHaveText("5");
    await expect(penaltyBtns.nth(1)).toHaveText("0");
    await expect(penaltyBtns.nth(2)).toHaveText("3");

    // Finish the round
    await authPage.click('[aria-label="Ronde afsluiten"]');

    // Scores should update in the current score row
    const currentScores = authPage.locator(".score-row-current td");
    await expect(currentScores.nth(0)).toHaveText("5");
    await expect(currentScores.nth(1)).toHaveText("0");
    await expect(currentScores.nth(2)).toHaveText("3");

    // Penalty buttons should reset to 0
    await expect(penaltyBtns.nth(0)).toHaveText("0");
  });

  test("player elimination and game finish with celebration", async ({
    authPage,
  }) => {
    // Create tournament via API
    const tournament = await createTournament("Eliminatie Test", [
      "Alice",
      "Bob",
      "Charlie",
    ]);
    const gameState = await getLatestGame(tournament.id);
    const gameId = gameState.game.id;
    const players = gameState.players;

    // Use API to bring Alice to 14 (Pelt) and Charlie to 13
    // Round 1: Alice gets 10, Bob 0, Charlie gets 10
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Bob" ? 0 : 10,
      }))
    );
    // Round 2: Alice gets 4, Bob 0, Charlie gets 3
    await finishRound(
      gameId,
      players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points:
          p.player_name === "Alice" ? 4 : p.player_name === "Charlie" ? 3 : 0,
      }))
    );

    // Navigate to tournament page — Alice at 14 (Pelt), Charlie at 13
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Should show "Pelt!" for Alice (score 14)
    await expect(authPage.locator(".status-pelt")).toBeVisible();

    // Now play a round via UI to eliminate Alice: Alice 2, Bob 0, Charlie 1
    // Validation requires exactly one player with 0 penalty (the round winner)
    // All three penalty buttons are shown (Alice, Bob, Charlie in order)
    const penaltyBtns = authPage.locator(".penalty-btn");

    // Give Alice 2 penalty points (first button)
    await penaltyBtns.nth(0).click();
    await penaltyBtns.nth(0).click();
    // Give Charlie 1 penalty point (third button) — Bob stays at 0 as winner
    await penaltyBtns.nth(2).click();

    // Accept any dialog that appears
    authPage.on("dialog", (d) => d.accept());

    // Finish round — this eliminates Alice (14+2=16 >= 15)
    await authPage.click('[aria-label="Ronde afsluiten"]');

    // Alice should be eliminated
    await expect(authPage.locator(".status-out")).toBeVisible();

    // Now only Bob and Charlie are active. Charlie is at 14 (Pelt).
    // Eliminate Charlie: give Charlie 1 point, Bob stays at 0.
    // After elimination, penalty-btn only appears for active players.
    const activeBtns = authPage.locator(".penalty-btn");
    await expect(activeBtns).toHaveCount(2);

    // Give Charlie (second button) 1 penalty point — Bob stays at 0 as winner
    await activeBtns.nth(1).click();

    // Finish round — this should auto-finish the game (only Bob left)
    await authPage.click('[aria-label="Ronde afsluiten"]');

    // Should show celebration overlay
    await expect(authPage.locator(".celebration-overlay")).toBeVisible({
      timeout: 5000,
    });

    // Should show "Nieuw spel" button
    await expect(authPage.locator("text=Nieuw spel")).toBeVisible();
  });

  test("shows Pelt indicator at score 14", async ({ authPage }) => {
    const tournament = await createTournament("Pelt Test", ["Alice", "Bob"]);
    const gameState = await getLatestGame(tournament.id);

    // Bring Alice to exactly 14 via API
    await finishRound(
      gameState.game.id,
      gameState.players.map(
        (p: { player_id: string; player_name: string }) => ({
          playerId: p.player_id,
          points: p.player_name === "Alice" ? 14 : 0,
        })
      )
    );

    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();

    // Score 14 should show as "P"
    await expect(authPage.locator(".score-pelt")).toBeVisible();
    // Pelt status indicator
    await expect(authPage.locator(".status-pelt")).toBeVisible();
  });
});
