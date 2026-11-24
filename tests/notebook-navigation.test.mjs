import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/js/components/notebook-ui.js', import.meta.url), 'utf8');

test('evidence cards navigate by stable clue id rather than potentially duplicate names', () => {
  assert.match(source, /data-clue-id="\$\{escapeHtml\(note\.id \|\| ''\)\}"/);
  assert.match(source, /self\._showClueDetail\(this\.getAttribute\('data-clue-id'\) \|\| title\)/);
});

test('journal controls are scoped to their own container', () => {
  assert.match(source, /this\.container\.querySelector\('#notebook-search-input'\)/);
  assert.match(source, /this\.container\.querySelector\('#btn-export-notes'\)/);
});

test('journal cards safely render incomplete legacy records', () => {
  assert.match(source, /String\(note\.text \|\| ''\)\.substring\(0, 180\)/);
  assert.match(source, /note\.category \|\| 'Общее'/);
  assert.match(source, /note\.title \|\| 'Без названия'/);
});
