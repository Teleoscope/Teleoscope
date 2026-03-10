import { expect, test } from '@playwright/test';
import { copySampleCsvTo, readSampleUploadRows } from './helpers/sampleData';

const SAMPLE_SIZE = Number.parseInt(process.env.PLAYWRIGHT_UI_SAMPLE_DOC_COUNT ?? '10', 10) || 10;

async function waitForValue<T>(
  callback: () => Promise<T | null>,
  timeoutMs: number,
  intervalMs = 1000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await callback();
    if (value !== null) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for uploader side effects`);
}

test.describe('CSV uploader UI system e2e', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_UPLOADER_E2E !== '1',
    'Set PLAYWRIGHT_UI_UPLOADER_E2E=1 to run CSV uploader UI system e2e'
  );

  test('imports CSV through UI and sends chunk upload requests', async ({
    page
  }, testInfo) => {
    test.setTimeout(6 * 60 * 1000);

    const email = `ui-uploader-${Date.now()}@test.teleoscope`;
    const password = 'UploaderUiPassword123!';
    const expectedRows = await readSampleUploadRows(SAMPLE_SIZE);

    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('password').fill(password);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 60_000 });

    await page.getByText('Default workspace').first().click({ clickCount: 2 });
    await page.waitForURL('**/workspace/**', { timeout: 60_000 });
    await expect(page.locator('.react-flow')).toBeVisible();
    const workspaceId = page.url().split('/workspace/')[1]?.split(/[?#]/)[0];
    expect(workspaceId).toBeTruthy();

    const baselineApp = await page.request.get(`/api/app?workspace=${workspaceId}`);
    expect(baselineApp.ok()).toBeTruthy();
    const baselineJson = await baselineApp.json();
    const existingStorageIds = new Set<string>((baselineJson.workspace?.storage ?? []).map(String));

    await page.getByRole('button', { name: 'Data' }).click();
    await page.getByRole('button', { name: 'Open CSV Importer' }).click();

    const csvPath = await copySampleCsvTo(
      testInfo.outputPath(`csv-uploader-system-sample-${SAMPLE_SIZE}.csv`),
      SAMPLE_SIZE
    );

    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    expect(fileInputCount).toBeGreaterThan(0);
    await fileInputs.nth(fileInputCount - 1).setInputFiles(csvPath);

    const uploadButton = page.getByRole('button', { name: /^Upload$/i });
    if (await uploadButton.count()) {
      await uploadButton.first().click();
    }

    for (let i = 0; i < 8; i += 1) {
      const continueButton = page.getByRole('button', { name: /^Continue$/i });
      if ((await continueButton.count()) > 0) {
        await continueButton.first().click();
      } else {
        break;
      }
    }

    const submitButton = page.getByRole('button', { name: /^Submit$/i });
    if ((await submitButton.count()) > 0) {
      await submitButton.first().click();
    }

    const doneButton = page.getByRole('button', { name: /^Done$/i });
    if ((await doneButton.count()) > 0) {
      await doneButton.first().click();
    }

    const storageItem = await waitForValue(async () => {
        const appRes = await page.request.get(`/api/app?workspace=${workspaceId}`);
        if (!appRes.ok()) {
          return null;
        }
        const app = await appRes.json();
        const storageIds: string[] = (app.workspace?.storage ?? []).map(String);
        for (const storageId of storageIds) {
          if (existingStorageIds.has(storageId)) {
            continue;
          }
          const storageRes = await page.request.get(`/api/storage?storage=${storageId}`);
          if (!storageRes.ok()) {
            continue;
          }
          const storageItem = await storageRes.json();
          if (Array.isArray(storageItem.docs) && storageItem.docs.length === expectedRows.length) {
            return storageItem;
          }
        }
        return null;
      }, 120_000);

    const sampleDocId = (storageItem as { docs: string[] }).docs[0];
    expect(sampleDocId).toBeTruthy();
    await expect
      .poll(async () => {
        const docRes = await page.request.get(`/api/document?document=${sampleDocId}`);
        if (!docRes.ok()) {
          return false;
        }
        const doc = await docRes.json();
        return typeof doc?.text === 'string' && typeof doc?.title === 'string' && doc.text.length > 0;
      }, { timeout: 60_000 })
      .toBe(true);

  });
});
