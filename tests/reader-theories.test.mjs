import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareReaderTheories, READER_THEORIES } from '../src/js/systems/reader-theories.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));

test('competing scenarios stay locked before the reconstructed chronology', () => {
  assert.deepEqual(compareReaderTheories(() => false), []);
  assert.deepEqual(compareReaderTheories(id => id !== 'reader_reconstructed_timeline'), []);
});

test('three scenarios measure available documents and keep conclusions unproven', () => {
  assert.equal(READER_THEORIES.length, 3);
  const baseline = compareReaderTheories(id => id === 'reader_reconstructed_timeline');
  assert.equal(baseline.length, 3);
  for (const theory of baseline) {
    assert.equal(theory.status, 'Не доказано');
    assert.deepEqual(theory.observed, []);
    assert.equal(theory.unavailable.length, theory.observations.length);
    for (const id of [...theory.observations, ...theory.checks]) assert.ok(clues[id], id);
    assert.ok(theory.question.length > 30);
  }
  const discovered = new Set(['reader_reconstructed_timeline', 'orlov_badge_scan', 'reader_test_diagnostic']);
  const updated = compareReaderTheories(id => discovered.has(id));
  assert.deepEqual(updated[0].observed, ['orlov_badge_scan']);
  assert.deepEqual(updated[0].verifiedChecks, ['reader_test_diagnostic']);
  assert.deepEqual(updated[0].pendingChecks, ['key_signature_comparison']);
  assert.equal(updated[0].status, 'Не доказано');
  assert.equal(updated[2].status, 'Не доказано');
});

test('alternative-version panel is revealed with chronology and updates after evidence checks', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theories-view"[^>]*GameState\.hasClue\('reader_reconstructed_timeline'\)/);
  assert.match(scene, /function refreshReaderTheories\(\)/);
  assert.match(scene, /compareReaderTheories\(id => GameState\.hasClue\(id\)\)/);
  assert.match(scene, /container\.querySelector\('#reader-theories-view'\)\.hidden = false/);
  assert.match(scene, /refreshCourtWorkflow\(\);\s*refreshReaderTheories\(\)/);
  assert.match(scene, /setAttribute\('aria-pressed'/);
  assert.match(css, /\.reader-theories-option:focus-visible/);
  assert.match(css, /\.reader-theories-options \{ grid-template-columns:1fr/);
  assert.match(cache, /reader-theories\.js/);
});
