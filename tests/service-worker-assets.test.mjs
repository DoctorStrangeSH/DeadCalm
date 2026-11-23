import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { resolve, dirname, relative, sep, extname } from 'node:path';

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
  assert.ok(assets.includes('/src/js/systems/npc-presence.js'));

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


test('story-gated mini-game modules are included in the offline precache', async () => {
  const source = await readFile(resolve(root, 'sw.js'), 'utf8');
  const match = source.match(/const ASSETS = (\[[\s\S]*?\]);/);
  assert.ok(match, 'ASSETS array must be declared as a literal JSON array');
  const assets = JSON.parse(match[1]);
  assert.ok(assets.includes('/src/js/components/minigame-lock-screen.js'));
  assert.ok(assets.includes('/src/js/systems/minigame-access.js'));
  assert.match(source, /dead-calm-visual-v110/);
});


test('every local JavaScript module reachable from the application entrypoint is precached', async () => {
  const worker = readFileSync(resolve(root, 'sw.js'), 'utf8');
  const match = worker.match(/const ASSETS = ([\s\S]*?);/);
  assert.ok(match, 'ASSETS array must be declared as a literal JSON array');
  const assets = new Set(JSON.parse(match[1]));
  const visited = new Set();
  const pending = [resolve(root, 'src/js/core/app.js')];
  const importPattern = /(?:^\s*import\s+(?:[^'"]*?\s+from\s+)?|^\s*export\s+[^'"]*?\s+from\s+|^\s*import\s*\(\s*)['"]([^'"]+)['"]/gm;

  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    assert.ok(file.startsWith(resolve(root, 'src/js')), 'application import must stay inside src/js');
    assert.ok(assets.has('/' + relative(root, file).split(sep).join('/')),
      'reachable application module is missing from Service Worker precache: ' + relative(root, file).split(sep).join('/'));

    const source = readFileSync(file, 'utf8');
    for (const item of source.matchAll(importPattern)) {
      const specifier = item[1];
      if (!specifier.startsWith('.')) continue;
      const target = resolve(dirname(file), specifier);
      const candidates = extname(target) ? [target] : [target, target + '.js', target + '.json'];
      const resolved = candidates.find(candidate => {
        try { readFileSync(candidate); return true; } catch { return false; }
      });
      assert.ok(resolved, 'unresolved application import in ' + relative(root, file) + ': ' + specifier);
      if (resolved.endsWith('.js')) pending.push(resolved);
      else if (resolved.endsWith('.json')) {
        assert.ok(assets.has('/' + relative(root, resolved).split(sep).join('/')),
          'reachable application data is missing from Service Worker precache: ' + relative(root, resolved));
      }
    }
  }

  // Router scenes are loaded through a template-string dynamic import, so they
  // cannot be discovered by the literal import graph above. Derive the route
  // list from the actual map and location-return component instead.
  const router = readFileSync(resolve(root, 'src/js/core/router.js'), 'utf8');
  assert.match(router, /import\(\`\.\.\/scenes\/\$\{sceneName\}\.js\`\)/);
  const mapSource = readFileSync(resolve(root, 'src/js/components/map.js'), 'utf8');
  const sceneMap = mapSource.match(/const scenes = \{([\s\S]*?)\n    \};/);
  assert.ok(sceneMap, 'city map must declare its scene routing table');
  const routedScenes = [...sceneMap[1].matchAll(/:\s*['"]([^'"]+)['"]/g)].map(item => item[1]);
  const locationSource = readFileSync(resolve(root, 'src/js/components/story-location.js'), 'utf8');
  for (const item of locationSource.matchAll(/scene:\s*['"]([^'"]+)['"]/g)) routedScenes.push(item[1]);
  for (const scene of new Set(routedScenes)) {
    const path = resolve(root, 'src/js/scenes', scene + '.js');
    assert.ok(existsSync(path), 'router destination has no scene module: ' + scene);
    const asset = '/' + relative(root, path).split(sep).join('/');
    assert.ok(assets.has(asset), 'dynamically routed scene is missing from Service Worker precache: ' + asset);
  }
});
