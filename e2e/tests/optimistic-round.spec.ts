import { test, expect, type Page } from "@playwright/test";
import { createTournament, resetDb, getLatestGame, finishRound, undoRound, apiBuyIn } from "../helpers/api";

async function openWriter(page: Page, players = ["Alice", "Bob", "Carol"]) {
  const tournament = await createTournament("Optimistic round", players);
  await page.goto(`/t/${tournament.id}`);
  await page.getByLabel("Schakel naar schrijver modus").click();
  return tournament;
}
async function enterRound(page: Page) {
  await page.locator(".penalty-btn").nth(0).click();
  await page.locator(".penalty-btn").nth(1).click();
}
const scores = (page: Page) => page.locator(".score-row-current td, .tp-lcurrent > .tp-cell");

test.beforeEach(async () => { await resetDb(); });

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`scores update immediately and lock controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const tournament = await openWriter(page);
    await page.setViewportSize(viewport);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/finish-round", async (route) => { await held; await route.continue(); });
    await enterRound(page);
    await page.getByLabel("Ronde afsluiten").click();
    await expect(scores(page).nth(0)).toHaveText("1");
    await expect(page.getByRole("status")).toHaveText("Opslaan…");
    await expect(page.locator(".penalty-btn").first()).toBeDisabled();
    await expect(page.getByLabel("Laatste ronde ongedaan maken")).toBeDisabled();
    expect((await getLatestGame(tournament.id)).rounds).toHaveLength(0);
    release();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.locator(".penalty-btn").first()).toBeEnabled();
    expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
  });

}

test("rejected saves restore the scores and submitted inputs", async ({ page }) => {
  await openWriter(page);
  await page.route("**/finish-round", (route) => route.fulfill({ status: 400, json: { error: "Ongeldige ronde" } }));
  await enterRound(page);
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.getByRole("alert")).toContainText("Ongeldige ronde");
  await expect(scores(page).nth(0)).toHaveText("0");
  await expect(page.locator(".penalty-btn").first()).toHaveText("1");
  await expect(page.getByLabel("Ronde afsluiten")).toBeEnabled();
});

test("a lost response retries the same submission without duplicating a round", async ({ page }) => {
  const tournament = await openWriter(page);
  const ids: string[] = [];
  await page.route("**/finish-round", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    if (ids.length === 1) {
      await route.fetch(); // Commit, then lose the response.
      await route.abort("failed");
    } else await route.continue();
  });
  await enterRound(page);
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".penalty-btn").first()).toBeEnabled();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});

test("uncertain saves stay locked and recover after a reload", async ({ page }) => {
  const tournament = await openWriter(page);
  const ids: string[] = [];
  await page.route("**/finish-round", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    if (ids.length === 1) await route.fetch();
    await route.abort("failed");
  });
  await enterRound(page);
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.getByRole("alert")).toContainText("Opslaan niet bevestigd");
  await expect(page.locator(".penalty-btn").first()).toBeDisabled();
  await page.unroute("**/finish-round");
  await page.route("**/finish-round", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    await route.continue();
  });
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(scores(page).nth(0)).toHaveText("1");
  await expect.poll(() => ids.length).toBe(3);
  expect(new Set(ids).size).toBe(1);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});

test("manual retry after rate limiting keeps the original receipt", async ({ page }) => {
  const tournament = await openWriter(page);
  const ids: string[] = [];
  await page.route("**/finish-round", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    if (ids.length === 1) {
      await route.fetch();
      await route.abort("failed");
    } else if (ids.length === 2) {
      await route.fulfill({ status: 429, json: { error: "Te veel verzoeken" } });
    } else await route.continue();
  });
  await enterRound(page);
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.getByRole("alert")).toContainText("Opslaan niet bevestigd");
  await expect(page.locator(".penalty-btn").first()).toBeDisabled();
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".penalty-btn").first()).toBeEnabled();
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(1);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});

test("a stale writer refreshes instead of appending scores to another writer's round", async ({ page }) => {
  const tournament = await openWriter(page);
  const initial = await getLatestGame(tournament.id);
  await finishRound(initial.game.id, initial.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 5 : 0 })));
  await enterRound(page);
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.getByRole("alert")).toContainText("Het spel is gewijzigd");
  await expect(scores(page).nth(0)).toHaveText("5");
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});

test("a winning round displays immediately and saves the winner atomically", async ({ page }) => {
  const tournament = await openWriter(page, ["Alice", "Bob"]);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/finish-round", async (route) => { await held; await route.continue(); });
  for (let i = 0; i < 15; i++) await page.locator(".penalty-btn").first().click();
  await page.getByLabel("Ronde afsluiten").click();
  await expect(page.locator(".celebration-overlay")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nieuw spel", exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("status")).toHaveCount(0);
  const result = await getLatestGame(tournament.id);
  expect(result.game.status).toBe("finished");
  expect(result.game.winner_player_id).toBe(result.players[1].player_id);
});

test("concurrent submissions, undo and buy-ins respect revisions and durable receipts", async ({ request }) => {
  const tournament = await createTournament("Receipts", ["Alice", "Bob", "Carol"]);
  const initial = await getLatestGame(tournament.id);
  const url = `/api/games/${initial.game.id}/finish-round`;
  const body = {
    requestId: "first", expectedRevision: initial.game.revision, autoFinish: true,
    penalties: initial.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 15 : i === 1 ? 1 : 0 })),
  };
  const responses = await Promise.all([
    request.post(url, { data: body }),
    request.post(url, { data: { ...body, requestId: "second" } }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
  const winningId = responses[0].ok() ? "first" : "second";
  const savedBody = { ...body, requestId: winningId };
  const saved = await getLatestGame(tournament.id);
  expect(saved.rounds).toHaveLength(1);
  await apiBuyIn(initial.game.id, saved.players[0].player_id);
  const stale = await request.post(url, { data: { ...body, requestId: "stale" } });
  expect(stale.status()).toBe(409);
  await undoRound(initial.game.id); // Buy-in
  await undoRound(initial.game.id); // Submitted round
  // Undo restores the original round count, but must never restore its revision.
  expect((await request.post(url, { data: { ...body, requestId: "after-undo" } })).status()).toBe(409);
  const repeated = await request.post(url, { data: savedBody });
  expect(repeated.ok()).toBeTruthy();
  expect((await repeated.json()).rounds).toHaveLength(0);
  const changed = await request.post(url, { data: { ...savedBody, penalties: savedBody.penalties.map((p: { playerId: string; points: number }) => ({ ...p, points: 0 })) } });
  expect(changed.status()).toBe(409);
});
