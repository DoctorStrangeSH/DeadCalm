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
    'src/js/systems/dialogue-reactions.js',
    'blackford-city-atlas.webp', 'blackford-courtroom.webp',
    'blackford-precinct.webp', 'blackford-morgue.webp', 'blackford-rusty-anchor.webp',
    'lydia-winter.webp', 'lydia-winter-tension.webp', 'lydia-winter-warmth.webp', 'lydia-winter-withdrawal.webp', 'ray-morgan.webp', 'anna-holt.webp', 'marta-hayes.webp',
    'father-thomas.webp', 'father-thomas-tension.webp', 'father-thomas-warmth.webp', 'father-thomas-withdrawal.webp', 'sebastian-blackwood.webp', 'sebastian-blackwood-tension.webp', 'sebastian-blackwood-warmth.webp', 'sebastian-blackwood-withdrawal.webp', 'ray-morgan-tension.webp', 'ray-morgan-warmth.webp', 'ray-morgan-withdrawal.webp', 'anna-holt-tension.webp', 'anna-holt-warmth.webp', 'anna-holt-withdrawal.webp', 'marta-hayes-tension.webp', 'marta-hayes-warmth.webp', 'marta-hayes-withdrawal.webp'
  ]) assert.ok(sw.includes(resource), `cache missing ${resource}`);
  assert.ok(sw.includes("self.addEventListener('activate'"), 'old PWA caches should be cleared');
});

test('character portraits are optimized and rendered in dialogue with fallback for other speakers', () => {
  for (const name of [
    'lydia-winter', 'lydia-winter-tension', 'lydia-winter-warmth', 'lydia-winter-withdrawal', 'ray-morgan', 'ray-morgan-tension', 'ray-morgan-warmth', 'ray-morgan-withdrawal', 'anna-holt', 'anna-holt-tension', 'anna-holt-warmth', 'anna-holt-withdrawal', 'marta-hayes', 'marta-hayes-tension', 'marta-hayes-warmth', 'marta-hayes-withdrawal', 'father-thomas', 'father-thomas-tension', 'father-thomas-warmth', 'father-thomas-withdrawal', 'sebastian-blackwood', 'sebastian-blackwood-tension', 'sebastian-blackwood-warmth', 'sebastian-blackwood-withdrawal'
  ]) {
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
  assert.ok(dialog.includes('father-thomas.webp'));
  assert.ok(dialog.includes('sebastian-blackwood.webp'));
  assert.ok(dialog.includes('portrait-silhouette'), 'other characters retain their fallback');
});

test('emotional portrait selection changes only for supported character reactions', async () => {
  const { resolvePortraitFile } = await import('../src/js/components/dialog-box.js');
  assert.equal(resolvePortraitFile('Доктор Лидия Винтер', 'withdrawal'), 'lydia-winter-withdrawal.webp');
  assert.equal(resolvePortraitFile('Доктор Лидия Винтер', 'tension'), 'lydia-winter-tension.webp');
  assert.equal(resolvePortraitFile('Доктор Лидия Винтер', 'warmth'), 'lydia-winter-warmth.webp');
  assert.equal(resolvePortraitFile('Доктор Лидия Винтер', 'neutral'), 'lydia-winter.webp');
  assert.equal(resolvePortraitFile('Детектив Рэй Морган', 'tension'), 'ray-morgan-tension.webp');
  assert.equal(resolvePortraitFile('Детектив Рэй Морган', 'warmth'), 'ray-morgan-warmth.webp');
  assert.equal(resolvePortraitFile('Детектив Рэй Морган', 'withdrawal'), 'ray-morgan-withdrawal.webp');
  assert.equal(resolvePortraitFile('Детектив Рэй Морган', 'neutral'), 'ray-morgan.webp');
  assert.equal(resolvePortraitFile('Анна Холт', 'tension'), 'anna-holt-tension.webp');
  assert.equal(resolvePortraitFile('Анна Холт', 'warmth'), 'anna-holt-warmth.webp');
  assert.equal(resolvePortraitFile('Анна Холт', 'withdrawal'), 'anna-holt-withdrawal.webp');
  assert.equal(resolvePortraitFile('Марта Хейз', 'tension'), 'marta-hayes-tension.webp');
  assert.equal(resolvePortraitFile('Марта Хейз', 'warmth'), 'marta-hayes-warmth.webp');
  assert.equal(resolvePortraitFile('Марта Хейз', 'withdrawal'), 'marta-hayes-withdrawal.webp');
  assert.equal(resolvePortraitFile('Отец Томас', 'tension'), 'father-thomas-tension.webp');
  assert.equal(resolvePortraitFile('Отец Томас', 'warmth'), 'father-thomas-warmth.webp');
  assert.equal(resolvePortraitFile('Отец Томас', 'withdrawal'), 'father-thomas-withdrawal.webp');
  assert.equal(resolvePortraitFile('Себастьян Блэквуд', 'tension'), 'sebastian-blackwood-tension.webp');
  assert.equal(resolvePortraitFile('Себастьян Блэквуд', 'warmth'), 'sebastian-blackwood-warmth.webp');
  assert.equal(resolvePortraitFile('Себастьян Блэквуд', 'withdrawal'), 'sebastian-blackwood-withdrawal.webp');
  assert.equal(resolvePortraitFile('Неизвестный свидетель', 'withdrawal'), null);
});

test('dialogue supports readable pacing, skip and critical visual focus', () => {
  const dialog = read('src/js/components/dialog-box.js');
  const styles = read('src/css/art-direction.css');
  assert.ok(dialog.includes('id="dialog-skip"'), 'dialogue must offer a skip control');
  assert.ok(dialog.includes('this.skipTyping'), 'skip control should terminate the typewriter effect');
  assert.ok(dialog.includes('prefers-reduced-motion'), 'respect reduced motion preference');
  assert.ok(dialog.includes("node.type === 'critical_choice'"), 'critical choices should be visually distinct');
  assert.ok(styles.includes('.cinematic-dialog.dialog-critical'), 'critical dialogue treatment must exist');
  assert.ok(styles.includes('.dialog-skip:focus-visible'), 'keyboard focus must remain visible');
  assert.ok(dialog.includes('previousSpeaker === node.speaker'), 'crossfade must only occur for the same character');
  assert.ok(dialog.includes('!reducedMotion && previousSpeaker'), 'reduced motion must disable portrait crossfade');
  assert.ok(styles.includes('.portrait-image-enter'), 'new emotion portrait needs a reveal');
  assert.ok(styles.includes('.portrait-image-exit'), 'previous emotion portrait needs a farewell');
  assert.ok(styles.includes('@keyframes portrait-focus'), 'critical dialogue should gain a restrained visual focus');
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
