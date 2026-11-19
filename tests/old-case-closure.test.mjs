import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessOldCaseClosure, recordOldCaseClosure, OLD_CASE_CLOSURE_SOURCES } from '../src/js/systems/old-case-closure.js';

const reading = { readingId: 'historical_warning' };

test('old case closure audit requires a recorded crosscheck', () => {
  assert.equal(assessOldCaseClosure(() => true, null), null);
  assert.equal(assessOldCaseClosure(() => true, { readingId: 'unknown' }), null);
});

test('old case closing documents remain separately discoverable', () => {
  const check = assessOldCaseClosure(id => id === 'old_case_details', reading);
  assert.deepEqual(check.missing, ['old_case_closure_register', 'old_case_archive_inventory']);
  assert.equal(check.ready, false);
  assert.equal(recordOldCaseClosure(check), null);
});

test('complete archival review preserves uncertainty and creates no evidence', () => {
  const check = assessOldCaseClosure(() => true, reading);
  assert.equal(check.ready, true);
  assert.equal(check.found.length, OLD_CASE_CLOSURE_SOURCES.length);
  assert.match(check.uncertainty, /не подтверждает/);
  const note = recordOldCaseClosure(check);
  assert.equal(note.status, 'Требует дополнительной проверки');
  assert.equal('guilty' in note, false);
  assert.equal(recordOldCaseClosure(check, note), null);
});

test('Morgan gives old case lead and precinct archive records a saved follow-up', () => {
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(JSON.stringify(dialogues).includes('"gives_clue":"old_case_details"'));
  for (const id of OLD_CASE_CLOSURE_SOURCES) assert.ok(clues[id]?.source);
  assert.match(scene, /id="precinct-old-case"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_closure_review', note\)/);
  assert.match(cache, /old-case-closure\.js/);
});
