/**
 * API route smoke tests.
 * Verifies key endpoints respond correctly.
 */
import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/hello returns JSON', async ({ request }) => {
    const res = await request.get('/api/hello');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('hello', 'world');
  });

  test('POST /api/upload/csv/chunk requires auth', async ({ request }) => {
    const res = await request.post('/api/upload/csv/chunk', {
      data: { workspace_id: 'fake', data: { rows: [] }, label: 'test' },
    });
    const body = await res.json();
    expect(body.message).toContain('No user signed in');
  });

  test('GET /api/workspaces requires auth', async ({ request }) => {
    const res = await request.get('/api/workspaces');
    const body = await res.json();
    expect(body.message || body.error).toBeTruthy();
  });

  test('GET /api/groups requires auth', async ({ request }) => {
    const res = await request.get('/api/groups');
    const body = await res.json();
    expect(body.message || body.error).toBeTruthy();
  });

  test('GET /api/documents requires auth', async ({ request }) => {
    const res = await request.get('/api/document');
    const body = await res.json();
    expect(body.message || body.error).toBeTruthy();
  });
});
