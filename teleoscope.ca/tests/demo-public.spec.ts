import { expect, test } from '@playwright/test';

test.describe('public demo mode', () => {
  test('serves demo API dataset without auth', async ({ request }) => {
    const response = await request.get('/api/demo/posts?limit=10');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.total).toBe(1000);
    expect(body.posts).toHaveLength(10);
  });

  test('demo route boots anonymous workspace without login', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/workspace\/[^/?]+(\?.*)?demo=1/);
    await expect(page.getByText('Default workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Data' })).toBeVisible();
  });

  test('docs reference includes interactive boolean playground', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/resources/reference', { timeout: 60_000 });
    await expect(
      page.getByRole('heading', { name: 'Interactive Playground' })
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('set-op-union')).toBeVisible();
    await page.getByTestId('set-op-difference').click();
    await expect(page.getByText('Result (A - B)')).toBeVisible();
  });
});
