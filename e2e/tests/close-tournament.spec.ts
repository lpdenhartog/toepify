import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
  finishGame,
  getToken,
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
    const balances = authPage.getByRole("region", { name: "Toernooibalans" });
    await expect(balances).toBeVisible();
    await expect(balances.locator(".tp-stat").filter({ hasText: "Alice" })).toHaveText("Alice−€2,50");
    await expect(balances.locator(".tp-stat").filter({ hasText: "Bob" })).toHaveText("Bob+€2,50");
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

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`close an unplayed new game at ${viewport.width}x${viewport.height}`, async ({ authPage }) => {
    await resetDb();
    await authPage.setViewportSize({ width: 390, height: 844 });
    const tournament = await createTournament("Toch afsluiten", ["Alice", "Bob"]);
    const first = await getLatestGame(tournament.id);
    await finishRound(first.game.id, first.players.map((p: { player_id: string; player_name: string }) => ({
      playerId: p.player_id, points: p.player_name === "Alice" ? 15 : 0,
    })));
    await finishGame(first.game.id);
    const finished = await getLatestGame(tournament.id);
    await authPage.goto(`/t/${tournament.id}`);
    await authPage.getByLabel("Schakel naar schrijver modus").click();
    await authPage.getByRole("button", { name: "Nieuw spel", exact: true }).click();
    await expect(authPage.locator(".celebration-overlay")).toHaveCount(0);
    await authPage.setViewportSize(viewport);
    const unplayed = await getLatestGame(tournament.id);
    expect(unplayed.game.id).not.toBe(first.game.id);
    expect(unplayed.rounds).toHaveLength(0);
    authPage.on("dialog", (dialog) => dialog.accept());
    await authPage.getByRole("button", { name: "Toernooi afsluiten", exact: true }).click();
    await expect(authPage.locator(".tournament-closed")).toBeVisible();
    const settlement = await authPage.request.get(`/api/tournaments/${tournament.id}/settlement`);
    expect((await settlement.json()).balances).toEqual(finished.balances);
    const closed = await getLatestGame(tournament.id);
    expect(closed.game.status).toBe("cancelled");
    // A stale writer cannot add a round to the unplayed game after closure.
    const lateRound = await authPage.request.post(`/api/games/${unplayed.game.id}/finish-round`, {
      data: { penalties: unplayed.players.map((p: { player_id: string }) => ({ playerId: p.player_id, points: 0 })) },
    });
    expect(lateRound.status()).toBe(400);
    const lateFinish = await authPage.request.post(`/api/games/${unplayed.game.id}/finish`, {
      data: { excludedPlayerIds: [unplayed.players[0].player_id] },
    });
    expect(lateFinish.status()).toBe(400);
    const newGame = await authPage.request.post(`/api/tournaments/${tournament.id}/games`);
    expect(newGame.status()).toBe(400);
    await authPage.reload();
    await expect(authPage.locator(".tournament-closed")).toBeVisible();
  });
}

test("even a zero-point round prevents closing an active game", async ({ authPage }) => {
  await expect(authPage.getByRole("button", { name: "Uitloggen", exact: true })).toBeVisible();
  await resetDb();
  const tournament = await createTournament("Al begonnen", ["Alice", "Bob"]);
  const state = await getLatestGame(tournament.id);
  await finishRound(state.game.id, state.players.map((p: { player_id: string }) => ({ playerId: p.player_id, points: 0 })));
  await authPage.goto(`/t/${tournament.id}`);
  await authPage.getByLabel("Schakel naar schrijver modus").click();
  await expect(authPage.getByRole("button", { name: "Toernooi afsluiten", exact: true })).toHaveCount(0);
  const response = await authPage.request.post(`/api/tournaments/${tournament.id}/close`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  expect(response.status()).toBe(400);
  expect((await getLatestGame(tournament.id)).tournament.status).toBe("active");
});

test("close a tournament before its first round with zero balances", async ({ authPage }) => {
  await expect(authPage.getByRole("button", { name: "Uitloggen", exact: true })).toBeVisible();
  await resetDb();
  const tournament = await createTournament("Nog niet begonnen", ["Alice", "Bob"]);
  await authPage.goto(`/t/${tournament.id}`);
  await authPage.getByLabel("Schakel naar schrijver modus").click();
  authPage.on("dialog", (dialog) => dialog.accept());
  await authPage.getByRole("button", { name: "Toernooi afsluiten", exact: true }).click();
  await expect(authPage.locator(".tournament-closed")).toBeVisible();
  const state = await getLatestGame(tournament.id);
  expect(state.balances.every((b: { balance: number }) => b.balance === 0)).toBe(true);
});
