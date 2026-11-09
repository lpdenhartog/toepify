import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTournament, getLatestGame, resetDb, finishRound, getToken } from '../helpers/api';
import type { Command } from '../../server/src/shared/gameplay';
async function openWriter(page: Page, players = ['Alice', 'Bob', 'Carol']) {
  const tournament = await createTournament('Offline test', players);
  await page.goto(`/t/${tournament.id}`);
  await page.getByLabel('Schakel naar schrijver modus').click();
  await expect(page.locator('.penalty-btn').first()).toBeEnabled();
  return tournament;
}
async function enterRound(page: Page, points = 1) {
  for (let i = 0; i < points; i++) await page.locator('.penalty-btn').nth(0).click();
  if (await page.locator('.penalty-btn').count() > 2) await page.locator('.penalty-btn').nth(1).click();
  await page.getByLabel('Ronde afsluiten').click();
}
async function goOffline(page: Page) {
  await page.route('**/commands', route => route.abort('failed'));
  await enterRound(page);
  await expect(page.getByRole('button', { name: 'Offline verder spelen' })).toBeVisible();
  const retry = await page.getByRole('button', { name: 'Opnieuw proberen', exact: true }).boundingBox();
  const offline = await page.getByRole('button', { name: 'Offline verder spelen', exact: true }).boundingBox();
  expect(Math.abs(retry!.width - offline!.width)).toBeLessThanOrEqual(1);
  expect(retry!.height).toBe(offline!.height);
  await page.getByRole('button', { name: 'Offline verder spelen' }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toBeVisible();
}
const scores = (page: Page) => page.locator('.score-row-current td, .tp-lcurrent > .tp-cell');
test.beforeEach(async () => { await resetDb(); });
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`offline scores survive reload and sync only manually at ${viewport.width}`, async ({ page, context }) => {
    const tournament = await openWriter(page);
    await page.setViewportSize(viewport);
    await goOffline(page);
    await page.unroute('**/commands');
    let calls = 0;
    page.on('request', request => { if (request.url().includes('/api/')) calls++; });
    await enterRound(page);
    await expect(scores(page).first()).toHaveText('2');
    await page.screenshot({ path: `/tmp/toepify-offline-${viewport.width}.png` });
    expect((await page.locator('.offline-status').boundingBox())!.height).toBeLessThanOrEqual(60);
    await expect(page.getByLabel('Ronde afsluiten')).toBeInViewport();
    expect((await getLatestGame(tournament.id)).rounds).toHaveLength(0);
    const before = calls;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(200);
    expect(calls).toBe(before);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    if (viewport.width === 844) {
      await page.close(); page = await context.newPage();
      await page.goto(`/t/${tournament.id}`);
    } else await page.reload();
    await expect(scores(page).first()).toHaveText('2');
    await expect(page.getByRole('button', { name: 'Synchroniseren', exact: true })).toBeEnabled();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
    await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
    expect((await getLatestGame(tournament.id)).rounds).toHaveLength(2);
  });
}
test('offline winner can start new games and restore excluded roster', async ({ page }) => {
  const tournament = await openWriter(page, ['Alice', 'Bob']);
  await page.route('**/commands', route => route.abort('failed'));
  await enterRound(page, 15);
  await page.getByRole('button', { name: 'Offline verder spelen' }).click();
  await expect(page.locator('.celebration-overlay')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Synchroniseren', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toernooi afsluiten', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nieuw spel', exact: true }).click();
  await expect(page.locator('.penalty-btn')).toHaveCount(2);
  await enterRound(page);
  await page.unroute('**/commands');
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  const state = await getLatestGame(tournament.id);
  expect(state.rounds).toHaveLength(1);
  expect(state.balances.map((b: { balance: number }) => b.balance)).toEqual([-2.5, 2.5]);
});
test('manual online retry recognizes an unconfirmed save', async ({ page }) => {
  const tournament = await openWriter(page);
  const ids: string[] = [];
  await page.route('**/commands', async route => {
    ids.push(route.request().postDataJSON().commands[0].requestId);
    if (ids.length === 1) { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await enterRound(page);
  await page.getByRole('button', { name: 'Opnieuw proberen', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});
test('conflicts retain offline progress and provide a recovery file', async ({ page }) => {
  const tournament = await openWriter(page);
  const initial = await getLatestGame(tournament.id);
  await goOffline(page);
  await finishRound(initial.game.id, initial.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 5 : 0 })));
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Vraag een beheerder om hulp');
  await expect(scores(page).first()).toHaveText('1');
  await expect(page.locator('.penalty-btn').first()).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByLabel('Offline opties').click();
  await page.getByRole('button', { name: 'Herstelbestand downloaden' }).click();
  expect((await download).suggestedFilename()).toContain(tournament.id);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});
test('blocks creation, administration and API calls throughout offline mode', async ({ page }) => {
  await openWriter(page); await goOffline(page);
  const response = await page.evaluate(async () => {
    try { await fetch('/api/tournaments', { method: 'POST' }); return 'sent'; } catch (err) { return String(err); }
  });
  expect(response).toContain('offline modus');
  await page.goto('/admin');
  await expect(page.getByText('Beheer is niet beschikbaar in offline modus.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Synchroniseer het offline toernooi om andere functies te gebruiken.')).toBeVisible();
});
test('one writer tab owns the local session', async ({ page, context }) => {
  const tournament = await openWriter(page); await goOffline(page);
  const second = await context.newPage();
  await second.goto(`/t/${tournament.id}`);
  await second.getByLabel('Schakel naar schrijver modus').click();
  await expect(second.getByText('Een ander tabblad schrijft', { exact: false })).toBeVisible();
  await enterRound(page);
  await expect(scores(second).first()).toHaveText('2');
  await page.close();
  await expect(second.locator('.penalty-btn').first()).toBeEnabled();
});
test('storage failure rejects the action before displaying or sending it', async ({ page }) => {
  const tournament = await openWriter(page);
  await page.locator('.penalty-btn').nth(0).click(); await page.locator('.penalty-btn').nth(1).click();
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('Storage full', 'QuotaExceededError'); }; });
  await page.getByLabel('Ronde afsluiten').click();
  await expect(page.getByRole('alert')).toContainText('browseropslag');
  await expect(scores(page).first()).toHaveText('0');
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(0);
});

