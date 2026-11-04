import { test, expect } from "@playwright/test";
import { resetDb, createTournament, getLatestGame, finishRound, finishGame } from "../helpers/api";

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
