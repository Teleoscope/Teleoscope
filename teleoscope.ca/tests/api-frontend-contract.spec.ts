import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8');
}

function expectOrderedTokens(source: string, anchor: string, tokens: string[]) {
  const anchorIdx = source.indexOf(anchor);
  expect(anchorIdx, `Anchor "${anchor}" not found`).toBeGreaterThan(-1);
  const window = source.slice(anchorIdx, anchorIdx + 2000);

  let cursor = 0;
  for (const token of tokens) {
    const idx = window.indexOf(token, cursor);
    expect(idx, `Token "${token}" missing after "${anchor}"`).toBeGreaterThan(-1);
    cursor = idx + token.length;
  }
}

test.describe('Frontend/API contract consistency', () => {
  test('workflow relabel payload keys match route contract', async () => {
    const frontend = read('src/lib/store.ts');
    const backend = read('src/app/api/workflow/relabel/route.ts');

    expectOrderedTokens(frontend, '/api/workflow/relabel', [
      'workspace_id',
      'workflow_id',
      'label'
    ]);
    expect(frontend.includes('label: action.payload.document_id')).toBeFalsy();

    expectOrderedTokens(backend, 'const {', [
      'workspace_id',
      'workflow_id',
      'label'
    ]);
  });

  test('csv chunk uploader keys match route contract', async () => {
    const frontend = read('src/components/UploadPage.tsx');
    const backend = read('src/app/api/upload/csv/chunk/route.ts');

    expectOrderedTokens(frontend, '/api/upload/csv/chunk', [
      'workspace_id',
      'data',
      'label'
    ]);
    expectOrderedTokens(backend, 'const { workspace_id, data, label }', [
      'workspace_id',
      'data',
      'label'
    ]);
  });

  test('legacy CSV uploader uses /api/upload with expected multipart keys', async () => {
    const frontend = read('src/components/CSVUploader.tsx');
    const backend = read('src/app/api/upload/route.ts');

    expect(frontend.includes('/api/upload/csv')).toBeFalsy();
    expect(frontend.includes("/api/upload'")).toBeTruthy();
    expectOrderedTokens(frontend, "formData.append('file'", [
      "formData.append('file'",
      "formData.append('workflow_id'",
      "formData.append('workspace_id'",
      "formData.append('headerLine_row'",
      "formData.append('uid_column'",
      "formData.append('title_column'",
      "formData.append('text_column'",
      "formData.append('group_columns'"
    ]);

    expectOrderedTokens(backend, 'interface FileFormData', [
      'file',
      'workflow_id',
      'workspace_id',
      'headerLine_row',
      'uid_column',
      'title_column',
      'text_column',
      'group_columns'
    ]);
  });

  test('workspace collaborator UI keys match existing user/team/workspace routes', async () => {
    const frontend = read('src/components/Workspaces/WorkspaceCollaboratorsModal.tsx');
    const usersRoute = read('src/app/api/users/route.ts');
    const workspaceRoute = read('src/app/api/workspace/route.ts');
    const teamRoute = read('src/app/api/team/route.ts');

    expect(frontend.includes('/api/users?email=')).toBeTruthy();
    expect(frontend.includes("fetch(`/api/users`, {\n      method: \"POST\"")).toBeTruthy();
    expect(frontend.includes("fetch(`/api/users`, {\n      method: \"DELETE\"")).toBeTruthy();
    expect(frontend.includes('/api/workspace?workspace=')).toBeTruthy();
    expect(frontend.includes('/api/team?team=')).toBeTruthy();

    expectOrderedTokens(usersRoute, "const email = formData.get('email')", [
      "formData.get('email')",
      "formData.get('teamId')"
    ]);
    expectOrderedTokens(usersRoute, 'const { userId, teamId } = await request.json();', [
      'userId',
      'teamId'
    ]);

    expect(workspaceRoute.includes("searchParams.get('workspace')")).toBeTruthy();
    expect(teamRoute.includes("searchParams.get('team')")).toBeTruthy();
  });
});
