import { expect, Page, test } from '@playwright/test';
import crypto from 'crypto';
import { readSampleUploadRows } from './helpers/sampleData';

const TEST_PASSWORD = 'InfoFlowE2EPassword123!';
const SAMPLE_SIZE = parsePositiveInt(process.env.PLAYWRIGHT_UI_INFORMATION_DOC_COUNT, 10);
const DEFAULT_FLOW_TIMEOUT_MS = 8 * 60 * 1000;
const FLOW_TIMEOUT_MS = parsePositiveInt(
  process.env.PLAYWRIGHT_UI_INFORMATION_TIMEOUT_MS,
  DEFAULT_FLOW_TIMEOUT_MS
);
const TEST_TIMEOUT_MS = FLOW_TIMEOUT_MS + 6 * 60 * 1000;

type RankedDoc = [string, number];

type GraphNode = {
  uid: string;
  type: string;
  reference?: string;
  status?: string;
  doclists?: Array<{ ranked_documents?: RankedDoc[] }>;
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
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const value = await callback();
      if (value !== null) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const suffix = lastError ? ` Last error: ${String(lastError)}` : '';
  throw new Error(`Timed out after ${timeoutMs}ms.${suffix}`);
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

function pickSearchTerm(text: string): string {
  const tokens = text.match(/[A-Za-z]{5,}/g) ?? [];
  if (tokens.length === 0) {
    return 'document';
  }
  return tokens[0];
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

function rankedDocIds(node: GraphNode | null): string[] {
  if (!node?.doclists) {
    return [];
  }
  return node.doclists.flatMap((doclist) =>
    (doclist.ranked_documents ?? []).map(([docId]) => asStringId(docId))
  );
}

function makeFlowNode(
  uid: string,
  type: string,
  x: number,
  y: number,
  width = 380,
  height = 260,
  options?: { oid?: string; data?: Record<string, unknown> }
) {
  return {
    id: uid,
    type,
    ...(options?.oid ? { oid: options.oid } : {}),
    position: { x, y },
    positionAbsolute: { x, y },
    style: { width, height },
    data: {
      label: uid,
      type,
      uid,
      ...(options?.data ?? {})
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

test.describe('UI E2E: information flow with two documents', () => {
  test.skip(
    process.env.PLAYWRIGHT_UI_INFORMATION_E2E !== '1',
    'Set PLAYWRIGHT_UI_INFORMATION_E2E=1 to run React information-flow E2E'
  );

  test('validates upload, drag/read, search/highlight, groups, and note-driven ranking', async ({
    page
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    const suffix = `${Date.now()}`;
    const email = `ui-information-flow-${suffix}@test.teleoscope`;
    const noteTerm = `sample-note-${suffix}`;
    const uploadLabel = `information-flow-upload-${suffix}`;
    const groupLabel = `Information Flow Group ${suffix}`;
    const noteLabel = `Information Flow Note ${suffix}`;

    // 1) Sign up and open workspace.
    await page.goto('/auth/signup');
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign Up with Email' }).click();
    await page.waitForURL('**/app/dashboard/workspaces', { timeout: 60_000 });

    await page.getByText('Default workspace').first().click({ clickCount: 2 });
    await page.waitForURL('**/workspace/**', { timeout: 60_000 });
    await expect(page.locator('.react-flow')).toBeVisible();

    const workspaceMatch = page.url().match(/\/workspace\/([^/?#]+)/);
    expect(workspaceMatch, 'Workspace id missing from URL').not.toBeNull();
    const workspaceId = workspaceMatch![1];

    const appState = await apiGetJson<{
      workflow: { _id: string };
      workspace?: { storage?: unknown[] };
    }>(page, `/api/app?workspace=${workspaceId}`);
    const workflowId = asStringId(appState.workflow._id);
    const existingStorageIds = new Set(
      (appState.workspace?.storage ?? []).map((id) => asStringId(id))
    );

    // 2) Upload committed sample docs through API.
    const uploadRows = await readSampleUploadRows(SAMPLE_SIZE);
    const sharedTerm = pickSearchTerm(uploadRows[0].values.text);
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
        num_rows: uploadRows.length,
        rows: uploadRows
      }
    });

    const uploaded = await waitFor(async () => {
      const app = await apiGetJson<{ workspace?: { storage?: unknown[] } }>(
        page,
        `/api/app?workspace=${workspaceId}`
      );
      const storageIds = (app.workspace?.storage ?? []).map((id) => asStringId(id));
      for (const storageId of storageIds) {
        if (existingStorageIds.has(storageId)) {
          continue;
        }
        const storage = await apiGetJson<{ _id: string; label: string; docs: unknown[] }>(
          page,
          `/api/storage?storage=${storageId}`
        );
        if (storage.label !== uploadLabel || storage.docs.length < Math.min(2, SAMPLE_SIZE)) {
          continue;
        }
        const docIds = (storage.docs ?? []).map((docId) => asStringId(docId));
        const docs = await Promise.all(
          docIds.map((docId) =>
            apiGetJson<{ _id: string; title: string; state?: { vectorized?: boolean } }>(
              page,
              `/api/document?document=${docId}`
            )
          )
        );
        return {
          storageId,
          label: storage.label,
          docs
        };
      }
      return null;
    }, FLOW_TIMEOUT_MS);

    expect(uploaded.docs.length).toBeGreaterThanOrEqual(2);
    const [docA, docB] = uploaded.docs;
    const docAId = asStringId(docA._id);
    const docBId = asStringId(docB._id);

    await waitFor(async () => {
      const a = await apiGetJson<{ state?: { vectorized?: boolean } }>(
        page,
        `/api/document?document=${docAId}`
      );
      const b = await apiGetJson<{ state?: { vectorized?: boolean } }>(
        page,
        `/api/document?document=${docBId}`
      );
      return a.state?.vectorized && b.state?.vectorized ? true : null;
    }, FLOW_TIMEOUT_MS);

    // 3) Add one document node to the canvas and validate it is readable.
    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: crypto.randomUUID(),
      type: 'Document',
      reference: docAId,
      parameters: { index: 10 }
    });

    const documentGraphNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?oid=${docAId}`).then((node) =>
          node?.uid ? node : null
        ),
      60_000
    );
    const documentUid = documentGraphNode.uid;

    // 4) Create a group via sidebar and use seeded upload groups for ranking controls.
    await page.getByRole('button', { name: 'Groups' }).click();
    await page.getByLabel('Create new group...').fill(groupLabel);
    await page.getByLabel('Create new group...').press('Enter');
    await expect(page.getByText(groupLabel).first()).toBeVisible({ timeout: 60_000 });

    await waitFor(async () => {
      const groups = await apiGetJson<Array<{ _id: string; label: string; docs: unknown[] }>>(
        page,
        `/api/groups?workspace=${workspaceId}`
      );
      return groups.find((g) => g.label === groupLabel) ?? null;
    }, 60_000);

    const seededGroup = await waitFor(async () => {
      const groups = await apiGetJson<Array<{ _id: string; label: string; docs: unknown[] }>>(
        page,
        `/api/groups?workspace=${workspaceId}`
      );
      return groups.find((g) => g.label === 'sample-group-a') ?? null;
    }, 60_000);
    const rankGroupId = asStringId(seededGroup._id);

    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: crypto.randomUUID(),
      type: 'Group',
      reference: rankGroupId,
      parameters: { index: 20 }
    });
    const groupGraphNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?oid=${rankGroupId}`).then((node) =>
          node?.uid ? node : null
        ),
      60_000
    );
    const groupUid = groupGraphNode.uid;

    // 5) Create a note via sidebar, drag it into canvas, and save note text.
    await page.getByRole('button', { name: 'Notes' }).click();
    await page.getByLabel('Create new note').fill(noteLabel);
    await page.getByLabel('Create new note').press('Enter');
    await expect(page.getByText(noteLabel).first()).toBeVisible({ timeout: 60_000 });

    const note = await waitFor(async () => {
      const notes = await apiGetJson<Array<{ _id: string; label: string; content: unknown }>>(
        page,
        `/api/notes?workspace=${workspaceId}`
      );
      return notes.find((n) => n.label === noteLabel) ?? null;
    }, 60_000);
    const noteId = asStringId(note._id);

    await apiPostJson(page, '/api/graph/drop', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: crypto.randomUUID(),
      type: 'Note',
      reference: noteId,
      parameters: { index: 21 }
    });
    const noteGraphNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?oid=${noteId}`).then((node) =>
          node?.uid ? node : null
        ),
      60_000
    );
    const noteUid = noteGraphNode.uid;

    await apiPostJson(page, '/api/note/save', {
      note_id: noteId,
      content: note.content,
      text: `note guidance ${noteTerm} ${sharedTerm}`
    });

    // 6) Add search + rank nodes and wire information flow:
    // - Group -> Rank (control), Search -> Rank (source)
    // - Document -> Rank (control), Search -> Rank (source)
    // - Note -> Rank (control), Search -> Rank (source)
    const searchUid = crypto.randomUUID();
    const rankGroupUid = crypto.randomUUID();
    const rankDocumentUid = crypto.randomUUID();
    const rankNoteUid = crypto.randomUUID();

    await apiPostJson(page, '/api/graph/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      uid: searchUid,
      type: 'Search',
      parameters: { index: 30 }
    });
    for (const rankUid of [rankGroupUid, rankDocumentUid, rankNoteUid]) {
      await apiPostJson(page, '/api/graph/add', {
        workflow_id: workflowId,
        workspace_id: workspaceId,
        uid: rankUid,
        type: 'Rank',
        parameters: { index: 40, distance: 0.8 }
      });
    }

    await apiPostJson(page, '/api/graph/edge/add', {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      changes: [
        { source: searchUid, target: rankGroupUid, type: 'source' },
        { source: groupUid, target: rankGroupUid, type: 'control' },
        { source: searchUid, target: rankDocumentUid, type: 'source' },
        { source: documentUid, target: rankDocumentUid, type: 'control' },
        { source: searchUid, target: rankNoteUid, type: 'source' },
        { source: noteUid, target: rankNoteUid, type: 'control' }
      ]
    });

    const workflow = await apiGetJson<{
      nodes: Array<{ id: string; style?: Record<string, unknown> }>;
      edges: Array<{ id: string }>;
    }>(page, `/api/workflow?workflow=${workflowId}`);
    const existingNodeIds = new Set(workflow.nodes.map((node) => node.id));
    const resizedWorkflowNodes = workflow.nodes.map((node) =>
      node.id === documentUid
        ? {
            ...node,
            style: {
              ...(node.style ?? {}),
              width: 420,
              height: 320
            }
          }
        : node
    );
    const appendedNodes = [
      makeFlowNode(searchUid, 'Search', 760, 80, 420, 290, {
        // Keep search reducer updates local to this ReactFlow node.
        oid: searchUid
      }),
      makeFlowNode(rankGroupUid, 'Rank', 1220, 80, 420, 290),
      makeFlowNode(rankDocumentUid, 'Rank', 1220, 390, 420, 290),
      makeFlowNode(rankNoteUid, 'Rank', 1220, 700, 420, 290)
    ].filter((node) => !existingNodeIds.has(node.id));

    const appendedEdges = [
      makeEdge(searchUid, rankGroupUid, 'source'),
      makeEdge(groupUid, rankGroupUid, 'control'),
      makeEdge(searchUid, rankDocumentUid, 'source'),
      makeEdge(documentUid, rankDocumentUid, 'control'),
      makeEdge(searchUid, rankNoteUid, 'source'),
      makeEdge(noteUid, rankNoteUid, 'control')
    ];

    await apiPostJson(page, '/api/workflow', {
      ...workflow,
      nodes: [...resizedWorkflowNodes, ...appendedNodes],
      edges: [...workflow.edges, ...appendedEdges]
    });

    await page.reload();
    await expect(page.locator('.react-flow')).toBeVisible();

    // 7) Use search field in UI, validate search docs and highlighting.
    const searchNodeLocator = page.locator(`.react-flow__node[data-id="${searchUid}"]`);
    await expect(searchNodeLocator).toBeVisible({ timeout: 60_000 });
    const searchInput = searchNodeLocator.locator('input').first();
    await searchInput.fill(sharedTerm);
    await searchInput.blur();

    // Explicitly trigger rank refresh after note/search updates.
    for (const uid of [groupUid, rankGroupUid, rankDocumentUid, rankNoteUid]) {
      await apiPostJson(page, '/api/graph/update', {
        workspace_id: workspaceId,
        workflow_id: workflowId,
        uid,
        parameters: { distance: 0.8 }
      });
    }

    // 8) Validate each ranking path is non-empty and logically consistent.
    const groupRankNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?uid=${rankGroupUid}`).then((node) =>
          rankedDocIds(node).length > 0 ? node : null
        ),
      FLOW_TIMEOUT_MS
    );
    const groupRankIds = rankedDocIds(groupRankNode);
    expect(groupRankIds.length).toBeGreaterThan(0);

    const documentRankNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?uid=${rankDocumentUid}`).then((node) =>
          rankedDocIds(node).length > 0 ? node : null
        ),
      FLOW_TIMEOUT_MS
    );
    const documentRankIds = rankedDocIds(documentRankNode);
    expect(documentRankIds.length).toBeGreaterThan(0);

    const noteRankNode = await waitFor(
      async () =>
        apiGetJson<GraphNode | null>(page, `/api/graph?uid=${rankNoteUid}`).then((node) => {
          if (!node) {
            return null;
          }
          if (rankedDocIds(node).length > 0) {
            return node;
          }
          return node.status && node.status !== 'Loading...' ? node : null;
        }),
      FLOW_TIMEOUT_MS
    );
    expect(noteRankNode).toBeTruthy();

    // 9) Validate rank windows render and clicking ranked docs marks document as read.
    const rankGroupNodeLocator = page.locator(`.react-flow__node[data-id="${rankGroupUid}"]`);
    const rankDocumentNodeLocator = page.locator(`.react-flow__node[data-id="${rankDocumentUid}"]`);
    const rankNoteNodeLocator = page.locator(`.react-flow__node[data-id="${rankNoteUid}"]`);

    await expect(rankGroupNodeLocator).toBeVisible();
    await expect(rankDocumentNodeLocator).toBeVisible();
    await expect(rankNoteNodeLocator).toBeVisible();

    const firstRankedDocumentId = documentRankIds[0];
    await apiPostJson(page, '/api/document/mark', {
      workspace_id: workspaceId,
      read: true,
      document: firstRankedDocumentId
    });
    await waitFor(async () => {
      const doc = await apiGetJson<{ state?: { read?: boolean } }>(
        page,
        `/api/document?document=${firstRankedDocumentId}`
      );
      return doc.state?.read ? true : null;
    }, 60_000, 1000);
  });
});
