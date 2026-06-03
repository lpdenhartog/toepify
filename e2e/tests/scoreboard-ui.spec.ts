import { test, expect } from "../fixtures/auth.fixture";
import { resetDb, createTournament } from "../helpers/api";

test.describe("Scoreboard UI refresh", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("viewer mode shows the live badge and read-only note", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Kijk Test", ["Alice", "Bob"]);
    await authPage.goto(`/t/${tournament.id}`);

    // Default mode is viewer.
    await expect(authPage.locator(".scoreboard")).toBeVisible();

    // The viewer (kijkmodus) badge is shown.
    await expect(authPage.locator(".tp-mode-viewer")).toBeVisible();
    await expect(authPage.locator(".tp-mode")).toContainText("Kijkmodus");

    // The read-only note replaces the penalty entry.
    const note = authPage.locator(".tp-viewnote");
    await expect(note).toBeVisible();
    await expect(note).toContainText("kijkmodus");

    // No writer affordances in viewer mode.
    await expect(authPage.locator(".penalty-btn")).toHaveCount(0);
    await expect(
      authPage.locator('[aria-label="Ronde afsluiten"]'),
    ).toHaveCount(0);
  });

  test("writer mode shows penalty entry and the write badge", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Schrijf Test", ["Alice", "Bob"]);
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();

    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // The writer badge is shown and the viewer note is gone.
    await expect(authPage.locator(".tp-mode")).toContainText("Schrijfmodus");
    await expect(authPage.locator(".tp-viewnote")).toHaveCount(0);

    // Penalty entry + finish action are available, one tap button per player.
    await expect(authPage.locator(".penalty-btn")).toHaveCount(2);
    await expect(
      authPage.locator('[aria-label="Ronde afsluiten"]'),
    ).toBeVisible();
  });

  test("landscape layout keeps the board and pot visible", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Landscape Test", [
      "Alice",
      "Bob",
    ]);

    // iPhone 15 Pro lying down: short landscape viewport.
    await authPage.setViewportSize({ width: 852, height: 393 });
    await authPage.goto(`/t/${tournament.id}`);

    // The dedicated landscape layout renders with the pot in the side rail.
    await expect(authPage.locator(".tp-land")).toBeVisible();
    await expect(authPage.locator(".tp-land-board")).toBeVisible();
    const pot = authPage.locator(".tp-land-pot .tp-pot-value");
    await expect(pot).toBeVisible();
    await expect(pot).toContainText("€");
  });

  test("landscape writer keeps the tap row inside the board", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Landscape Schrijf", [
      "Alice",
      "Bob",
    ]);

    // Toggle to writer in portrait (the header toggle is hidden in landscape).
    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".scoreboard")).toBeVisible();
    await authPage.getByLabel("Schakel naar schrijver modus").click();

    // Rotate to landscape; the tap row should move inside the board.
    await authPage.setViewportSize({ width: 852, height: 393 });
    await expect(authPage.locator(".tp-ltap")).toBeVisible();
    await expect(authPage.locator(".tp-ltap .penalty-btn")).toHaveCount(2);
  });
});
