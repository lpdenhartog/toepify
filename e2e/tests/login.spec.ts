import { test, expect } from "@playwright/test";

// These tests use a fresh browser context (no storageState) to test login UI
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login", () => {
  test("logs in with correct credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#username", "e2e_admin");
    await page.fill("#password", "e2e-test-password-secure");
    await page.click('button[type="submit"]');

    // Should redirect to landing page after successful login
    await expect(page).toHaveURL("/");
    // Should see the create tournament or tournament list area
    await expect(page.locator("text=Nieuw Toernooi")).toBeVisible();
  });

  test("shows error with wrong credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#username", "e2e_admin");
    await page.fill("#password", "wrong-password");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator(".error-msg")).toBeVisible();
    // Should still be on login page
    await expect(page).toHaveURL("/login");
  });

  test("shows error with non-existent user", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#username", "nonexistent_user");
    await page.fill("#password", "some-password");
    await page.click('button[type="submit"]');

    await expect(page.locator(".error-msg")).toBeVisible();
  });
});
