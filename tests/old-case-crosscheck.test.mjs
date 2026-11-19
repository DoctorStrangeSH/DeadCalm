import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessOldCaseCrosscheck, recordOldCaseReading, OLD_CASE_READINGS } from '../src/js/systems/old-case-crosscheck.js';

const nextLead = [{ kind: 'next_lead', targetClueId: 'judge_notes', conclusionVersion: 1 }];

test('old case cannot be compared before supervisor points to diary', () => {
  const all = () => true;
  assert.equal(assessOldCaseCrosscheck(all, []), null);
  assert.equal(assessOldCaseCrosscheck(all, [{ kind: 'additional_check', targetClueId: 'judge_notes' }]), null);
});

test('crosscheck waits for both independently found sources', () => {
  const onlyDiary = assessOldCaseCrosscheck(id => id === 'judge_notes', nextLead);
  assert.equal(onlyDiary.ready, false);
  assert.deepEqual(onlyDiary.missing, ['old_case_details']);
  assert.equal(recordOldCaseReading('historical_warning', onlyDiary), null);
  const complete = assessOldCaseCrosscheck(id => ['judge_notes', 'old_case_details'].includes(id), nextLead);
  assert.equal(complete.ready, true);
  assert.match(complete.limit, /не доказывает/);
});

test('a reading is a bounded interpretation, not evidence or culprit', () => {
  const check = assessOldCaseCrosscheck(() => true, nextLead);
  for (const reading of OLD_CASE_READINGS) {
    const saved = recordOldCaseReading(reading.id, check);
    assert.deepEqual(saved.sourceIds, ['judge_notes', 'old_case_details']);
    assert.equal(saved.readingId, reading.id);
    assert.equal('clueId' in saved, false);
    assert.match(saved.assessment, /не /);
    assert.equal(recordOldCaseReading(reading.id, check, saved), null);
  }
  assert.equal(recordOldCaseReading('unknown', check), null);
});

test('UI reacts to discovery and retains selected reading through game flags', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="old-case-crosscheck"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_reading', saved\)/);
  assert.match(scene, /refreshOldCaseCrosscheck\(\)/);
  assert.match(sw, /old-case-crosscheck\.js/);
});
