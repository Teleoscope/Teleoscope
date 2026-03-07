/**
 * App-level Playwright tests: signup, dashboard, workspace interaction.
 * Runs against a live app + MongoDB.  Skipped if PLAYWRIGHT_SKIP_APP=1.
 */
import { test, expect } from '@playwright/test';

const SKIP = process.env.PLAYWRIGHT_SKIP_APP === '1';
const TEST_EMAIL = `pw-${Date.now()}@test.teleoscope`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe('App flow', () => {
  test.skip(() => SKIP, 'PLAYWRIGHT_SKIP_APP=1');

  test('signup → dashboard → open workspace', async ({ page }) => {
    test.setTimeout(60000);

    // Signup
    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();

    // Should land on dashboard
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    await expect(page.getByText('Default workspace')).toBeVisible();

    // Open Default workspace via link click
    await page.getByRole('link', { name: 'Default workspace' }).click();
    await page.waitForURL('**/workspace/**', { timeout: 30000 });

    // Workspace canvas should render
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  });

  test('signin with existing account', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/auth/signin');
    await page.getByPlaceholder('name@example.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In with Email' }).click();

    await page.waitForURL('**/app/dashboard**', { timeout: 45000 });
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });
  });
});
