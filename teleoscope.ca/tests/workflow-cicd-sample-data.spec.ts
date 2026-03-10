import { Browser, expect, Page, test } from '@playwright/test';
import crypto from 'crypto';
import { chunkRows, readSampleUploadRows } from './helpers/sampleData';

const SAMPLE_SIZE = parsePositiveInt(process.env.PLAYWRIGHT_WORKFLOW_DOC_COUNT, 10);
const CHUNK_SIZE = Math.min(100, SAMPLE_SIZE);
const TEST_PASSWORD = 'WorkflowCICDPassword123!';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3099';
const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000;
const RESULT_TIMEOUT_MS = parsePositiveInt(
  process.env.PLAYWRIGHT_WORKFLOW_RESULT_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS
);

type RankedDoc = [string, number];
type GraphNode = {
  uid: string;
  type: string;
  reference?: string;
  status?: string;
  doclists?: Array<{ ranked_documents?: RankedDoc[] }>;
};

type WorkspaceInfo = {
  _id: string;
  label: string;
  team: string;
  storage?: unknown[];
  workflows?: unknown[];
};

async function apiGetJson<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(path);
  expect(response.ok(), `GET ${path} failed (${response.status()})`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function apiPostJson<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(path, { data });
  expect(response.ok(), `POST ${path} failed (${response.status()})`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function waitFor<T>(
  callback: () => Promise<T | null>,
  timeoutMs: number,
  intervalMs = 1500
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await callback();
    if (value !== null) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asStringId(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object' && '$oid' in (input as Record<string, unknown>)) {
    const oid = (input as { $oid: unknown }).$oid;
    return typeof oid === 'string' ? oid : String(oid);
  }
  return String(input);
}

function rankedCount(node: GraphNode | null): number {
  if (!node?.doclists) {
    return 0;
  }
  return node.doclists.reduce(
    (acc, doclist) => acc + (doclist.ranked_documents?.length ?? 0),
    0
  );
}

function pickSearchTerm(text: string): string {
  const tokens = text.match(/[A-Za-z]{5,}/g) ?? [];
  return tokens[0] ?? 'document';
}

function makeFlowNode(
  uid: string,
  type: string,
  x: number,
  y: number,
  width = 280,
  height = 180
) {
  return {
    id: uid,
    type,
    position: { x, y },
    positionAbsolute: { x, y },
    style: { width, height },
    data: {
      label: uid,
      type,
      uid
    }
  };
}

function makeEdge(
  source: string,
  target: string,
  targetHandleType: 'source' | 'control'
) {
  return {
    id: `reactflow__edge-${crypto.randomUUID()}`,
    source,
    sourceHandle: `${source}_output`,
    target,
    targetHandle: `${target}_${targetHandleType}`
  };
}

async function signUpAndOpenWorkspaceDashboard(page: Page, email: string, password: string) {
  await page.goto('/auth/signup');
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('password').fill(password);
  await page.getByRole('button', { name: 'Sign Up with Email' }).click();
  await page.waitForURL('**/app/dashboard/workspaces', { timeout: 90_000 });
}

test.describe('CI/CD workflow e2e with committed sample datasets', () => {
  test.skip(
    process.env.PLAYWRIGHT_WORKFLOW_CICD_E2E !== '1',
    'Set PLAYWRIGHT_WORKFLOW_CICD_E2E=1 to run full workflow CI/CD e2e'
  );

  test(`covers upload/group/search/rank/setops/workspace/share with sample_${SAMPLE_SIZE}`, async ({
    browser,
    page
  }) => {
    test.setTimeout(RESULT_TIMEOUT_MS + 8 * 60 * 1000);

    const suffix = `${Date.now()}`;
    const ownerEmail = `workflow-owner-${suffix}@test.teleoscope`;
    const collaboratorEmail = `workflow-collab-${suffix}@test.teleoscope`;
    const workspaceLabel = `Workflow CI Workspace ${suffix}`;
    const uploadLabel = `workflow-upload-${suffix}`;
    const uiGroupLabel = `UI Group ${suffix}`;

    await signUpAndOpenWorkspaceDashboard(page, ownerEmail, TEST_PASSWORD);

    // Prepare collaborator account in a separate authenticated browser context.
    const collaboratorContext = await makeContext(browser);
    const collaboratorPage = await collaboratorContext.newPage();
    await signUpAndOpenWorkspaceDashboard(collaboratorPage, collaboratorEmail, TEST_PASSWORD);
    const collaboratorUser = await apiGetJson<{ _id: unknown }>(collaboratorPage, '/api/user');
    const collaboratorUserId = asStringId(collaboratorUser._id);

    const teams = await apiGetJson<Array<{ _id: unknown; label: string }>>(page, '/api/teams');
    expect(teams.length).toBeGreaterThan(0);
    const teamId = asStringId(teams[0]._id);

    await apiPostJson(page, '/api/workspaces', {
      team: teamId,
      label: workspaceLabel
    });

    const workspaceId = await waitFor(async () => {
      const updatedTeams = await apiGetJson<Array<{ _id: unknown; workspaces?: unknown[] }>>(
        page,
        '/api/teams'
      );
      const matchingTeam = updatedTeams.find((team) => asStringId(team._id) === teamId);
      const workspaceIds = (matchingTeam?.workspaces ?? []).map((ws) => asStringId(ws));
      for (const id of workspaceIds) {
        const workspace = await apiGetJson<WorkspaceInfo>(page, `/api/workspace?workspace=${id}`);
        if (workspace?.label === workspaceLabel) {
          return id;
        }
      }
      return null;
    }, 90_000);

    await page.goto(`/workspace/${workspaceId}`);
    await expect(page.locator('.react-flow')).toBeVisible();

    const appState = await apiGetJson<{
      workflow: { _id: unknown };
      workspace?: { storage?: unknown[] };
    }>(page, `/api/app?workspace=${workspaceId}`);
    const workflowId = asStringId(appState.workflow._id);

    const uploadRows = await readSampleUploadRows(SAMPLE_SIZE);
    const searchTerm = pickSearchTerm(uploadRows[0].values.text);
    for (const rows of chunkRows(uploadRows, CHUNK_SIZE)) {
      await apiPostJson(page, '/api/upload/csv/chunk', {
        workspace_id: workspaceId,
        label: uploadLabel,
        data: {
          columns: [
            { key: 'text', name: 'Text' },
            { key: 'title', name: 'Title' },
            { key: 'id', name: 'Id' },
            { key: 'group', name: 'Group' }
          ],
          error: false,
          num_columns: 4,
          num_rows: rows.length,
          rows
        }
      });
    }

    const storage = await waitFor(async () => {
      const app = await apiGetJson<{ workspace?: { storage?: unknown[] } }>(
        page,
        `/api/app?workspace=${workspaceId}`
      );
      const storageIds = (app.workspace?.storage ?? []).map((id) => asStringId(id));
      for (const storageId of storageIds) {
        const item = await apiGetJson<{ _id: unknown; docs: unknown[]; label: string }>(
          page,
          `/api/storage?storage=${storageId}`
        );
        if (item.label === uploadLabel && item.docs.length === SAMPLE_SIZE) {
          return item;
        }
      }
      return null;
    }, RESULT_TIMEOUT_MS);
    const docIds = storage.docs.map((docId) => asStringId(docId));
    expect(docIds.length).toBe(SAMPLE_SIZE);

    await waitFor(async () => {
      const sampleDocIds = [docIds[0], docIds[Math.floor(docIds.length / 2)], docIds[docIds.length - 1]];
      for (const docId of sampleDocIds) {
        const doc = await apiGetJson<{ state?: { vectorized?: boolean } }>(
          page,
          `/api/document?document=${docId}`
        );
        if (!doc.state?.vectorized) {
          return null;
        }
      }
      return true;
    }, RESULT_TIMEOUT_MS);

    // Grouping via API with deterministic halves.
    const splitIdx = Math.ceil(docIds.length / 2);
    const groupADocs = docIds.slice(0, splitIdx);
    const groupBDocs = docIds.slice(splitIdx);
    const groupAInsert = await apiPostJson<{ insertedId: unknown }>(page, '/api/group/add', {
      group: {
        color: '#246BCE',
        docs: groupADocs,
        label: `API Group A ${suffix}`,
        workspace: workspaceId
      }
    });
    const groupBInsert = await apiPostJson<{ insertedId: unknown }>(page, '/api/group/add', {
      group: {
        color: '#A0522D',
        docs: groupBDocs,
        label: `API Group B ${suffix}`,
        workspace: workspaceId
      }
    });
    const groupAId = asStringId(groupAInsert.insertedId);
    const groupBId = asStringId(groupBInsert.insertedId);

    // Grouping via UI.
    await page.getByRole('button', { name: 'Groups' }).click();
    await page.getByLabel('Create new group...').fill(uiGroupLabel);
    await page.getByLabel('Create new group...').press('Enter');
    await expect(page.getByText(uiGroupLabel).first()).toBeVisible({ timeout: 60_000 });

    const uiGroup = await waitFor(async () => {
      const groups = await apiGetJson<Array<{ _id: unknown; label: string }>>(
        page,
        `/api/groups?workspace=${workspaceId}`
      );
      return groups.find((group) => group.label === uiGroupLabel) ?? null;
    }, 60_000);
    expect(uiGroup).toBeTruthy();

    // Build graph nodes for rank-by-group, rank-by-document, and set operations.
    const groupAUid = crypto.randomUUID();
    const groupBUid = crypto.randomUUID();
    const documentUid = crypto.randomUUID();
    const searchUid = crypto.randomUUID();
    const rankGroupUid = crypto.randomUUID();
    const rankDocumentUid = crypto.randomUUID();
    const unionUid = crypto.randomUUID();
    const intersectionUid = crypto.randomUUID();
    const differenceUid = crypto.randomUUID();
    const exclusionUid = crypto.randomUUID();

    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: groupAUid,
      type: 'Group',
      reference: groupAId,
      parameters: { index: 1 }
    });
    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: groupBUid,
      type: 'Group',
      reference: groupBId,
      parameters: { index: 2 }
    });
    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: documentUid,
      type: 'Document',
      reference: docIds[0],
      parameters: { index: 3 }
    });

    for (const [uid, type] of [
      [searchUid, 'Search'],
      [rankGroupUid, 'Rank'],
      [rankDocumentUid, 'Rank'],
      [unionUid, 'Union'],
      [intersectionUid, 'Intersection'],
      [differenceUid, 'Difference'],
      [exclusionUid, 'Exclusion']
    ] as Array<[string, string]>) {
      await apiPostJson(page, '/api/graph/add', {
        workflow_id: workflowId,
        workspace_id: workspaceId,
        uid,
        type,
        parameters: { index: 10, distance: 0.8 }
      });
    }

    await apiPostJson(page, '/api/graph/edge/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      changes: [
        { source: searchUid, target: rankGroupUid, type: 'source' },
        { source: groupAUid, target: rankGroupUid, type: 'control' },
        { source: searchUid, target: rankDocumentUid, type: 'source' },
        { source: documentUid, target: rankDocumentUid, type: 'control' },
        { source: groupAUid, target: unionUid, type: 'source' },
        { source: groupBUid, target: unionUid, type: 'control' },
        { source: groupAUid, target: intersectionUid, type: 'source' },
        { source: groupBUid, target: intersectionUid, type: 'control' },
        { source: groupAUid, target: differenceUid, type: 'source' },
        { source: groupBUid, target: differenceUid, type: 'control' },
        { source: groupAUid, target: exclusionUid, type: 'source' },
        { source: groupBUid, target: exclusionUid, type: 'control' }
      ]
    });

    const searchGraphNode = await waitFor(
      async () => apiGetJson<GraphNode | null>(page, `/api/graph?uid=${searchUid}`),
      60_000
    );
    expect(searchGraphNode?.reference).toBeTruthy();
    await apiPostJson(page, '/api/search/update', {
      workspace_id: workspaceId,
      search_id: asStringId(searchGraphNode.reference),
      query: searchTerm
    });
    await apiPostJson(page, '/api/graph/update', {
      workspace_id: workspaceId,
      workflow_id: workflowId,
      uid: searchUid,
      parameters: { index: 10 }
    });

    const workflow = await apiGetJson<{
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string }>;
    }>(page, `/api/workflow?workflow=${workflowId}`);
    const existingNodeIds = new Set(workflow.nodes.map((node) => node.id));
    const newNodes = [
      makeFlowNode(groupAUid, 'Group', 120, 80),
      makeFlowNode(groupBUid, 'Group', 120, 310),
      makeFlowNode(documentUid, 'Document', 120, 540, 360, 260),
      makeFlowNode(searchUid, 'Search', 520, 80, 360, 260),
      makeFlowNode(rankGroupUid, 'Rank', 920, 80, 360, 260),
      makeFlowNode(rankDocumentUid, 'Rank', 920, 390, 360, 260),
      makeFlowNode(unionUid, 'Union', 520, 370),
      makeFlowNode(intersectionUid, 'Intersection', 520, 520),
      makeFlowNode(differenceUid, 'Difference', 520, 670),
      makeFlowNode(exclusionUid, 'Exclusion', 520, 820)
    ].filter((node) => !existingNodeIds.has(node.id));
    const newEdges = [
      makeEdge(searchUid, rankGroupUid, 'source'),
      makeEdge(groupAUid, rankGroupUid, 'control'),
      makeEdge(searchUid, rankDocumentUid, 'source'),
      makeEdge(documentUid, rankDocumentUid, 'control'),
      makeEdge(groupAUid, unionUid, 'source'),
      makeEdge(groupBUid, unionUid, 'control'),
      makeEdge(groupAUid, intersectionUid, 'source'),
      makeEdge(groupBUid, intersectionUid, 'control'),
      makeEdge(groupAUid, differenceUid, 'source'),
      makeEdge(groupBUid, differenceUid, 'control'),
      makeEdge(groupAUid, exclusionUid, 'source'),
      makeEdge(groupBUid, exclusionUid, 'control')
    ];
    await apiPostJson(page, '/api/workflow', {
      ...workflow,
      nodes: [...workflow.nodes, ...newNodes],
      edges: [...workflow.edges, ...newEdges]
    });

    // Validate API search endpoint.
    const searchResults = await apiGetJson<Array<{ _id: unknown }>>(
      page,
      `/api/search?workspace=${workspaceId}&query=${encodeURIComponent(searchTerm)}`
    );
    expect(searchResults.length).toBeGreaterThan(0);

    // Validate rank nodes (group + document controls).
    const rankGroupNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${rankGroupUid}`);
        return rankedCount(node) > 0 ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    const rankDocumentNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${rankDocumentUid}`);
        return rankedCount(node) > 0 ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    expect(rankedCount(rankGroupNode)).toBeGreaterThan(0);
    expect(rankedCount(rankDocumentNode)).toBeGreaterThan(0);

    // Validate all set-operation counts.
    const expectedUnion = new Set([...groupADocs, ...groupBDocs]).size;
    const expectedIntersection = groupADocs.filter((id) => groupBDocs.includes(id)).length;
    const expectedDifference = groupADocs.filter((id) => !groupBDocs.includes(id)).length;
    const expectedExclusion = expectedUnion - expectedIntersection;

    const unionNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${unionUid}`);
        return rankedCount(node) === expectedUnion ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    const intersectionNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${intersectionUid}`);
        return rankedCount(node) === expectedIntersection ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    const differenceNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${differenceUid}`);
        return rankedCount(node) === expectedDifference ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    const exclusionNode = await waitFor(
      async () => {
        const node = await apiGetJson<GraphNode | null>(page, `/api/graph?uid=${exclusionUid}`);
        return rankedCount(node) === expectedExclusion ? node : null;
      },
      RESULT_TIMEOUT_MS
    );
    expect(rankedCount(unionNode)).toBe(expectedUnion);
    expect(rankedCount(intersectionNode)).toBe(expectedIntersection);
    expect(rankedCount(differenceNode)).toBe(expectedDifference);
    expect(rankedCount(exclusionNode)).toBe(expectedExclusion);

    await page.reload();
    await expect(page.locator('.react-flow')).toBeVisible();

    const firstRankedDocIdRaw = rankGroupNode.doclists?.[0]?.ranked_documents?.[0]?.[0];
    expect(firstRankedDocIdRaw).toBeTruthy();
    const firstRankedDocId = asStringId(firstRankedDocIdRaw);
    await apiPostJson(page, '/api/document/mark', {
      workspace_id: workspaceId,
      read: true,
      document: firstRankedDocId
    });
    await waitFor(async () => {
      const doc = await apiGetJson<{ state?: { read?: boolean } }>(
        page,
        `/api/document?document=${firstRankedDocId}`
      );
      return doc.state?.read ? true : null;
    }, 60_000);

    // Share workspace data with collaborator user.
    const workspaceDetails = await apiGetJson<{ team: unknown }>(
      page,
      `/api/workspace?workspace=${workspaceId}`
    );
    const sharingTeamId = asStringId(workspaceDetails.team);

    const existsResponse = await apiGetJson<{ exists: boolean }>(
      page,
      `/api/users?email=${encodeURIComponent(collaboratorEmail)}`
    );
    expect(existsResponse.exists).toBeTruthy();

    const addCollaboratorResponse = await page.request.post('/api/users', {
      multipart: {
        email: collaboratorEmail,
        teamId: sharingTeamId
      }
    });
    expect(addCollaboratorResponse.ok()).toBeTruthy();

    await waitFor(async () => {
      const team = await apiGetJson<{ users?: Array<{ _id: unknown }> }>(
        page,
        `/api/team?team=${sharingTeamId}`
      );
      const userIds = (team.users ?? []).map((entry) => asStringId(entry._id));
      return userIds.includes(collaboratorUserId) ? true : null;
    }, 90_000);

    await collaboratorPage.goto(`/workspace/${workspaceId}`);
    await expect(collaboratorPage.locator('.react-flow')).toBeVisible({ timeout: 60_000 });
    const collaboratorApp = await apiGetJson<{
      workspace?: { storage?: unknown[] };
    }>(collaboratorPage, `/api/app?workspace=${workspaceId}`);
    expect((collaboratorApp.workspace?.storage ?? []).length).toBeGreaterThan(0);

    await collaboratorContext.close();
  });
});

async function makeContext(browser: Browser) {
  return browser.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true
  });
}
