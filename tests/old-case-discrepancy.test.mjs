import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCaseDiscrepancy, recordOldCaseDiscrepancy } from '../src/js/systems/old-case-discrepancy.js';

const known = new Set(['old_case_clerk_statement', 'old_case_dock_statement', 'old_case_transfer_card']);
const has = id => known.has(id);
const witnessReading = { choice: 'direct_only' };
const followUp = { id: 'dock_origin' };
test('сверка расхождения требует завершённого свидетельского маршрута', () => {
  assert.equal(assessOldCaseDiscrepancy(has, null, followUp), null);
  assert.equal(assessOldCaseDiscrepancy(has, witnessReading, null), null);
  assert.equal(assessOldCaseDiscrepancy(id => id !== 'old_case_dock_statement' && has(id), witnessReading, followUp), null);
  assert.ok(assessOldCaseDiscrepancy(has, witnessReading, { id: 'clerk_precision' }));
});
test('сопоставление не изобретает ложь или взаимоисключающие факты', () => {
  const result = assessOldCaseDiscrepancy(has, witnessReading, followUp);
  assert.match(result.finding, /разные события/);
  assert.equal(recordOldCaseDiscrepancy('deliberate_lie', result).correct, false);
  assert.equal(recordOldCaseDiscrepancy('judge_confirmed', result).correct, false);
});
test('обоснованная оценка сохраняется только один раз', () => {
  const check = assessOldCaseDiscrepancy(has, witnessReading, followUp);
  const saved = recordOldCaseDiscrepancy('source_gap', check);
  assert.equal(saved.correct, true);
  assert.match(saved.nextStep, /независимую первичную запись/);
  assert.equal(recordOldCaseDiscrepancy('source_gap', check, saved), null);
  assert.equal(recordOldCaseDiscrepancy('unlisted', check), null);
});
