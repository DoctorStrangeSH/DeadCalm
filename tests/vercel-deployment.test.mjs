import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

test('Vercel serves the static game from the origin root with fresh entrypoint and PWA metadata', async () => {
  const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
  assert.ok(Array.isArray(config.headers), 'Vercel headers must be declared');

  const rules = new Map(config.headers.map(rule => [rule.source, rule.headers]));
  for (const path of ['/', '/index.html', '/manifest.json', '/sw.js']) {
    const headers = rules.get(path);
    assert.ok(headers, `Missing Vercel cache rule for ${path}`);
    const cacheControl = headers.find(header => header.key.toLowerCase() === 'cache-control');
    assert.match(cacheControl?.value || '', /no-cache/);
  }

  const serviceWorkerHeaders = rules.get('/sw.js');
  assert.ok(
    serviceWorkerHeaders.some(header => header.key.toLowerCase() === 'service-worker-allowed' && header.value === '/'),
    'Service Worker must be allowed to control the origin root'
  );
});

test('Vercel deployment remains a dependency-free static site', async () => {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.dependencies, undefined, 'Do not add runtime dependencies for static hosting');
  assert.equal(pkg.devDependencies, undefined, 'No build tool is required for the current static app');
  assert.equal(pkg.scripts.build, undefined, 'Vercel should serve the static repository without an invented build step');
});
