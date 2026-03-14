import { expect, test } from '@playwright/test';

/**
 * Demo UI test suite.
 * Opens the public demo and asserts we land on the demo workspace.
 * Add more tests here as needed.
 */
test.describe('demo', () => {
  test('opens the demo and lands on demo workspace', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/workspace\/[^/?]+(\?.*)?demo=1/);
    await expect(page.getByText('Default workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Data' })).toBeVisible();
  });
});
