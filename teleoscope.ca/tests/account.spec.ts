// Keep this test to see if Playwright itself is broken
import { client } from '@/lib/db';
import { test, expect } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { ObjectId } from 'bson';
const projectDir = process.cwd()
loadEnvConfig(projectDir)


let createdUserId: ObjectId | null = null;

test.beforeEach(async () => {
  console.log('Running test setup...');
  if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
    throw Error('Environment variables failed to load.');
  }

  const mongo_client = await client();
  const db = mongo_client.db();

  // Optionally ensure collections exist in dev/test environment
  // await ensure_db_collections_exist(db);

  // Clean up existing user if they exist
  await db.collection('users').deleteMany({ emails: process.env.TEST_EMAIL });

  // Create a new user for the test
  const result = await db.collection('users').insertOne({
    emails: [process.env.TEST_EMAIL],
    hashed_password: 'test_hashed_password',
  });
  
  createdUserId = result.insertedId;
});

test.afterEach(async () => {
  if (!createdUserId) return; // If no user was created, skip cleanup

  const mongo_client = await client();
  const db = mongo_client.db();

  // Delete the created user
  await db.collection('users').deleteOne({ _id: createdUserId });

  // Optionally delete other associated collections
  await db.collection('accounts').deleteMany({ 'users.owner': createdUserId });
  await db.collection('teams').deleteMany({ owner: createdUserId });
  await db.collection('workspaces').deleteMany({ 'team.owner': createdUserId });
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
