import { defineConfig, devices } from '@playwright/test';
require("dotenv").config({ path: "./.env.local" });

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/** E2E base URL. When set, no webServer is started (use your running app). Default: start app on 3099. */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3099';
/** MongoDB URI for app started by webServer (use localhost when env points at Docker host 'mongodb'). */
const webServerMongoUri =
  process.env.PLAYWRIGHT_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(
    /(mongodb:\/\/)([^@\/]*@)?mongodb(:\d+)?/,
    '$1$2localhost$3'
  );

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: process.env.PLAYWRIGHT_SKIP_ACCOUNT === '1' ? ['account.spec.ts'] : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  expect: { timeout: 60000 },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  /* Start app on 3099 when PLAYWRIGHT_BASE_URL not set (avoids conflict with dev on 3000). */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bash scripts/dev-for-playwright.sh',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          PORT: '3099',
          PLAYWRIGHT_E2E: '1',
          MONGODB_URI: webServerMongoUri,
          MONGODB_HOST: 'localhost',
        },
      },
});
