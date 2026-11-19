import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCasePortLog, recordOldCasePortLogReading } from '../src/js/systems/old-case-port-log.js';

const discrepancy = { id: 'source_gap' };
test('журнал доступен только после корректного вывода о пробеле источника', () => {
  assert.equal(assessOldCasePortLog(() => true, null), null);
  assert.equal(assessOldCasePortLog(() => true, { id: 'deliberate_lie' }), null);
  assert.equal(assessOldCasePortLog(() => false, discrepancy).found, false);
});
test('без найденного документа нельзя зафиксировать интерпретацию', () => {
  const check = assessOldCasePortLog(() => false, discrepancy);
  assert.equal(recordOldCasePortLogReading('limited_record', check), null);
});
test('запись въезда не доказывает личность судьи', () => {
  const check = assessOldCasePortLog(id => id === 'old_case_port_visitor_log', discrepancy);
  assert.match(check.finding, /не его участника/);
  assert.equal(recordOldCasePortLogReading('judge_present', check).correct, false);
  assert.equal(recordOldCasePortLogReading('rumor_disproved', check).correct, false);
});
test('осторожный вывод сохраняется однократно', () => {
  const check = assessOldCasePortLog(() => true, discrepancy);
  const saved = recordOldCasePortLogReading('limited_record', check);
  assert.equal(saved.correct, true);
  assert.equal(recordOldCasePortLogReading('limited_record', check, saved), null);
  assert.equal(recordOldCasePortLogReading('unknown', check), null);
});
