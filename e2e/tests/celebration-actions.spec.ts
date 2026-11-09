import { test, expect } from "@playwright/test";
import { resetDb, createTournament, getLatestGame, finishRound, finishGame, apiBuyIn } from "../helpers/api";

for (const action of ["new-game", "close-tournament"] as const) {
  test(`${action} locks both celebration buttons and allows retry after failure`, async ({ page }) => {
    await resetDb();
    const tournament = await createTournament("Celebration actions", ["Alice", "Bob"]);
    const state = await getLatestGame(tournament.id);
    await finishRound(state.game.id, state.players.map((p: { player_id: string }, i: number) => ({
      playerId: p.player_id, points: i === 0 ? 15 : 0,
    })));
    await finishGame(state.game.id);
    await page.goto(`/t/${tournament.id}`);
    await page.getByLabel("Schakel naar schrijver modus").click();
    page.on("dialog", (dialog) => dialog.accept());

    const newGame = page.getByRole("button", { name: "Nieuw spel", exact: true });
    const closeTournament = page.getByRole("button", { name: "Toernooi afsluiten", exact: true });
    const selected = action === "new-game" ? newGame : closeTournament;
    const endpoint = action === "new-game" ? "games" : "close";
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    await page.route(`**/api/tournaments/${tournament.id}/${endpoint}`, async (route) => {
      requests++;
      if (requests === 1) {
        await held;
        await route.fulfill({ status: 500, json: { error: "Tijdelijk niet beschikbaar" } });
      } else await route.continue();
    });

    await selected.click();
    try {
      await expect(newGame).toBeDisabled();
      await expect(closeTournament).toBeDisabled();
      await expect(selected).toHaveAttribute("aria-busy", "true");
      // Native clicks on either disabled button must not enqueue another action.
      await newGame.evaluate((button: HTMLButtonElement) => button.click());
      await closeTournament.evaluate((button: HTMLButtonElement) => button.click());
      await expect.poll(() => requests).toBe(1);
    } finally {
      release();
    }

    await expect(page.getByRole("alert")).toContainText("Tijdelijk niet beschikbaar");
    await expect(page.locator(".celebration-overlay")).toBeVisible();
    await expect(newGame).toBeEnabled();
    await expect(closeTournament).toBeEnabled();
    await selected.click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".celebration-overlay")).toHaveCount(0);
    if (action === "new-game") {
      await expect(page.locator(".penalty-btn")).toHaveCount(2);
    } else {
      await expect(page.locator(".tournament-closed")).toBeVisible();
    }
    expect(requests).toBe(2);
  });
}

test("celebration shows cumulative euro balances including buy-ins", async ({ page }) => {
  await resetDb();
  const tournament = await createTournament("Balans na ieder spel", ["Alice", "Bob", "Charlie"]);
  const state = await getLatestGame(tournament.id);
  const alice = state.players.find((p: { player_name: string }) => p.player_name === "Alice");
  const penalties = (alicePoints: number, bobPoints: number) => state.players.map((p: { player_id: string; player_name: string }) => ({
    playerId: p.player_id,
    points: p.player_name === "Alice" ? alicePoints : p.player_name === "Bob" ? bobPoints : 0,
  }));
  await finishRound(state.game.id, penalties(15, 0));
  await apiBuyIn(state.game.id, alice.player_id);
  await finishRound(state.game.id, penalties(15, 15));
  await finishGame(state.game.id);
  await page.goto(`/t/${tournament.id}`);
  const balances = page.getByRole("region", { name: "Toernooibalans" });
  await expect(balances.locator(".tp-stat").filter({ hasText: "Alice" })).toHaveText("Alice−€5,00");
  await expect(balances.locator(".tp-stat").filter({ hasText: "Bob" })).toHaveText("Bob−€2,50");
  await expect(balances.locator(".tp-stat").filter({ hasText: "Charlie" })).toHaveText("Charlie+€7,50");
  await page.getByLabel("Schakel naar schrijver modus").click();
  await page.getByRole("button", { name: "Nieuw spel", exact: true }).click();
  await expect(page.locator(".celebration-overlay")).toHaveCount(0);
  const next = await getLatestGame(tournament.id);
  await finishRound(next.game.id, next.players.map((p: { player_id: string; player_name: string }) => ({
    playerId: p.player_id, points: p.player_name === "Alice" ? 0 : 15,
  })));
  await finishGame(next.game.id);
  await page.reload();
  await expect(balances.locator(".tp-stat").filter({ hasText: "Alice" })).toHaveText("Alice+€0,00");
  await expect(balances.locator(".tp-stat").filter({ hasText: "Bob" })).toHaveText("Bob−€5,00");
  await expect(balances.locator(".tp-stat").filter({ hasText: "Charlie" })).toHaveText("Charlie+€5,00");
});
