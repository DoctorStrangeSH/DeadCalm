import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCaseWaybill, recordOldCaseWaybillReading } from '../src/js/systems/old-case-waybill.js';
import { getOldCaseNavigation } from '../src/js/systems/old-case-navigation.js';

const portReading = { choice: 'limited_record', correct: true };

test('путевой лист закрыт до обоснованной оценки журнала', () => {
  assert.equal(assessOldCaseWaybill(() => true, null), null);
  assert.equal(assessOldCaseWaybill(() => true, { choice: 'judge_present' }), null);
  assert.equal(assessOldCaseWaybill(() => false, portReading).found, false);
  assert.equal(getOldCaseNavigation({ court_old_case_port_log_reading: portReading }).next.id, 'waybill');
});

test('без документа нельзя сохранить вывод, а совпадение даты не доказывает личность', () => {
  const missing = assessOldCaseWaybill(() => false, portReading);
  assert.equal(recordOldCaseWaybillReading('unmatched_trip', missing), null);
  const found = assessOldCaseWaybill(id => id === 'old_case_port_waybill', portReading);
  assert.equal(recordOldCaseWaybillReading('identified_judge', found).correct, false);
  assert.equal(recordOldCaseWaybillReading('same_vehicle', found).correct, false);
  const saved = recordOldCaseWaybillReading('unmatched_trip', found);
  assert.equal(saved.correct, true);
  assert.match(saved.finding, /нельзя установить/);
  assert.equal(recordOldCaseWaybillReading('unmatched_trip', found, saved), null);
});
