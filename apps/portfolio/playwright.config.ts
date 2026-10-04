import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `PORT=${port} npm run dev`,
    // The e2e suite builds its journal from tests/fixtures/sketchbook, which
    // holds a published code entry, so it never depends on (or publishes)
    // anything in apps/sketchbook. The `pretest:e2e*` scripts set the same
    // variable; `predev` regenerates the journal under this env. A dev server
    // you already have running is reused and will not have the fixture.
    env: { JOURNAL_SOURCE_ROOT: "tests/fixtures/sketchbook" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
