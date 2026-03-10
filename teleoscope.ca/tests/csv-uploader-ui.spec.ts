import { expect, test } from '@playwright/test';
import { copySampleCsvTo } from './helpers/sampleData';

const SAMPLE_SIZE = Number.parseInt(process.env.PLAYWRIGHT_UI_SAMPLE_DOC_COUNT ?? '10', 10) || 10;

test.describe('CSV uploader UI system e2e', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_UPLOADER_E2E !== '1',
    'Set PLAYWRIGHT_UI_UPLOADER_E2E=1 to run CSV uploader UI system e2e'
  );

  test('imports CSV through UI and sends chunk upload requests', async ({
    page
  }, testInfo) => {
    test.setTimeout(3 * 60 * 1000);

    const email = `ui-uploader-${Date.now()}@test.teleoscope`;
    const password = 'UploaderUiPassword123!';
    const capturedUploads: Array<{
      workspace_id: string;
      label: string;
      data: { rows: unknown[]; num_rows: number };
    }> = [];

    await page.route('**/api/upload/csv/chunk', async (route) => {
      const body = route.request().postDataJSON() as {
        workspace_id: string;
        label: string;
        data: { rows: unknown[]; num_rows: number };
      };
      capturedUploads.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' })
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

    await page.getByRole('button', { name: 'Data' }).click();
    await page.getByRole('button', { name: 'Open CSV Importer' }).click();

    const csvPath = await copySampleCsvTo(
      testInfo.outputPath(`csv-uploader-system-sample-${SAMPLE_SIZE}.csv`),
      SAMPLE_SIZE
    );

    const dialogLike = page
      .locator('[role="dialog"], .chakra-modal__content, .ReactModal__Content')
      .first();
    if (await dialogLike.isVisible().catch(() => false)) {
      const modalInput = dialogLike.locator('input[type="file"]').first();
      if ((await modalInput.count()) > 0) {
        await modalInput.setInputFiles(csvPath);
      } else {
        await page.locator('input[type="file"]').last().setInputFiles(csvPath);
      }
    } else {
      await page.locator('input[type="file"]').last().setInputFiles(csvPath);
    }

    const uploadButton = page.getByRole('button', { name: /^Upload$/i }).first();
    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
    }

    for (let i = 0; i < 5; i += 1) {
      const continueButton = page.getByRole('button', { name: /^Continue$/i }).first();
      if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click();
        continue;
      }
      break;
    }

    const submitButton = page.getByRole('button', { name: /^Submit$/i }).first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
    }

    const doneButton = page.getByRole('button', { name: /^Done$/i }).first();
    if (await doneButton.isVisible().catch(() => false)) {
      await doneButton.click();
    }

    await expect
      .poll(() => capturedUploads.length, {
        timeout: 30_000,
        message: 'Expected CSV uploader UI to send /api/upload/csv/chunk request(s)'
      })
      .toBeGreaterThan(0);

    expect(capturedUploads[0].workspace_id).toBeTruthy();
    expect(capturedUploads[0].label).toBeTruthy();
    expect(capturedUploads[0].data.num_rows).toBeGreaterThan(0);
    expect(capturedUploads[0].data.rows.length).toBeGreaterThan(0);
  });
});
