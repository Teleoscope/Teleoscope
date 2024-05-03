// Keep this test to see if Playwright itself is broken
import { test, expect } from '@playwright/test';
require("dotenv").config({ path: "./.env.local" });
const TEST_EMAIL = process.env.TEST_EMAIL ? process.env.TEST_EMAIL : ""
const TEST_PASSWORD = process.env.TEST_PASSWORD ? process.env.TEST_PASSWORD : ""


// await page.getByRole('textbox', {name: "password input"}).fill(TEST_PASSWORD);


test('input well-formated email', async ({ page }) => {
  await page.goto('/signup');

  // Click the get started link.
  await page.getByRole('textbox', {name: "email input"}).fill(TEST_EMAIL);
  
  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});