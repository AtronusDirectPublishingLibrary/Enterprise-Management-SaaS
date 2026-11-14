import { defineConfig, devices } from "@playwright/test";

// E2E scaffold. Requires: npm i -D @playwright/test && npx playwright install
// Run with app servers available (backend+frontend) and BASE_URL set as needed.
module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
