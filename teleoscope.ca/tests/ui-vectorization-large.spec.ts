import { expect, Page, test } from '@playwright/test';
import crypto from 'crypto';

const DOC_COUNT = 1000;
const CHUNK_SIZE = 200;
const TEST_PASSWORD = 'VectorE2EPassword123!';
const RESULT_TIMEOUT_MS = 12 * 60 * 1000;

type RankedDoc = [string, number];

type GraphNode = {
  uid: string;
  type: string;
  doclists?: Array<{ ranked_documents?: RankedDoc[] }>;
  status?: string;
};

async function apiGetJson(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), `GET ${path} failed (${response.status()})`).toBeTruthy();
  return response.json();
}

async function apiPostJson(page: Page, path: string, data: unknown) {
  const response = await page.request.post(path, { data });
  expect(response.ok(), `POST ${path} failed (${response.status()})`).toBeTruthy();
  return response.json();
}

async function waitFor<T>(
  callback: () => Promise<T | null>,
  timeoutMs: number,
  intervalMs = 2000
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

function rankedCount(node: GraphNode | null): number {
  if (!node?.doclists) {
    return 0;
  }
  return node.doclists.reduce(
    (acc, doclist) => acc + (doclist.ranked_documents?.length ?? 0),
    0
  );
}

function makeFlowNode(
  uid: string,
  type: string,
  x: number,
  y: number,
  width = 220,
  height = 36
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
  const id = `reactflow__edge-${crypto.randomUUID()}`;
  return {
    id,
    source,
    sourceHandle: `${source}_output`,
    target,
    targetHandle: `${target}_${targetHandleType}`
  };
}

test.describe('UI E2E: large upload, vectorization, ranking, set ops', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_VECTOR_E2E !== '1',
    'Set PLAYWRIGHT_UI_VECTOR_E2E=1 to run large UI vectorization E2E'
  );

  test('uploads 1000 docs and validates rank + set operations', async ({ page }) => {
    test.setTimeout(16 * 60 * 1000);

    const email = `ui-vector-${Date.now()}@test.teleoscope`;
    const uploadLabel = `ui-vector-batch-${Date.now()}`;
    const docTitlePrefix = 'Vector UI Doc';

    // 1) Sign up and open workspace.
    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 60_000 });

    const workspaceCard = page.getByText('Default workspace').first();
    await workspaceCard.click({ clickCount: 2 });
    await page.waitForURL('**/workspace/**', { timeout: 60_000 });
    await expect(page.locator('.react-flow')).toBeVisible();

    const workspaceMatch = page.url().match(/\/workspace\/([^/?#]+)/);
    expect(workspaceMatch, 'Workspace id missing from URL').not.toBeNull();
    const workspaceId = workspaceMatch![1];

    const appState = await apiGetJson(page, `/api/app?workspace=${workspaceId}`);
    const workflowId: string = appState.workflow._id;

    // 2) Generate and upload 1000 documents in chunks.
    const docs = Array.from({ length: DOC_COUNT }, (_, i) => {
      const index = String(i).padStart(4, '0');
      return {
        values: {
          text: `shared vectorization corpus sentence for ranking stability document ${index}`,
          title: `${docTitlePrefix} ${index}`,
          group: 'vector-e2e'
        }
      };
    });

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const rows = docs.slice(i, i + CHUNK_SIZE);
      await apiPostJson(page, '/api/upload/csv/chunk', {
        workspace_id: workspaceId,
        label: uploadLabel,
        data: {
          columns: [
            { key: 'text', name: 'Text' },
            { key: 'title', name: 'Title' },
            { key: 'group', name: 'Group' }
          ],
          error: false,
          num_columns: 3,
          num_rows: rows.length,
          rows
        }
      });
    }

    // 3) Wait until storage contains all docs and sample docs are vectorized.
    const storage = await waitFor(async () => {
      const app = await apiGetJson(page, `/api/app?workspace=${workspaceId}`);
      const storageIds: string[] = app.workspace?.storage ?? [];
      for (const storageId of storageIds) {
        const item = await apiGetJson(page, `/api/storage?storage=${storageId}`);
        if (item?.label === uploadLabel && Array.isArray(item.docs) && item.docs.length === DOC_COUNT) {
          return item as { _id: string; docs: string[]; label: string };
        }
      }
      return null;
    }, RESULT_TIMEOUT_MS);

    const sampleDocIds = [
      storage.docs[0],
      storage.docs[Math.floor(storage.docs.length / 2)],
      storage.docs[storage.docs.length - 1]
    ];

    await waitFor(async () => {
      for (const docId of sampleDocIds) {
        const doc = await apiGetJson(page, `/api/document?document=${docId}`);
        if (!doc?.state?.vectorized) {
          return null;
        }
      }
      return true;
    }, RESULT_TIMEOUT_MS);

    // 4) Create document/rank/set-operation nodes and connect edges.
    const documentNodeUid = crypto.randomUUID();
    const rankNodeUid = crypto.randomUUID();
    const unionNodeUid = crypto.randomUUID();
    const intersectionNodeUid = crypto.randomUUID();
    const differenceNodeUid = crypto.randomUUID();
    const exclusionNodeUid = crypto.randomUUID();

    const controlDocId = storage.docs[0];

    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: documentNodeUid,
      type: 'Document',
      reference: controlDocId,
      parameters: { index: 0 }
    });

    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: rankNodeUid,
      type: 'Rank',
      parameters: { index: 1, distance: 1 }
    });
    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: unionNodeUid,
      type: 'Union',
      parameters: { index: 2 }
    });
    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: intersectionNodeUid,
      type: 'Intersection',
      parameters: { index: 3 }
    });
    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: differenceNodeUid,
      type: 'Difference',
      parameters: { index: 4 }
    });
    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: exclusionNodeUid,
      type: 'Exclusion',
      parameters: { index: 5 }
    });

    const edgeChanges = [
      { source: documentNodeUid, target: rankNodeUid, type: 'control' },
      { source: documentNodeUid, target: unionNodeUid, type: 'source' },
      { source: documentNodeUid, target: unionNodeUid, type: 'control' },
      { source: documentNodeUid, target: intersectionNodeUid, type: 'source' },
      { source: documentNodeUid, target: intersectionNodeUid, type: 'control' },
      { source: documentNodeUid, target: differenceNodeUid, type: 'source' },
      { source: documentNodeUid, target: differenceNodeUid, type: 'control' },
      { source: documentNodeUid, target: exclusionNodeUid, type: 'source' },
      { source: documentNodeUid, target: exclusionNodeUid, type: 'control' }
    ];

    await apiPostJson(page, '/api/graph/edge/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      changes: edgeChanges
    });

    const workflow = await apiGetJson(page, `/api/workflow?workflow=${workflowId}`);
    const newNodes = [
      makeFlowNode(documentNodeUid, 'Document', 120, 120, 380, 220),
      makeFlowNode(rankNodeUid, 'Rank', 540, 120, 380, 220),
      makeFlowNode(unionNodeUid, 'Union', 420, 220),
      makeFlowNode(intersectionNodeUid, 'Intersection', 420, 320),
      makeFlowNode(differenceNodeUid, 'Difference', 420, 420),
      makeFlowNode(exclusionNodeUid, 'Exclusion', 420, 520)
    ];
    const newEdges = [
      makeEdge(documentNodeUid, rankNodeUid, 'control'),
      makeEdge(documentNodeUid, unionNodeUid, 'source'),
      makeEdge(documentNodeUid, unionNodeUid, 'control'),
      makeEdge(documentNodeUid, intersectionNodeUid, 'source'),
      makeEdge(documentNodeUid, intersectionNodeUid, 'control'),
      makeEdge(documentNodeUid, differenceNodeUid, 'source'),
      makeEdge(documentNodeUid, differenceNodeUid, 'control'),
      makeEdge(documentNodeUid, exclusionNodeUid, 'source'),
      makeEdge(documentNodeUid, exclusionNodeUid, 'control')
    ];

    await apiPostJson(page, '/api/workflow', {
      ...workflow,
      nodes: [...workflow.nodes, ...newNodes],
      edges: [...workflow.edges, ...newEdges]
    });

    // 5) Validate backend-computed counts for rank + set operations.
    const rankNode = await waitFor(async () => {
      const node = (await apiGetJson(page, `/api/graph?uid=${rankNodeUid}`)) as GraphNode;
      if (rankedCount(node) >= 100) {
        return node;
      }
      return null;
    }, RESULT_TIMEOUT_MS);
    expect(rankedCount(rankNode)).toBeGreaterThanOrEqual(100);

    await waitFor(async () => {
      const node = (await apiGetJson(page, `/api/graph?uid=${unionNodeUid}`)) as GraphNode;
      return rankedCount(node) === 1 ? true : null;
    }, RESULT_TIMEOUT_MS);
    await waitFor(async () => {
      const node = (await apiGetJson(page, `/api/graph?uid=${intersectionNodeUid}`)) as GraphNode;
      return rankedCount(node) === 1 ? true : null;
    }, RESULT_TIMEOUT_MS);
    await waitFor(async () => {
      const node = (await apiGetJson(page, `/api/graph?uid=${differenceNodeUid}`)) as GraphNode;
      return rankedCount(node) === 0 ? true : null;
    }, RESULT_TIMEOUT_MS);
    await waitFor(async () => {
      const node = (await apiGetJson(page, `/api/graph?uid=${exclusionNodeUid}`)) as GraphNode;
      return rankedCount(node) === 0 ? true : null;
    }, RESULT_TIMEOUT_MS);

    // 6) Validate UI: uploaded docs appear in frontend node windows/lists.
    await page.reload();
    await expect(page.locator('.react-flow')).toBeVisible();
    const controlDoc = await apiGetJson(page, `/api/document?document=${controlDocId}`);

    const documentNodeLocator = page.locator(`.react-flow__node[data-id="${documentNodeUid}"]`);
    await expect(documentNodeLocator.getByText(controlDoc.title)).toBeVisible({ timeout: 60_000 });

    // 7) Validate UI: rank list renders and set-operation nodes are present.
    const rankNodeLocator = page.locator(`.react-flow__node[data-id="${rankNodeUid}"]`);
    await expect(rankNodeLocator.getByText(/Number of results:\s*\d+/)).toBeVisible();
    await expect(rankNodeLocator.getByText(new RegExp(`^${docTitlePrefix} \\d{4}$`)).first()).toBeVisible();

    const rankedDocId = rankNode.doclists?.[0]?.ranked_documents?.[0]?.[0];
    expect(rankedDocId).toBeTruthy();
    const rankedDoc = await apiGetJson(page, `/api/document?document=${rankedDocId}`);
    await rankNodeLocator.getByText(rankedDoc.title).first().click();
    await waitFor(async () => {
      const doc = await apiGetJson(page, `/api/document?document=${rankedDocId}`);
      return doc?.state?.read ? true : null;
    }, 60_000, 1000);

    const unionNodeLocator = page.locator(`.react-flow__node[data-id="${unionNodeUid}"]`);
    const intersectionNodeLocator = page.locator(
      `.react-flow__node[data-id="${intersectionNodeUid}"]`
    );
    const differenceNodeLocator = page.locator(
      `.react-flow__node[data-id="${differenceNodeUid}"]`
    );
    const exclusionNodeLocator = page.locator(
      `.react-flow__node[data-id="${exclusionNodeUid}"]`
    );
    await expect(unionNodeLocator).toBeVisible();
    await expect(intersectionNodeLocator).toBeVisible();
    await expect(differenceNodeLocator).toBeVisible();
    await expect(exclusionNodeLocator).toBeVisible();
  });
});
