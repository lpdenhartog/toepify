import { defineConfig } from "@playwright/test";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://localhost:5432/toepify_test";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    storageState: "e2e/.auth-state.json",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : undefined,
        },
      },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: {
    command:
      "npm run build -w client && npm run build -w server && NODE_ENV=test node server/dist/index.js",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDbUrl,
      JWT_SECRET: process.env.JWT_SECRET || "e2e-test-jwt-secret",
    },
  },
});
