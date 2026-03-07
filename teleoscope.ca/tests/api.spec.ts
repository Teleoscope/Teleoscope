/**
 * API route coverage tests.
 * Auto-discovers every app router API endpoint and exercises each exported method
 * with seeded test data (query/body/multipart), including special-case assertions
 * for public/system endpoints.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { test, expect } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type ApiCase = {
  routePath: string;
  method: HttpMethod;
  hasExplicitHandler: boolean;
};

const API_ROOT = path.resolve(__dirname, '../src/app/api');
const TEST_QUERY = {
  id: 'test-id',
  workspace: '507f1f77bcf86cd799439011',
  workspace_id: '507f1f77bcf86cd799439011',
  workflow: '507f1f77bcf86cd799439012',
  workflow_id: '507f1f77bcf86cd799439012',
  group: '507f1f77bcf86cd799439013',
  group_id: '507f1f77bcf86cd799439013',
  note: '507f1f77bcf86cd799439014',
  note_id: '507f1f77bcf86cd799439014',
  team: '507f1f77bcf86cd799439015',
  team_id: '507f1f77bcf86cd799439015',
  user: 'test-user',
  user_id: 'test-user',
  filename: 'test-output.txt',
};

const TEST_BODY = {
  id: 'test-id',
  workspace_id: '507f1f77bcf86cd799439011',
  workflow_id: '507f1f77bcf86cd799439012',
  group_id: '507f1f77bcf86cd799439013',
  note_id: '507f1f77bcf86cd799439014',
  team_id: '507f1f77bcf86cd799439015',
  userId: 'test-user',
  userid: 'test-user',
  document_id: '507f1f77bcf86cd799439016',
  title: 'API Route Test Title',
  text: 'API route test body text',
  label: 'api-route-test-label',
  color: '#3366ff',
  query: 'test query',
  source: 'playwright-api-route-test',
  email: 'api-route-test@example.com',
  ref: 'refs/heads/not-frontend',
  data: {
    rows: [{ id: '1', title: 'Row 1', text: 'Body 1' }],
  },
  group_ids: ['507f1f77bcf86cd799439013'],
  storage_ids: ['507f1f77bcf86cd799439017'],
  edge: {
    source: '507f1f77bcf86cd799439013',
    target: '507f1f77bcf86cd799439014',
  },
  product: {
    default_price: 'price_test_default',
  },
};

const DEFAULT_HEADERS = {
  'x-api-route-test': '1',
};

const UI_SOURCE_ROOTS = [
  path.resolve(__dirname, '../src/components'),
  path.resolve(__dirname, '../src/lib'),
  path.resolve(__dirname, '../src/context'),
  path.resolve(__dirname, '../src/app/app'),
];

const KNOWN_LEGACY_UI_ENDPOINTS: string[] = [];

function collectRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

function collectCodeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCodeFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeRoutePath(rawPath: string): string {
  const noQuery = rawPath.split('?')[0];
  return noQuery.replace(/\$\{[^}]+\}/g, ':param').replace(/\[[^\]]+\]/g, ':param');
}

function collectUiEndpointReferences(): Map<string, Set<string>> {
  const references = new Map<string, Set<string>>();
  const files = UI_SOURCE_ROOTS.flatMap((root) => collectCodeFiles(root));
  const patterns = [
    /fetch\(\s*([`'"])(\/api\/[^`'"]+)\1/g,
    /axios\.(?:get|post|put|delete|patch)\(\s*([`'"])(\/api\/[^`'"]+)\1/g,
    /useSWRF\(\s*([`'"])(\/api\/[^`'"]+)\1/g,
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    for (const pattern of patterns) {
      let match = pattern.exec(source);
      while (match) {
        const endpoint = normalizeRoutePath(match[2]);
        if (endpoint.startsWith('/api/auth/')) {
          match = pattern.exec(source);
          continue;
        }
        if (endpoint.startsWith('/api/:param')) {
          match = pattern.exec(source);
          continue;
        }
        if (!references.has(endpoint)) {
          references.set(endpoint, new Set<string>());
        }
        references.get(endpoint)!.add(relative);
        match = pattern.exec(source);
      }
    }
  }

  return references;
}

function parseRouteMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  const fnRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;
  const constRegex = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*async\s*\(/g;

  for (const regex of [fnRegex, constRegex]) {
    let match = regex.exec(source);
    while (match) {
      methods.add(match[1] as HttpMethod);
      match = regex.exec(source);
    }
  }

  return [...methods];
}

function toApiPath(routeFile: string): string {
  const relative = path
    .relative(API_ROOT, routeFile)
    .replace(/\\/g, '/')
    .replace(/\/route\.ts$/, '');
  return relative ? `/api/${relative}` : '/api';
}

function buildWebhookSignature(body: string): string {
  const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

function buildUrl(routePath: string): string {
  if (routePath === '/api/download') {
    return `${routePath}?filename=${encodeURIComponent(TEST_QUERY.filename)}`;
  }
  const params = new URLSearchParams(
    Object.entries(TEST_QUERY).map(([key, value]) => [key, value.toString()])
  );
  return `${routePath}?${params.toString()}`;
}

function expectedStatusFor(caseInfo: ApiCase): number[] {
  if (!caseInfo.hasExplicitHandler) {
    return [404, 405];
  }
  if (caseInfo.routePath === '/api/hello') {
    return [200];
  }
  if (caseInfo.routePath === '/api/webhook' && caseInfo.method === 'POST') {
    return [200, 400, 403];
  }
  if (caseInfo.routePath === '/api/download' && caseInfo.method === 'GET') {
    return [200, 400, 404, 500];
  }
  return [200, 400, 401, 403, 404, 500, 502, 503];
}

function isJsonResponse(contentType: string | null): boolean {
  return !!contentType && contentType.toLowerCase().includes('application/json');
}

const routeCases: ApiCase[] = collectRouteFiles(API_ROOT)
  .sort()
  .flatMap((routeFile) => {
    const source = fs.readFileSync(routeFile, 'utf8');
    const methods = parseRouteMethods(source);
    const routePath = toApiPath(routeFile);
    const hasExplicitHandler = methods.length > 0;

    if (!hasExplicitHandler) {
      return [
        {
          routePath,
          method: 'GET' as const,
          hasExplicitHandler,
        },
      ];
    }

    return methods.map((method) => ({
      routePath,
      method,
      hasExplicitHandler,
    }));
  });

const routePathSet = new Set(
  collectRouteFiles(API_ROOT).map((routeFile) => normalizeRoutePath(toApiPath(routeFile)))
);

test.describe('API routes coverage', () => {
  test('UI endpoint references resolve to backend routes', async () => {
    const references = collectUiEndpointReferences();
    const unresolved = [...references.keys()]
      .filter((endpoint) => !routePathSet.has(endpoint))
      .sort();

    expect(unresolved).toEqual([...KNOWN_LEGACY_UI_ENDPOINTS].sort());
  });

  test('discovers route cases', async () => {
    expect(routeCases.length).toBeGreaterThan(0);
  });

  for (const caseInfo of routeCases) {
    test(`${caseInfo.method} ${caseInfo.routePath}`, async ({ request }) => {
      const url = buildUrl(caseInfo.routePath);
      let response;

      if (caseInfo.method === 'GET') {
        response = await request.fetch(url, {
          method: 'GET',
          headers: DEFAULT_HEADERS,
        });
      } else if (caseInfo.routePath === '/api/upload') {
        response = await request.fetch(url, {
          method: caseInfo.method,
          headers: DEFAULT_HEADERS,
          multipart: {
            file: {
              name: 'api-route-test.csv',
              mimeType: 'text/csv',
              buffer: Buffer.from('id,title,text\n1,Title 1,Body 1\n', 'utf8'),
            },
            workflow_id: TEST_BODY.workflow_id,
            workspace_id: TEST_BODY.workspace_id,
            headerLine_row: '1',
            uid_column: 'id',
            title_column: 'title',
            text_column: 'text',
            group_columns: 'group',
          },
        });
      } else if (caseInfo.routePath === '/api/teams' && caseInfo.method === 'POST') {
        response = await request.fetch(url, {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          multipart: {
            owner: TEST_BODY.userId,
            account: '507f1f77bcf86cd799439018',
            label: 'API Team',
          },
        });
      } else if (caseInfo.routePath === '/api/users' && caseInfo.method === 'POST') {
        response = await request.fetch(url, {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          multipart: {
            email: TEST_BODY.email,
            teamId: TEST_BODY.team_id,
          },
        });
      } else if (caseInfo.routePath === '/api/webhook' && caseInfo.method === 'POST') {
        const payload = JSON.stringify({ ref: TEST_BODY.ref });
        response = await request.fetch(url, {
          method: 'POST',
          data: payload,
          headers: {
            ...DEFAULT_HEADERS,
            'content-type': 'application/json',
            'x-github-event': 'push',
            'x-hub-signature-256': buildWebhookSignature(payload),
          },
        });
      } else {
        response = await request.fetch(url, {
          method: caseInfo.method,
          headers: {
            ...DEFAULT_HEADERS,
            'content-type': 'application/json',
          },
          data: TEST_BODY,
        });
      }

      const expectedStatuses = expectedStatusFor(caseInfo);
      expect(expectedStatuses).toContain(response.status());

      if (caseInfo.routePath === '/api/hello' && caseInfo.method === 'GET') {
        const body = await response.json();
        expect(body).toHaveProperty('hello', 'world');
        return;
      }

      const contentType = response.headers()['content-type'] ?? null;
      if (isJsonResponse(contentType)) {
        const json = await response.json();
        expect(json).toBeDefined();
      } else {
        await response.text();
      }
    });
  }
});
