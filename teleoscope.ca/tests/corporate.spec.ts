import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {

    await page.goto('/');

    // Expect page to load
    await expect(page).toHaveTitle(/Teleoscope/);

});