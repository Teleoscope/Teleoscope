#!/usr/bin/env node

/**
 * Simple concurrency load test for the public demo endpoint.
 *
 * Usage:
 *   node scripts/load-test-demo.mjs [baseUrl] [concurrency] [durationSeconds]
 * Example:
 *   node scripts/load-test-demo.mjs http://localhost:3000 5000 30
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';
const concurrency = Number.parseInt(process.argv[3] || '200', 10);
const durationSeconds = Number.parseInt(process.argv[4] || '20', 10);
const endpoint = `${baseUrl}/api/demo/posts?limit=50`;

if (Number.isNaN(concurrency) || concurrency < 1) {
  throw new Error('Invalid concurrency value.');
}
if (Number.isNaN(durationSeconds) || durationSeconds < 1) {
  throw new Error('Invalid durationSeconds value.');
}

const deadline = Date.now() + durationSeconds * 1000;
const latencies = [];
let ok = 0;
let failed = 0;

async function worker() {
  while (Date.now() < deadline) {
    const start = Date.now();
    try {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
      if (!response.ok) {
        failed += 1;
        continue;
      }
      await response.arrayBuffer();
      ok += 1;
      latencies.push(Date.now() - start);
    } catch (_error) {
      failed += 1;
    }
  }
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

console.log(
  `Running demo load test: ${endpoint} | concurrency=${concurrency} | duration=${durationSeconds}s`
);

const startedAt = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSeconds = (Date.now() - startedAt) / 1000;
const total = ok + failed;

console.log('--- Demo load test summary ---');
console.log(`Total requests: ${total}`);
console.log(`Successful: ${ok}`);
console.log(`Failed: ${failed}`);
console.log(`Req/sec: ${(total / elapsedSeconds).toFixed(2)}`);
console.log(`p50 latency: ${percentile(latencies, 50)}ms`);
console.log(`p95 latency: ${percentile(latencies, 95)}ms`);
console.log(`p99 latency: ${percentile(latencies, 99)}ms`);

if (failed > 0) {
  process.exitCode = 1;
}
