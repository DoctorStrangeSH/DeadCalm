import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mapSource = readFileSync(new URL('../src/js/components/map.js', import.meta.url), 'utf8');
const cityMapScene = readFileSync(new URL('../src/js/scenes/city-map.js', import.meta.url), 'utf8');

test('re-entering the city map replaces the previous delegated click listener', () => {
  assert.match(mapSource, /const containerClickHandlers = new WeakMap\(\)/);
  assert.match(mapSource, /const previousHandler = containerClickHandlers\.get\(this\.container\)/);
  assert.match(mapSource, /if \(previousHandler\) this\.container\.removeEventListener\('click', previousHandler\)/);
  assert.match(mapSource, /containerClickHandlers\.set\(this\.container, handler\)/);
  assert.match(mapSource, /this\.container\.addEventListener\('click', handler\)/);
  assert.doesNotMatch(mapSource, /this\.container\.addEventListener\('click', event =>/);
});

test('map re-entry rebuilds the atlas from current campaign state and keeps navigation guarded', () => {
  assert.match(cityMapScene, /new Map\(mapContainer, locations(?:, characters)?\)/);
  assert.match(mapSource, /_isUnlocked\(location\)\s*\{\s*return isLocationUnlocked\(location, GameState\)/);
  assert.match(mapSource, /if \(!this\._isUnlocked\(loc\)\) return/);
  assert.match(mapSource, /Events\.emit\('navigate', \{ scene: scenes\[loc\.id\]/);
  for (const [id, scene] of [
    ['office', 'office'], ['morgue', 'morgue'], ['crime_scene_court', 'crime-scene'],
    ['police_station', 'police-station'], ['bar_rusty_anchor', 'bar'],
    ['church', 'church'], ['blackwood_mansion', 'blackwood-mansion'],
    ['holt_house', 'holt-house'], ['port', 'port']
  ]) {
    assert.match(mapSource, new RegExp(id + ": '" + scene + "'"));
  }
});
