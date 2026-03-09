import { expect, test } from '@playwright/test';

test.describe('public demo mode', () => {
  test('serves demo API dataset without auth', async ({ request }) => {
    const response = await request.get('/api/demo/posts?limit=10');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.total).toBe(1000);
    expect(body.posts).toHaveLength(10);
  });

  test('demo page is accessible and interactive without login', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('Public Demo Workspace')).toBeVisible();
    await expect(page.getByText('No login required.')).toBeVisible();

    const totalCount = page.getByTestId('demo-total-count');
    await expect(totalCount).toHaveText('1000');

    const resultCount = page.getByTestId('demo-result-count');
    const before = Number.parseInt((await resultCount.innerText()).trim(), 10);

    await page.getByTestId('demo-operation').selectOption('union');
    await expect(resultCount).not.toHaveText(before.toString());

    await page.getByTestId('demo-search').fill('wedding');
    await expect(page.getByTestId('demo-post-row').first()).toBeVisible();
  });

  test('docs reference includes interactive boolean playground', async ({ page }) => {
    await page.goto('/resources/reference');
    await expect(
      page.getByRole('heading', { name: 'Interactive Playground' })
    ).toBeVisible();
    await expect(page.getByTestId('set-op-union')).toBeVisible();
    await page.getByTestId('set-op-difference').click();
    await expect(page.getByText('Result (A - B)')).toBeVisible();
  });
});
