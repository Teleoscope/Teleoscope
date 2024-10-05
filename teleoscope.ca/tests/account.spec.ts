// Keep this test to see if Playwright itself is broken
import { client } from '@/lib/db';
import { test, expect } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd()
loadEnvConfig(projectDir)



test.beforeEach(async () => {
  console.log('Running test setup...') ;
  if (
    !process.env.TEST_EMAIL ||
    !process.env.TEST_PASSWORD
  ) {
    throw Error("Environment variables failed to load.")
  }  
  const mongo_client = await client()
  const db = mongo_client.db()
  await db.dropDatabase()
});

test('successful signup', async ({ page }) => {
  if (
    !process.env.TEST_EMAIL ||
    !process.env.TEST_PASSWORD
  ) {
    throw Error("Environment variables failed to load.")
  }  


  await page.goto('/auth/signup');
  await page.getByPlaceholder('name@example.com').click();
  await page.getByPlaceholder('name@example.com').fill(process.env.TEST_EMAIL);
  await page.getByPlaceholder('name@example.com').press('Tab');
  await page.getByPlaceholder('password').fill(process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign Up with Email' }).click();
  await page.screenshot({ path: 'screenshot.png' })

  await page.waitForURL('/app/dashboard/workspaces');

  await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
});


test('password validation fail', async ({ page }) => {
  await page.goto('/auth/signup');
  await page.getByPlaceholder('name@example.com').click();
  await page.getByPlaceholder('name@example.com').fill('test@test.test');
  await page.getByPlaceholder('name@example.com').press('Tab');
  await page.getByPlaceholder('password').fill('test');
  await page.getByPlaceholder('password').press('Tab');
  await page.getByRole('button', { name: 'Sign Up with Email' }).click();
  await expect(page.getByText('Password must be at least 8')).toBeVisible();
});