test('batch sync is atomic, idempotent, and detects legacy mutations', async ({ request }) => {
  const tournament = await createTournament('Batch', ['A', 'B', 'C']);
  const base = await getLatestGame(tournament.id);
  const makeRound = (): Command => ({ requestId: randomUUID(), gameId: base.game.id, action: { type: 'round', excludedPlayerIds: [], penalties: base.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 0 : 1 })) } });
  const first = makeRound(); const second = makeRound();
  const url = `/api/tournaments/${tournament.id}/sync`;
  const post = (commands: Command[], baseRevision = base.tournament.revision) => request.post(url, { data: { baseRevision, commands } });
  const invalid = { ...second, action: { type: 'buy-in', playerId: base.players[0].player_id } } as Command;
  expect((await post([first, invalid])).status()).toBe(400);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(0);
  expect((await post([first, second])).ok()).toBe(true);
  expect((await post([first, second])).ok()).toBe(true); // Lost sync response.
  const third = makeRound();
  expect((await post([first, second, third])).ok()).toBe(true); // More local play after lost response.
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(3);
  expect((await post([{ ...first, action: { type: 'undo' } }])).status()).toBe(409);
  await request.post(`/api/games/${base.game.id}/undo-round`);
  expect((await post([first, second, third])).status()).toBe(409);
});
test('concurrent writers serialize, and deleted or closed tournaments conflict', async ({ request }) => {
  const tournament = await createTournament('Concurrency', ['A', 'B']);
  const base = await getLatestGame(tournament.id);
  const data = { baseRevision: base.tournament.revision, commands: [{ requestId: randomUUID(), gameId: base.game.id, action: { type: 'round', excludedPlayerIds: [], penalties: base.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 0 : 15 })) } }] };
  const url = `/api/tournaments/${tournament.id}/sync`;
  const responses = await Promise.all([request.post(url, { data }), request.post(url, { data: { ...data, commands: [{ ...data.commands[0], requestId: randomUUID() }] } })]);
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
  await request.post(`/api/tournaments/${tournament.id}/close`, { headers: { Authorization: `Bearer ${getToken()}` } });
  expect((await request.post(url, { data })).status()).toBe(409);
  await request.delete(`/api/tournaments/${tournament.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  expect((await request.post(url, { data })).status()).toBe(409);
});

test('a lost sync response can be extended with more offline play and synced again', async ({ page }) => {
  const tournament = await openWriter(page);
  await goOffline(page);
  let uploads = 0;
  await page.route('**/sync', async route => {
    uploads++;
    if (uploads === 1) await route.fetch();
    if (uploads <= 3) await route.abort('failed');
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synchroniseren niet bevestigd');
  await expect(page.locator('.penalty-btn').first()).toBeEnabled();
  await enterRound(page);
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(2);
});

test('new-game failure offers offline play and preserves the same new game on sync', async ({ page }) => {
  const tournament = await openWriter(page, ['Alice', 'Bob']);
  await enterRound(page, 15);
  await expect(page.getByRole('button', { name: 'Nieuw spel', exact: true })).toBeEnabled();
  let gameId = '';
  await page.route('**/commands', async route => {
    gameId = route.request().postDataJSON().commands[0].action.newGameId;
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Nieuw spel', exact: true }).click();
  await page.getByRole('button', { name: 'Offline verder spelen' }).click();
  await expect(page.locator('.penalty-btn').first()).toBeEnabled();
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  expect((await getLatestGame(tournament.id)).game.id).toBe(gameId);
});

test('cached online tournament offers offline entry when reopening cannot load the server', async ({ page }) => {
  const tournament = await openWriter(page);
  await page.route('**/latest', route => route.abort('failed'));
  await page.reload();
  await page.getByLabel('Schakel naar schrijver modus').click();
  await page.getByRole('button', { name: 'Offline verder spelen' }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toBeVisible();
  await enterRound(page);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(0);
});

test('offline buy-in and undo agree with the uploaded authoritative state', async ({ page }) => {
  const tournament = await openWriter(page);
  await page.route('**/commands', route => route.abort('failed'));
  await enterRound(page, 15);
  await page.getByRole('button', { name: 'Offline verder spelen' }).click();
  await page.locator('.penalty-btn').first().click();
  await page.locator('.buyin-section .btn-buyin').first().click();
  await expect(page.locator('.penalty-btn').nth(1)).toHaveText('1');
  await expect(scores(page).first()).toHaveText('1');
  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Laatste ronde ongedaan maken').click();
  await expect(scores(page).first()).toHaveText('15');
  await page.getByLabel('Laatste ronde ongedaan maken').click();
  await expect(scores(page).first()).toHaveText('0');
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  const state = await getLatestGame(tournament.id);
  expect(state.rounds).toHaveLength(0);
  expect(state.players[0]).toMatchObject({ total_score: 0, buy_ins: 0, is_active: true });
});

test('writer handover waits for an in-flight sync before accepting more work', async ({ page, context }) => {
  const tournament = await openWriter(page); await goOffline(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/sync', async route => { await held; await route.continue(); });
  const second = await context.newPage();
  await second.goto(`/t/${tournament.id}`);
  await second.getByLabel('Schakel naar schrijver modus').click();
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await page.getByLabel('Schakel naar viewer modus').click();
  await expect(second.getByText('Een ander tabblad schrijft', { exact: false })).toBeVisible();
  release();
  await expect(second.locator('.penalty-btn').first()).toBeEnabled();
  await expect(second.getByText('Offline modus', { exact: true })).toHaveCount(0);
  await enterRound(second);
  await expect(scores(second).first()).toHaveText('2');
  await expect(second.locator('.penalty-btn').first()).toBeEnabled();
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(2);
});

test('viewer polling refreshes the durable baseline before switching offline', async ({ page }) => {
  const tournament = await createTournament('Cached viewer', ['Alice', 'Bob', 'Carol']);
  const initial = await getLatestGame(tournament.id);
  await page.goto(`/t/${tournament.id}`);
  await expect(scores(page).first()).toHaveText('0');
  await finishRound(initial.game.id, initial.players.map((p: { player_id: string }, i: number) => ({ playerId: p.player_id, points: i === 0 ? 4 : 0 })));
  await expect(scores(page).first()).toHaveText('4', { timeout: 15000 });
  await page.getByLabel('Schakel naar schrijver modus').click();
  await expect(scores(page).first()).toHaveText('4');
  await goOffline(page);
  await expect(scores(page).first()).toHaveText('5');
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(2);
});


test('manual sync recovers from transient reconnect failures without duplicating saved scores', async ({ page, context }) => {
  const tournament = await openWriter(page);
  await goOffline(page);
  await context.setOffline(true);
  await context.setOffline(false);
  const bodies: string[] = [];
  await page.route('**/sync', async route => {
    bodies.push(route.request().postData()!);
    if (bodies.length === 1) { await route.fetch(); await route.abort('failed'); }
    else if (bodies.length === 2) await route.fulfill({ status: 503, json: { error: 'Server tijdelijk niet bereikbaar' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Synchroniseren', exact: true }).click();
  await expect(page.getByText('Offline modus', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(bodies).toHaveLength(3);
  expect(new Set(bodies).size).toBe(1);
  expect((await getLatestGame(tournament.id)).rounds).toHaveLength(1);
});
