import { expect, test } from '@playwright/test';

type ExportPayload = {
  workspace_id: string;
  group_ids: unknown[];
  storage_ids: unknown[];
};

test.describe('Export buttons system e2e', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_EXPORT_E2E !== '1',
    'Set PLAYWRIGHT_UI_EXPORT_E2E=1 to run export button system e2e'
  );

  test('group export buttons call expected APIs', async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    const email = `ui-export-${Date.now()}@test.teleoscope`;
    const password = 'ExportButtonsPassword123!';
    const capturedDocx: ExportPayload[] = [];
    const capturedXlsx: ExportPayload[] = [];

    await page.route('**/api/download/prepare/docx', async (route) => {
      capturedDocx.push(route.request().postDataJSON() as ExportPayload);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ msg: 'sent generate_docx task' })
      });
    });
    await page.route('**/api/download/prepare/xlsx', async (route) => {
      capturedXlsx.push(route.request().postDataJSON() as ExportPayload);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ msg: 'sent generate_xlsx task' })
      });
    });

    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('password').fill(password);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 60_000 });
    await page.getByText('Default workspace').first().click({ clickCount: 2 });
    await page.waitForURL('**/workspace/**', { timeout: 60_000 });
    await expect(page.locator('.react-flow')).toBeVisible();

    await page.getByRole('button', { name: 'Groups' }).click();
    await expect(
      page.getByRole('button', { name: 'Download as XLSX' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Download as Docx' }).first()
    ).toBeVisible();

    await page.getByRole('button', { name: 'Download as XLSX' }).first().click();
    await page.getByRole('button', { name: 'Download as Docx' }).first().click();

    await expect
      .poll(() => capturedXlsx.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => capturedDocx.length, { timeout: 30_000 })
      .toBeGreaterThan(0);

    expect(capturedXlsx[0].workspace_id).toBeTruthy();
    expect(Array.isArray(capturedXlsx[0].group_ids)).toBeTruthy();
    expect(Array.isArray(capturedXlsx[0].storage_ids)).toBeTruthy();

    expect(capturedDocx[0].workspace_id).toBeTruthy();
    expect(Array.isArray(capturedDocx[0].group_ids)).toBeTruthy();
    expect(Array.isArray(capturedDocx[0].storage_ids)).toBeTruthy();
  });
});
