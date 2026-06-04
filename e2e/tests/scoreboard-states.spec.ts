import { test, expect } from "../fixtures/auth.fixture";
import {
  resetDb,
  createTournament,
  getLatestGame,
  finishRound,
  finishGame,
} from "../helpers/api";

type ApiPlayer = { player_id: string; player_name: string };

test.describe("Scoreboard states (refresh)", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("current score row shows Pelt 'P' at 14 (regression guard)", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Pelt Hero", ["Alice", "Bob"]);
    const game = await getLatestGame(tournament.id);
    // Bring Alice to exactly 14 in a single round, so 14 lives ONLY in the
    // current (hero) row — this is where the .score-pelt hook regressed before.
    await finishRound(
      game.game.id,
      game.players.map((p: ApiPlayer) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 14 : 0,
      })),
    );

    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();

    const peltCell = authPage.locator(".score-row-current .score-pelt");
    await expect(peltCell).toBeVisible();
    await expect(peltCell).toHaveText("P");
  });

  test("buy-in button shows for an eliminated player in writer mode", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Inkoop", [
      "Alice",
      "Bob",
      "Charlie",
    ]);
    const game = await getLatestGame(tournament.id);
    // Alice -> 15 (eliminated, eligible to buy back in this round); Bob wins (0).
    await finishRound(
      game.game.id,
      game.players.map((p: ApiPlayer) => ({
        playerId: p.player_id,
        points:
          p.player_name === "Alice" ? 15 : p.player_name === "Charlie" ? 5 : 0,
      })),
    );

    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    await expect(authPage.locator(".status-out")).toBeVisible();
    const buyIn = authPage.locator(".buyin-section .btn-buyin").first();
    await expect(buyIn).toBeVisible();
    await expect(buyIn).toContainText("Alice");
    await expect(buyIn).toContainText("inkopen");
  });

  test("celebration shows winner, drama heatmap and stats", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Finale", ["Alice", "Bob"]);
    const game = await getLatestGame(tournament.id);
    // Eliminate Alice, then finish the game so Bob wins the pot.
    await finishRound(
      game.game.id,
      game.players.map((p: ApiPlayer) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 15 : 0,
      })),
    );
    await finishGame(game.game.id);

    await authPage.goto(`/t/${tournament.id}`);

    const overlay = authPage.locator(".celebration-overlay");
    await expect(overlay).toBeVisible();
    await expect(authPage.locator(".tp-cele-name")).toHaveText("Bob");
    // "Het verloop" drama heatmap (GameDramaGrid -> .tp-drama) renders.
    await expect(authPage.locator(".tp-drama")).toBeVisible();
    await expect(authPage.locator(".tp-drama-title")).toContainText("verloop");
    // Stats list is present.
    await expect(
      authPage.locator(".tp-cele-stats .tp-stat").first(),
    ).toBeVisible();
  });

  test("drama heatmap colours cells green->red by points gained that round", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Heatmap", [
      "Alice",
      "Bob",
      "Charlie",
    ]);
    const game = await getLatestGame(tournament.id);
    const id = Object.fromEntries(
      game.players.map((p: ApiPlayer) => [p.player_name, p.player_id]),
    );
    const round = (pts: Record<string, number>) =>
      finishRound(
        game.game.id,
        Object.entries(pts).map(([name, points]) => ({
          playerId: id[name],
          points,
        })),
      );
    // Alice keeps 0 each round (low → green); Bob/Charlie pick up high points
    // (→ red). Charlie then Bob get eliminated, Alice wins.
    await round({ Alice: 0, Bob: 4, Charlie: 7 });
    await round({ Alice: 0, Bob: 6, Charlie: 8 }); // Charlie -> 15 out
    await round({ Alice: 0, Bob: 5 }); // Bob -> 15 out
    await finishGame(game.game.id);

    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".tp-drama")).toBeVisible();
    // Low (0-point) rounds get the green tier; high (4+) rounds get the red tier.
    await expect(authPage.locator(".tp-dcell.tp-d0").first()).toBeVisible();
    await expect(authPage.locator(".tp-dcell.tp-d4").first()).toBeVisible();
    // The two tiers must render with different background colours.
    const d0bg = await authPage
      .locator(".tp-dcell.tp-d0")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const d4bg = await authPage
      .locator(".tp-dcell.tp-d4")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(d0bg).not.toBe(d4bg);
  });

  test("reduced motion keeps the celebration winner visible", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Stil", ["Alice", "Bob"]);
    const game = await getLatestGame(tournament.id);
    await finishRound(
      game.game.id,
      game.players.map((p: ApiPlayer) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 15 : 0,
      })),
    );
    await finishGame(game.game.id);

    // With reduced motion the fade/rise-in animations are disabled; the
    // celebration content must NOT stay stuck at opacity 0.
    await authPage.emulateMedia({ reducedMotion: "reduce" });
    await authPage.goto(`/t/${tournament.id}`);

    const name = authPage.locator(".tp-cele-name");
    await expect(name).toBeVisible();
    const opacity = await name.evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });
});
