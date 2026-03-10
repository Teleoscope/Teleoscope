import { expect, test } from '@playwright/test';
import { chunkRows, readSampleUploadRows } from './helpers/sampleData';

const SAMPLE_SIZE = Number.parseInt(process.env.PLAYWRIGHT_UI_SAMPLE_DOC_COUNT ?? '10', 10) || 10;
const CHUNK_SIZE = Math.min(100, SAMPLE_SIZE);

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
  throw new Error(`Timed out after ${timeoutMs}ms waiting for export files`);
}

test.describe('Export buttons system e2e', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_EXPORT_E2E !== '1',
    'Set PLAYWRIGHT_UI_EXPORT_E2E=1 to run export button system e2e'
  );

  test('group export buttons call expected APIs', async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    const email = `ui-export-${Date.now()}@test.teleoscope`;
    const password = 'ExportButtonsPassword123!';
    const uploadRows = await readSampleUploadRows(SAMPLE_SIZE);
    const uploadLabel = `ui-export-upload-${Date.now()}`;

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

    const baselineFilesResponse = await page.request.get(`/api/download/files?workspace=${workspaceId}`);
    expect(baselineFilesResponse.ok()).toBeTruthy();
    const baselineFiles = await baselineFilesResponse.json();
    const existingFilenames = new Set<string>((baselineFiles ?? []).map((f: { filename: string }) => f.filename));

    for (const rows of chunkRows(uploadRows, CHUNK_SIZE)) {
      const uploadResponse = await page.request.post('/api/upload/csv/chunk', {
        data: {
          workspace_id: workspaceId,
          label: uploadLabel,
          data: {
            columns: [
              { key: 'text', name: 'Text' },
              { key: 'title', name: 'Title' },
              { key: 'group', name: 'Group' },
              { key: 'id', name: 'Id' }
            ],
            error: false,
            num_columns: 4,
            num_rows: rows.length,
            rows
          }
        }
      });
      expect(uploadResponse.ok()).toBeTruthy();
    }

    await expect
      .poll(async () => {
        const groupsResponse = await page.request.get(`/api/groups?workspace=${workspaceId}`);
        if (!groupsResponse.ok()) {
          return 0;
        }
        const groups = await groupsResponse.json();
        return Array.isArray(groups) ? groups.length : 0;
      }, { timeout: 120_000 })
      .toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Groups' }).click();
    await expect(
      page.getByRole('button', { name: 'Download as XLSX' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Download as Docx' }).first()
    ).toBeVisible();

    await page.getByRole('button', { name: 'Download as XLSX' }).first().click();
    await page.getByRole('button', { name: 'Download as Docx' }).first().click();

    const files = await waitForValue(async () => {
        const filesResponse = await page.request.get(`/api/download/files?workspace=${workspaceId}`);
        if (!filesResponse.ok()) {
          return null;
        }
        const files = await filesResponse.json() as Array<{ filename: string; status?: { ready?: boolean } }>;
        const created = (files ?? []).filter((f) => !existingFilenames.has(f.filename));
        const docxReady = created.some((f) => f.filename.endsWith('.docx') && f.status?.ready);
        const xlsxReady = created.some((f) => f.filename.endsWith('.xlsx') && f.status?.ready);
        return docxReady && xlsxReady ? created : null;
      }, 180_000);

    const docx = files.find((f) => f.filename.endsWith('.docx'));
    const xlsx = files.find((f) => f.filename.endsWith('.xlsx'));
    expect(docx).toBeTruthy();
    expect(xlsx).toBeTruthy();

    const docxStatus = await page.request.get(
      `/api/download/status?filename=${encodeURIComponent(docx!.filename)}`
    );
    const xlsxStatus = await page.request.get(
      `/api/download/status?filename=${encodeURIComponent(xlsx!.filename)}`
    );
    expect(docxStatus.ok()).toBeTruthy();
    expect(xlsxStatus.ok()).toBeTruthy();
    const docxFile = await docxStatus.json();
    const xlsxFile = await xlsxStatus.json();
    expect(docxFile?.status?.ready).toBeTruthy();
    expect(xlsxFile?.status?.ready).toBeTruthy();
  });
});
