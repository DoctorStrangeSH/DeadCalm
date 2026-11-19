import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const board = readFileSync(new URL('../src/js/components/investigation-board.js', import.meta.url), 'utf8');

test('new-evidence notice opens the existing revision form without saving it', () => {
  assert.match(board, /data-review-hypothesis=/);
  assert.match(board, /trigger\.closest\('\.hypothesis-entry'\)/);
  assert.match(board, /editor\.open = true/);
  assert.match(board, /data-new-lead="true"/);
  assert.match(board, /newLeads\.some\(lead => lead\.id === clue\.id\)/);
  assert.match(board, /name="clue"[^\n]*checked/);
  assert.doesNotMatch(board.match(/addEventListener\('click', event => \{\s*const trigger = event\.target\.closest\('\[data-review-hypothesis\]'\);[\s\S]*?\n    \}\);/)?.[0] || '', /reviseHypothesis|setFlag|addClue|\.checked\s*=/);
});
