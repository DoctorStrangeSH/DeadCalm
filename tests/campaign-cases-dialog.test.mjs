import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const office = readFileSync(new URL('../src/js/scenes/office.js', import.meta.url), 'utf8');

test('cases dialog reflects the actual active or completed campaign state', () => {
  assert.match(office, /var currentCaseStatus = GameState\.campaign\?\.completed \? 'завершено' : 'активно'/);
  assert.match(office, /Дело №001 — \\?\$\{currentCaseStatus\}/);
  assert.match(office, /Активных дел: \\?\$\{caseSummary\.activeCount\} · Завершённых дел: \\?\$\{caseSummary\.completedCount\}/);
  assert.match(office, /caseSummary\.completed && caseSummary\.endingLabel/);
  assert.match(office, /ИТОГ:/);
});

test('cases dialog exposes accessible dialog semantics and a close action', () => {
  assert.match(office, /role="dialog" aria-modal="true" aria-labelledby="cases-dialog-title"/);
  assert.match(office, /id="cases-dialog-title">ДЕЛА/);
  assert.match(office, /overlay\.querySelector\('\.close-cases'\)/);
  assert.match(office, /if \(e\.target === overlay\) overlay\.remove\(\)/);
});

test('cases dialog no longer contains a hard-coded active status or zero completed cases', () => {
  assert.doesNotMatch(office, /Дело №001 — активно/);
  assert.doesNotMatch(office, /Завершённых дел: 0/);
});
