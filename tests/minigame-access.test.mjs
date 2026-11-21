import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAccessCase001MiniGame } from '../src/js/systems/minigame-access.js';

function state(day, clues = []) {
  const found = new Set(clues);
  return { campaign: { day }, hasClue: id => found.has(id) };
}

test('all case mini-games remain locked before their authored fourth-day story beat', () => {
  for (const type of ['radio-tuning', 'mechanical-repair', 'film-restoration']) {
    assert.equal(canAccessCase001MiniGame(type, state(1, ['anna_markus_items', 'markus_watch_key'])), false);
    assert.equal(canAccessCase001MiniGame(type, state(3, ['anna_markus_items', 'markus_watch_key'])), false);
  }
});

test('radio tuning opens on day four when the port becomes part of the investigation', () => {
  assert.equal(canAccessCase001MiniGame('radio-tuning', state(4)), true);
  assert.equal(canAccessCase001MiniGame('radio-tuning', state(5)), true);
});

test('watch repair requires Anna to hand over Markus belongings on day four', () => {
  assert.equal(canAccessCase001MiniGame('mechanical-repair', state(4)), false);
  assert.equal(canAccessCase001MiniGame('mechanical-repair', state(4, ['anna_markus_items'])), true);
});

test('film restoration requires the key recovered by successfully repairing Markus watch', () => {
  assert.equal(canAccessCase001MiniGame('film-restoration', state(4, ['anna_markus_items'])), false);
  assert.equal(canAccessCase001MiniGame('film-restoration', state(4, ['markus_watch_key'])), true);
  assert.equal(canAccessCase001MiniGame('film-restoration', state(5, ['markus_watch_key'])), true);
});

test('unknown activities and malformed states fail closed', () => {
  assert.equal(canAccessCase001MiniGame('unregistered-game', state(5)), false);
  assert.equal(canAccessCase001MiniGame('radio-tuning', null), false);
  assert.equal(canAccessCase001MiniGame('radio-tuning', { campaign: { day: 4 } }), false);
});

test('office cards and direct scene routes enforce the same story gates', () => {
  const office = readFileSync(new URL('../src/js/scenes/office.js', import.meta.url), 'utf8');
  assert.match(office, /canAccessCase001MiniGame\('radio-tuning', GameState\)/);
  assert.match(office, /canAccessCase001MiniGame\('mechanical-repair', GameState\)/);
  assert.match(office, /canAccessCase001MiniGame\('film-restoration', GameState\)/);
  assert.match(office, /if \(!canRadio\) return/);
  assert.match(office, /if \(!canRepair\) return/);
  assert.match(office, /if \(!canFilm\) return/);

  for (const [file, type] of [
    ['radio-tuning.js', 'radio-tuning'],
    ['mechanical-repair.js', 'mechanical-repair'],
    ['film-restoration.js', 'film-restoration']
  ]) {
    const scene = readFileSync(new URL('../src/js/scenes/' + file, import.meta.url), 'utf8');
    assert.match(scene, new RegExp("canAccessCase001MiniGame\\('" + type + "', GameState\\)"));
    assert.match(scene, /renderMiniGameLockScreen/);
  }
});
