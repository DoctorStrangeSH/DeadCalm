import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessOldCaseSignature, recordOldCaseSignatureAction, OLD_CASE_SIGNATURE_ACTIONS, OLD_CASE_SIGNATURE_SOURCES } from '../src/js/systems/old-case-signature.js';

const interpretation = { interpretationId: 'signature_unverified' };

test('signature checks remain locked until order interpretation exists', () => {
  assert.equal(assessOldCaseSignature(() => true, null), null);
  assert.equal(assessOldCaseSignature(() => true, { interpretationId: 'unrelated' }), null);
});

test('original and independent samples are both required', () => {
  const first = assessOldCaseSignature(id => id === 'old_case_order_physical_original', interpretation);
  assert.equal(first.ready, false);
  assert.deepEqual(first.missing, ['old_case_signature_samples']);
  assert.equal(recordOldCaseSignatureAction('request_specialist', first), null);
});

test('damage prevents definitive matching, and follow-up is one-off', () => {
  const full = assessOldCaseSignature(() => true, interpretation);
  assert.equal(full.ready, true);
  assert.match(full.finding, /невозможно/);
  assert.match(full.limit, /не подтверждает подделку/);
  for (const option of OLD_CASE_SIGNATURE_ACTIONS) {
    const saved = recordOldCaseSignatureAction(option.id, full);
    assert.deepEqual(saved.sourceIds, OLD_CASE_SIGNATURE_SOURCES);
    assert.equal(saved.status, 'Подписант не установлен');
    assert.equal(recordOldCaseSignatureAction(option.id, full, saved), null);
  }
  assert.equal(recordOldCaseSignatureAction('accuse', full), null);
});

test('precinct requests source documents and persists non-accusatory next action', () => {
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const id of OLD_CASE_SIGNATURE_SOURCES) assert.ok(clues[id]?.source);
  assert.match(scene, /id="precinct-old-case-signature"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_signature_action', selected\)/);
  assert.match(cache, /old-case-signature\.js/);
});
