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
  assert.ok(map.includes('if (!this._isUnlocked(loc)) return'), 'locked locations must not be enterable');
  assert.ok(map.includes("import { isLocationUnlocked } from '../systems/location-access.js'"), 'map must import the shared campaign access resolver');
  assert.ok(map.includes('return isLocationUnlocked(location, GameState)'), 'map must resolve location access from current game state');
  assert.ok(!map.includes('<svg'), 'map background should be raster rather than SVG');
});

test('all map destinations have loadable story scene modules', () => {
  const map = read('src/js/components/map.js');
  for (const scene of ['office', 'morgue', 'crime-scene', 'police-station', 'bar', 'church', 'blackwood-mansion', 'holt-house', 'port']) {
    assert.ok(existsSync(resolve(root, `src/js/scenes/${scene}.js`)), `missing scene module: ${scene}`);
    assert.ok(map.includes(`'${scene}'`), `map does not route to scene: ${scene}`);
  }
  assert.ok(existsSync(resolve(root, 'src/js/components/story-location.js')));
});

test('PWA cache includes visual styles, map data and the new image assets', () => {
  const sw = read('sw.js');
  for (const resource of [
    'src/css/art-direction.css', 'src/data/locations.json',
    'src/js/systems/dialogue-reactions.js', 'src/js/components/story-location.js',
    'blackford-city-atlas.webp', 'blackford-courtroom.webp',
    'blackford-precinct.webp', 'blackford-morgue.webp', 'blackford-rusty-anchor.webp',
    'lydia-winter.webp', 'lydia-winter-tension.webp', 'lydia-winter-warmth.webp', 'lydia-winter-withdrawal.webp', 'ray-morgan.webp', 'anna-holt.webp', 'marta-hayes.webp',
    'father-thomas.webp', 'father-thomas-tension.webp', 'father-thomas-warmth.webp', 'father-thomas-withdrawal.webp', 'sebastian-blackwood.webp', 'sebastian-blackwood-tension.webp', 'sebastian-blackwood-warmth.webp', 'sebastian-blackwood-withdrawal.webp', 'ray-morgan-tension.webp', 'ray-morgan-warmth.webp', 'ray-morgan-withdrawal.webp', 'anna-holt-tension.webp', 'anna-holt-warmth.webp', 'anna-holt-withdrawal.webp', 'marta-hayes-tension.webp', 'marta-hayes-warmth.webp', 'marta-hayes-withdrawal.webp'
  ]) assert.ok(sw.includes(resource), `cache missing ${resource}`);
  for (const scene of ['church.js', 'blackwood-mansion.js', 'holt-house.js', 'port.js']) {
    assert.ok(sw.includes(`/src/js/scenes/${scene}`), `PWA cache missing ${scene}`);
  }
  assert.ok(sw.includes('dead-calm-visual-v106'), 'new story scenes require a new cache version');
  assert.ok(sw.includes("self.addEventListener('activate'"), 'old PWA caches should be cleared');
});

