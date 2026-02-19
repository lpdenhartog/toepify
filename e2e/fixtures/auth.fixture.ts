import { test as base, type Page } from "@playwright/test";

type AuthFixtures = {
  authPage: Page;
};

/**
 * Provides a pre-authenticated page with JWT already in localStorage.
 * Uses the storageState saved by global-setup.ts.
 */
export const test = base.extend<AuthFixtures>({
  authPage: async ({ page }, use) => {
    // storageState is already loaded via playwright.config.ts
    // Navigate to a page to ensure localStorage is populated
    await page.goto("/");
    await use(page);
  },
});

export { expect } from "@playwright/test";
