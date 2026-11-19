import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const board = readFileSync(new URL('../src/js/components/investigation-board.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');

test('saved hypothesis can highlight discovered evidence on the board without changing state', () => {
  assert.match(board, /data-focus-hypothesis=/);
  assert.match(board, /aria-pressed="\$\{this\.focusedHypothesisId === item\.id\}"/);
  assert.match(board, /const hypothesis = \(GameState\.currentCase\.hypotheses \|\| \[\]\)\.find/);
  assert.match(board, /cards\.filter\(card => ids\.has\(card\.dataset\.clueId\)\)/);
  assert.match(board, /#board-search-reset/);
  assert.match(board, /matching\[0\]\.focus\(\{ preventScroll: true \}\)/);
  assert.match(styles, /\.board-clue-card\.board-clue-hypothesis \{/);
  const method = board.split('  _focusHypothesisClues(hypothesisId) {')[1].split('\n  _clearHypothesisFocus()')[0];
  assert.doesNotMatch(method, /GameState\.(?:reviseHypothesis|addHypothesis|addClue)|saveConnection/);
});

test('focused evidence is reversible and selection reset clears the highlight', () => {
  assert.match(board, /self\._clearHypothesisFocus\(\)/);
  assert.match(board, /card\.classList\.remove\('board-clue-hypothesis', 'board-clue-hypothesis-muted'\)/);
  assert.match(board, /if \(this\.focusedHypothesisId === hypothesisId\)/);
});