test('investigation board becomes a flowing grid on tablet and narrow screens', () => {
  const css = read('src/css/art-direction.css');
  const responsive = css.match(/@media\(max-width:900px\) \{[\s\S]*?\.investigation-board \.board-lines \{ display:none; \}/)?.[0];
  assert.ok(responsive, 'tablet board layout must disable overlapping SVG connections');
  assert.match(responsive, /\.board-clues \{ position:relative; height:auto; display:grid/);
  assert.match(responsive, /\.board-clue-card \{ position:relative; top:auto!important; left:auto!important; width:100%/);
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
  assert.ok(dialog.includes("node.type === 'critical_result' && !reducedMotion && !this.skipTyping"), 'critical result pause must be skippable and accessible');
  assert.ok(dialog.includes("skipButton.addEventListener('click', finish"), 'skip action must dismiss dramatic pause');
  assert.ok(dialog.includes("choicesEl.classList.add('dialog-choices-revealed')"), 'choices should reveal after text completes');
  assert.ok(styles.includes('@keyframes dialog-choice-reveal'), 'choices should enter gently');
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

test('dialogue discovery cards only announce newly recorded clues and notes', () => {
  const engine = read('src/js/systems/dialogue.js');
  const dialog = read('src/js/components/dialog-box.js');
  const styles = read('src/css/art-direction.css');
  assert.ok(engine.includes('!GameState.hasClue(clue.id)'), 'clues must be checked for duplicates');
  assert.ok(engine.includes('return false;'), 'duplicate notebook entries must not be announced');
  assert.ok(engine.includes('addedClue: context.addedClue || null'), 'actual new clues must reach UI');
  assert.ok(dialog.includes('_renderDiscoveryCards(node, choicesEl)'), 'both answer types should show discoveries');
  assert.ok(dialog.includes('title.textContent = entry.data.name || entry.data.title'), 'discovery titles must be inserted as text');
  assert.ok(styles.includes('.cinematic-dialog .dialog-discovery'), 'archival discovery style should exist');
});

test('detective journal has a separate searchable evidence archive', () => {
  const notebook = read('src/js/systems/notebook.js');
  const ui = read('src/js/components/notebook-ui.js');
  const css = read('src/css/art-direction.css');
  assert.ok(notebook.includes('GameState.currentCase?.clues || []'), 'evidence is read from saved case state');
  assert.ok(ui.includes('data-filter="clues"'), 'evidence must have its own filter');
  assert.ok(ui.includes("this.filter === 'clues'"), 'evidence filter must load clues');
  assert.ok(ui.includes("(n.source || '').toLowerCase().includes(query)"), 'search includes the source');
  assert.ok(ui.includes('_showClueDetail(title)'), 'clues should have readable detail view');
  assert.ok(css.includes('.notebook-evidence-detail'), 'evidence details should match the noir journal');
});


test('mini-games expose keyboard focus, touch-sized controls and announced progress', () => {
  const css = read('src/css/main.css');
  const radio = read('src/js/scenes/radio-tuning.js');
  const film = read('src/js/scenes/film-restoration.js');
  const repair = read('src/js/scenes/mechanical-repair.js');
  assert.match(css, /\.radio-range:focus-visible/);
  assert.match(css, /\.film-range:focus-visible/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(radio, /aria-live="polite"/);
  assert.match(radio, /role="progressbar"/);
  assert.match(radio, /setAttribute\('aria-valuenow'/);
  assert.match(film, /role="progressbar"/);
  assert.match(repair, /aria-live="polite"/);
});


test('main-menu settings are accessible, persistent and wired to dialogue pacing', () => {
  const menu = read('src/js/scenes/main-menu.js');
  const state = read('src/js/core/state.js');
  const audio = read('src/js/core/audio.js');
  const dialog = read('src/js/components/dialog-box.js');
  const css = read('src/css/art-direction.css');
  assert.ok(menu.includes('role="dialog" aria-modal="true"'), 'settings must be a modal dialog');
  assert.ok(menu.includes('id="settings-music"') && menu.includes('id="settings-sfx"'), 'both volume controls must exist');
  assert.ok(menu.includes('id="settings-text-speed"'), 'text speed control must exist');
  assert.ok(menu.includes("event.key === 'Escape'"), 'settings must close with Escape');
  assert.ok(menu.includes('settingsDialog.querySelectorAll'), 'settings must keep keyboard focus inside the modal');
  assert.ok(menu.includes('GameState.save()'), 'settings changes must persist');
  assert.ok(state.includes('function normalizeSettings(settings)'), 'saved settings must be normalized');
  assert.ok(audio.includes('this._musicGain.gain.value = this._musicVolume'), 'music mixer must apply its saved level');
  assert.ok(audio.includes('this._sfxGain.gain.value = this._sfxVolume'), 'SFX mixer must apply its saved level');
  assert.ok(dialog.includes('textDelays') && dialog.includes('GameState.settings?.textSpeed'), 'dialogue typewriter must use the selected text speed');
  assert.ok(css.includes('.settings-panel') && css.includes('.settings-control :focus-visible'), 'settings must use the project style and visible keyboard focus');
  assert.ok(!menu.includes('alert(message)'), 'settings placeholder alert must be removed');
});
