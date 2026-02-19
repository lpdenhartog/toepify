import { test, expect } from "../fixtures/auth.fixture";
import { resetDb } from "../helpers/api";

test.describe("Create Tournament", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("creates a tournament and shows join link", async ({ authPage }) => {
    await authPage.goto("/");

    // Fill in tournament form
    await authPage.fill("#name", "Test Toernooi");
    await authPage.fill("#stake", "5");

    // Fill player names (2 inputs should be present by default)
    const playerInputs = authPage.locator('fieldset input[type="text"]');
    await playerInputs.nth(0).fill("Alice");
    await playerInputs.nth(1).fill("Bob");

    // Add a third player
    await authPage.click("text=+ Speler Toevoegen");
    await playerInputs.nth(2).fill("Charlie");

    // Submit the form
    await authPage.click("text=Toernooi Aanmaken");

    // Should show success card with tournament name
    await expect(authPage.locator("text=Toernooi Aangemaakt")).toBeVisible();
    await expect(authPage.locator(".tournament-name")).toHaveText(
      "Test Toernooi"
    );

    // Should show player chips
    await expect(authPage.locator(".player-chip")).toHaveCount(3);

    // Should show a shareable link input
    const linkInput = authPage.locator('.share-row input[type="text"]');
    await expect(linkInput).toBeVisible();
    const linkValue = await linkInput.inputValue();
    expect(linkValue).toContain("/t/");
  });

  test("shows validation error with empty player names", async ({
    authPage,
  }) => {
    await authPage.goto("/");

    await authPage.fill("#name", "Test Toernooi");

    // Leave player names empty and try to submit
    // The form uses required attributes, so the browser should block submission
    const submitButton = authPage.locator("text=Toernooi Aanmaken");
    await submitButton.click();

    // Should still be on the form (browser validation prevents submission)
    await expect(authPage.locator("#name")).toBeVisible();
  });
});
