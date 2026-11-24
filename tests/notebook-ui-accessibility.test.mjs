import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/js/components/notebook-ui.js', import.meta.url), 'utf8');

test('journal search tolerates older records with missing title, text, or source', () => {
  assert.match(source, /String\(n\.title \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(source, /String\(n\.text \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(source, /String\(n\.source \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
});

test('journal note details are keyboard-dismissible and restore focus', () => {
  assert.match(source, /role="dialog" aria-modal="true" aria-label="Запись дневника"/);
  assert.match(source, /if \(event\.key === 'Escape'\) close\(\)/);
  assert.match(source, /if \(restoreFocus && returnFocus\?\.isConnected\) returnFocus\.focus\(\)/);
  assert.match(source, /overlay\.querySelector\('\.close-detail'\)\.focus\(\)/);
});

test('journal note detail handles missing or invalid timestamps', () => {
  assert.match(source, /new Date\(note\.timestamp \|\| ''\)/);
  assert.match(source, /Number\.isNaN\(date\.getTime\(\)\) \? 'Дата не указана'/);
});
