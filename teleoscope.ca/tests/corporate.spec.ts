import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {

    await page.goto('http://localhost:3000');

    // Expect page to load
    await expect(page);
});