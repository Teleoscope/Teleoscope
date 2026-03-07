import { expect, test } from '@playwright/test';

test.describe('Sidebar component panels e2e', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_COMPONENT_E2E !== '1',
    'Set PLAYWRIGHT_UI_COMPONENT_E2E=1 to run sidebar component e2e checks'
  );

  test('opens each primary sidebar component panel', async ({ page }) => {
    test.setTimeout(2 * 60 * 1000);

    const email = `ui-components-${Date.now()}@test.teleoscope`;
    const password = 'SidebarComponentsPassword123!';
    const sidebarTabs = [
      'Data',
      'Workflows',
      'Groups',
      'Bookmarks',
      'Notes',
      'Settings'
    ];

    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('password').fill(password);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 60_000 });

    await page.getByText('Default workspace').first().click({ clickCount: 2 });
    await page.waitForURL('**/workspace/**', { timeout: 60_000 });
    await expect(page.locator('.react-flow')).toBeVisible();

    for (const tabName of sidebarTabs) {
      const tabButton = page.getByRole('button', { name: tabName });
      await tabButton.click();
      await expect(tabButton).toBeVisible();
      await expect(tabButton).toHaveAttribute('aria-expanded', 'true');
    }
  });
});
