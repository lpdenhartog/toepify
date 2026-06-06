import { expect, test } from "@playwright/test";
import { createTournament, resetDb } from "../helpers/api";

declare global {
  interface Window {
    __wakeLockReleased?: boolean;
    __wakeLockRequests?: number;
  }
}

test.describe("PWA and Scherm toggle", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("serves an installable web app manifest", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest).toMatchObject({
      id: "/",
      name: "toepify",
      short_name: "toepify",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ece5d6",
      theme_color: "#ece5d6",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
  });

  test("toggles Scherm when screen wake lock is supported", async ({ page }) => {
    const tournament = await createTournament("Wake Lock Test", [
      "Alice",
      "Bob",
    ]);

    await page.addInitScript(() => {
      window.__wakeLockRequests = 0;
      window.__wakeLockReleased = false;

      Object.defineProperty(Navigator.prototype, "wakeLock", {
        configurable: true,
        get: () => ({
          request: async () => {
            window.__wakeLockRequests = (window.__wakeLockRequests ?? 0) + 1;
            const sentinel = new EventTarget() as EventTarget & {
              release: () => Promise<void>;
            };
            sentinel.release = async () => {
              window.__wakeLockReleased = true;
              sentinel.dispatchEvent(new Event("release"));
            };
            return sentinel;
          },
        }),
      });
    });

    await page.goto(`/t/${tournament.id}`);

    const screenToggle = page.getByRole("button", { name: "Scherm" });
    await expect(screenToggle).toBeVisible();
    await expect(screenToggle).toHaveAttribute("aria-pressed", "false");

    await screenToggle.click();
    await expect(screenToggle).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => page.evaluate(() => window.__wakeLockRequests))
      .toBe(1);

    await expect(page.getByLabel("Schakel naar schrijver modus")).toBeVisible();

    await screenToggle.click();
    await expect(screenToggle).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() => page.evaluate(() => window.__wakeLockReleased))
      .toBe(true);
  });

  test("shows Scherm as unavailable without screen wake lock support", async ({
    page,
  }) => {
    const tournament = await createTournament("No Wake Lock Test", [
      "Alice",
      "Bob",
    ]);

    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "wakeLock", {
        configurable: true,
        get: () => undefined,
      });
    });

    await page.goto(`/t/${tournament.id}`);

    const screenToggle = page.getByRole("button", { name: "Scherm" });
    await expect(screenToggle).toBeVisible();
    await expect(screenToggle).toBeDisabled();
    await expect(screenToggle).toHaveAttribute("aria-pressed", "false");
  });
});
