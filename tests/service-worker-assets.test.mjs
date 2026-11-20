import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

test('Service Worker precache contains only existing same-repository assets', async () => {
  const source = await readFile(resolve(root, 'sw.js'), 'utf8');
  const match = source.match(/const ASSETS = (\[[\s\S]*?\]);/);
  assert.ok(match, 'ASSETS array must be declared as a literal JSON array');

  const assets = JSON.parse(match[1]);
  assert.equal(new Set(assets).size, assets.length, 'precache paths must be unique');
  assert.ok(assets.includes('/index.html'));
  assert.ok(assets.includes('/manifest.json'));
  assert.ok(assets.includes('/src/js/core/app.js'));

  for (const asset of assets) {
    assert.ok(asset.startsWith('/'), `asset path must be origin-root relative: ${asset}`);
    assert.ok(!asset.startsWith('//'), `external URL must not be in precache: ${asset}`);
    if (asset === '/') continue;
    await access(resolve(root, asset.slice(1)));
  }
});

test('Service Worker has a versioned cache and offline navigation fallback', async () => {
  const source = await readFile(resolve(root, 'sw.js'), 'utf8');
  assert.match(source, /dead-calm-visual-v\d+/);
  assert.match(source, /event\.request\.mode === 'navigate'/);
  assert.match(source, /caches\.match\('\/index\.html'\)/);
  assert.match(source, /event\.request\.method !== 'GET'/);
});


test('retired prototype minigames and debug scenes are absent from the release precache', async () => {
  const source = await readFile(resolve(root, 'sw.js'), 'utf8');
  const match = source.match(/const ASSETS = (\[[\s\S]*?\]);/);
  assert.ok(match, 'ASSETS array must be declared as a literal JSON array');
  const assets = JSON.parse(match[1]);
  for (const retired of [
    "/src/js/components/minigame-chase.js",
    "/src/js/components/minigame-cipher.js",
    "/src/js/components/minigame-fingerprints.js",
    "/src/js/components/minigame-lockpick.js",
    "/src/js/components/qte-system.js",
    "/src/js/scenes/chase-scene.js",
    "/src/js/scenes/minigame-test.js",
    "/src/js/systems/minigames.js",
    "/src/css/style.css"
  ]) assert.ok(!assets.includes(retired), `retired path remains in precache: ${retired}`);
});


test('authored PWA icons are included in the Service Worker precache', async () => {
  const source = await readFile(resolve(root, 'sw.js'), 'utf8');
  const match = source.match(/const ASSETS = (\[[\s\S]*?\]);/);
  assert.ok(match, 'ASSETS array must be declared as a literal JSON array');
  const assets = JSON.parse(match[1]);
  assert.ok(assets.includes('/assets/icons/icon-192.svg'));
  assert.ok(assets.includes('/assets/icons/icon-512.svg'));
});
