import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessOldCaseOrder, recordOldCaseOrderInterpretation, OLD_CASE_ORDER_INTERPRETATIONS, OLD_CASE_ORDER_SOURCES } from '../src/js/systems/old-case-order.js';

const closureReview = { status: 'Требует дополнительной проверки' };

test('court order check opens only after archival closure review', () => {
  assert.equal(assessOldCaseOrder(() => true, null), null);
  assert.equal(assessOldCaseOrder(() => true, { status: 'Завершено' }), null);
});

test('order and authority roster must both be collected independently', () => {
  const check = assessOldCaseOrder(id => id === 'old_case_original_order', closureReview);
  assert.equal(check.ready, false);
  assert.deepEqual(check.missing, ['old_case_authority_roster']);
  assert.equal(recordOldCaseOrderInterpretation('signature_unverified', check), null);
});

test('possible authority and unverified signature never establish identity or forgery', () => {
  const check = assessOldCaseOrder(() => true, closureReview);
  assert.equal(check.ready, true);
  assert.match(check.limitation, /не устанавливают/);
  for (const option of OLD_CASE_ORDER_INTERPRETATIONS) {
    const saved = recordOldCaseOrderInterpretation(option.id, check);
    assert.deepEqual(saved.sourceIds, OLD_CASE_ORDER_SOURCES);
    assert.match(saved.nextStep, /оригинал/);
    assert.equal('culprit' in saved, false);
    assert.equal(recordOldCaseOrderInterpretation(option.id, check, saved), null);
  }
  assert.equal(recordOldCaseOrderInterpretation('invented', check), null);
});

test('precinct lets player inspect the documents and persists a bounded reading', () => {
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const id of OLD_CASE_ORDER_SOURCES) assert.ok(catalog[id]?.source);
  assert.match(scene, /id="precinct-old-case-order"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_order_interpretation', result\)/);
  assert.match(sw, /old-case-order\.js/);
});
