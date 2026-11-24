import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scenes = {
  'mechanical-repair': readFileSync(new URL('../src/js/scenes/mechanical-repair.js', import.meta.url), 'utf8'),
  'radio-tuning': readFileSync(new URL('../src/js/scenes/radio-tuning.js', import.meta.url), 'utf8'),
  'film-restoration': readFileSync(new URL('../src/js/scenes/film-restoration.js', import.meta.url), 'utf8')
};

test('each authored mini-game enforces its story gate before creating a playable session', () => {
  for (const [type, source] of Object.entries(scenes)) {
    const gate = source.indexOf(`canAccessCase001MiniGame('${type}'`);
    const session = source.search(/create(?:Repair|Radio|FilmRestoration)Session\(/);
    assert.notEqual(gate, -1, type + ' must enforce its story gate');
    assert.notEqual(session, -1, type + ' must create a playable session');
    assert.ok(gate < session, type + ' must check access before creating the session');
    assert.match(source, /renderMiniGameLockScreen/, type + ' must explain locked access');
  }
});

test('each mini-game records the completed attempt and delegates clue validation to the case evidence system', () => {
  for (const [type, source] of Object.entries(scenes)) {
    assert.match(source, /GameState\.recordMiniGameResult\(/, type + ' must persist attempt progress');
    assert.match(source, /recordCase001MiniGameEvidence\(GameState,/, type + ' must use centralized evidence validation');
    assert.match(source, /Events\.emit\('minigame:completed'/, type + ' must publish completion');
  }
});

test('mini-game replay starts a fresh session through the scene entry point', () => {
  assert.match(scenes['mechanical-repair'], /if \(action === 'again'\) \{ render\(container\); return; \}/);
  assert.match(scenes['radio-tuning'], /#radio-again[\s\S]*?render\(container\)/);
  assert.match(scenes['film-restoration'], /#film-replay[\s\S]*?render\(container\)/);
});
