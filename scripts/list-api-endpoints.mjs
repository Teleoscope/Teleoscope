#!/usr/bin/env node
/**
 * List all API endpoints in the Teleoscope project.
 *
 * Scans teleoscope.ca/src/app/api/ for route.ts files, parses the exported
 * HTTP method handlers, and prints a formatted table.  Also notes the FastAPI
 * backend endpoint and the legacy frontend/pages/api routes.
 *
 * Usage:
 *   node scripts/list-api-endpoints.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const API_ROOT = path.join(REPO_ROOT, 'teleoscope.ca', 'src', 'app', 'api');
const LEGACY_API_ROOT = path.join(REPO_ROOT, 'frontend', 'pages', 'api');

// ── helpers ──────────────────────────────────────────────────────────────────

function collectRouteFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRouteFiles(full));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

function collectLegacyFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectLegacyFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function parseMethods(source) {
  const methods = new Set();
  const patterns = [
    /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*[(<(]/g,
    /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*async\s*[(<(]/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source)) !== null) {
      methods.add(m[1]);
    }
  }
  return [...methods].sort();
}

function toApiPath(routeFile, root) {
  const rel = path
    .relative(root, routeFile)
    .replace(/\\/g, '/')
    .replace(/\/route\.ts$/, '')
    .replace(/\.ts$/, '');
  return rel ? `/api/${rel}` : '/api';
}

// ── active routes ─────────────────────────────────────────────────────────

const routeFiles = collectRouteFiles(API_ROOT).sort();

const rows = [];
for (const f of routeFiles) {
  const source = fs.readFileSync(f, 'utf8');
  const methods = parseMethods(source);
  const apiPath = toApiPath(f, API_ROOT);
  if (methods.length === 0) {
    rows.push({ method: '(none)', path: apiPath, note: 'no exported handler' });
  } else {
    for (const m of methods) {
      rows.push({ method: m, path: apiPath, note: '' });
    }
  }
}

// Sort rows: first by path, then by method
rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

// ── FastAPI backend ───────────────────────────────────────────────────────

const backendRows = [
  { method: 'GET', path: '/download/{filename}', note: 'backend/files.py (port 8000)' },
];

// ── legacy routes ────────────────────────────────────────────────────────

const legacyFiles = collectLegacyFiles(LEGACY_API_ROOT).sort();
const legacyRows = legacyFiles.map((f) => ({
  method: '?',
  path: toApiPath(f, LEGACY_API_ROOT),
  note: 'legacy frontend/pages/api — deprecated app',
}));

// ── render ────────────────────────────────────────────────────────────────

const METHOD_W = 8;
const NOTE_W = 40;

function pad(s, w) {
  return String(s).padEnd(w);
}

function printTable(title, tableRows) {
  const pathW = Math.max(20, ...tableRows.map((r) => r.path.length)) + 2;
  const hr = '─'.repeat(METHOD_W + pathW + NOTE_W + 4);

  console.log(`\n${title}`);
  console.log(hr);
  console.log(`${pad('METHOD', METHOD_W)}  ${pad('PATH', pathW)}  NOTE`);
  console.log(hr);
  for (const r of tableRows) {
    console.log(`${pad(r.method, METHOD_W)}  ${pad(r.path, pathW)}  ${r.note}`);
  }
  console.log(hr);
  console.log(`  ${tableRows.length} endpoint(s)`);
}

printTable(`Active API endpoints  (teleoscope.ca/src/app/api)`, rows);
printTable(`FastAPI backend       (backend/files.py)`, backendRows);

if (legacyRows.length > 0) {
  printTable(`Legacy API endpoints  (frontend/pages/api) — DEPRECATED`, legacyRows);
}

const totalActive = rows.filter((r) => r.note !== 'no exported handler').length;
console.log(`\nTotal active endpoint+method combinations: ${totalActive}`);
console.log(`Total route files:                         ${routeFiles.length}`);
