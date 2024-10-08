import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {

    await page.goto('http://127.0.0.1:3000');

    // Expect page to load
    await expect(page).toHaveTitle(/Teleoscope/);

});