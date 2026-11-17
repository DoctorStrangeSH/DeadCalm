import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('all painted environment assets are present, valid WebP and reasonably compact', () => {
  const names = [
    'blackford-harbor', 'holt-office', 'blackford-city-atlas',
    'blackford-courtroom', 'blackford-precinct', 'blackford-morgue',
    'blackford-rusty-anchor'
  ];
  for (const name of names) {
    const path = resolve(root, `src/assets/backgrounds/${name}.webp`);
    assert.ok(existsSync(path), `${name} is missing`);
    assert.ok(statSync(path).size < 600_000, `${name} should be optimized`);
    assert.equal(readFileSync(path).toString('ascii', 8, 12), 'WEBP', `${name} must be raster WebP`);
  }
});

test('interactive map and locations agree on supported destinations', () => {
  const locations = JSON.parse(read('src/data/locations.json'));
  const map = read('src/js/components/map.js');
  assert.equal(Object.keys(locations).length, 9);
  for (const id of Object.keys(locations)) {
    assert.ok(map.includes(`${id}:`) || map.includes(`'${id}':`), `missing map destination: ${id}`);
  }
  assert.ok(map.includes('if (!loc.unlocked) return'), 'locked locations must not be enterable');
  assert.ok(!map.includes('<svg'), 'map background should be raster rather than SVG');
});

test('PWA cache includes visual styles, map data and the new image assets', () => {
  const sw = read('sw.js');
  for (const resource of [
    'src/css/art-direction.css', 'src/data/locations.json',
    'blackford-city-atlas.webp', 'blackford-courtroom.webp',
    'blackford-precinct.webp', 'blackford-morgue.webp', 'blackford-rusty-anchor.webp',
    'lydia-winter.webp', 'ray-morgan.webp', 'anna-holt.webp', 'marta-hayes.webp'
  ]) assert.ok(sw.includes(resource), `cache missing ${resource}`);
  assert.ok(sw.includes("self.addEventListener('activate'"), 'old PWA caches should be cleared');
});

test('character portraits are optimized and rendered in dialogue with fallback for other speakers', () => {
  for (const name of ['lydia-winter', 'ray-morgan', 'anna-holt', 'marta-hayes']) {
    const file = resolve(root, `src/assets/portraits/${name}.webp`);
    assert.ok(existsSync(file), `${name} must exist`);
    assert.ok(statSync(file).size < 300_000, `${name} should be compact enough for mobile`);
    assert.equal(readFileSync(file).toString('ascii', 8, 12), 'WEBP');
  }
  const dialog = read('src/js/components/dialog-box.js');
  assert.ok(dialog.includes('lydia-winter.webp'));
  assert.ok(dialog.includes('ray-morgan.webp'));
  assert.ok(dialog.includes('anna-holt.webp'));
  assert.ok(dialog.includes('marta-hayes.webp'));
  assert.ok(dialog.includes('portrait-silhouette'), 'other characters retain their fallback');
});

test('all locations referenced by scene images resolve in the repository', () => {
  const scenes = ['city-map', 'crime-scene', 'bar', 'morgue', 'police-station'];
  for (const scene of scenes) {
    const source = read(`src/js/scenes/${scene}.js`);
    for (const match of source.matchAll(/src\/assets\/backgrounds\/[^'" ]+\.webp/g)) {
      assert.ok(existsSync(resolve(root, match[0])), `${scene}: ${match[0]} missing`);
    }
  }
});
