import test from 'node:test';
import assert from 'node:assert/strict';
import { getOldCaseBoardDigest } from '../src/js/systems/old-case-board-digest.js';

test('архивный обзор не появляется до открытия соответствующих улик', () => {
  assert.equal(getOldCaseBoardDigest([]), null);
  assert.equal(getOldCaseBoardDigest([{ id: 'judge_notes' }]), null);
});
test('обзор показывает только действительно найденные документы', () => {
  const digest = getOldCaseBoardDigest([
    { id: 'old_case_details' }, { id: 'old_case_clerk_statement' }, { id: 'judge_notes' }
  ]);
  assert.equal(digest.total, 2);
  assert.deepEqual(digest.groups.map(group => group.id), ['closure', 'accounts']);
  assert.equal(digest.groups.some(group => group.clueIds.includes('old_case_port_visitor_log')), false);
});
test('сохранённые выводы показываются без приписывания им доказанной личности', () => {
  const digest = getOldCaseBoardDigest([{ id: 'old_case_port_visitor_log' }, { id: 'old_case_dock_statement' }], {
    court_old_case_discrepancy: { id: 'source_gap' },
    court_old_case_port_log_reading: { choice: 'limited_record' }
  });
  assert.equal(digest.observations.length, 2);
  assert.match(digest.warning, /не устанавливают/);
});
test('путевой лист и вывод о нём появляются лишь после получения документов', () => {
  const flags = { court_old_case_waybill_reading: { choice: 'unmatched_trip' } };
  const onlyLog = getOldCaseBoardDigest([{ id: 'old_case_port_visitor_log' }], flags);
  assert.equal(onlyLog.total, 1);
  assert.equal(onlyLog.observations.length, 0);
  const both = getOldCaseBoardDigest([{ id: 'old_case_port_visitor_log' }, { id: 'old_case_port_waybill' }], flags);
  assert.equal(both.total, 2);
  assert.equal(both.observations.length, 1);
  assert.match(both.observations[0], /не установлена/);
});
test('сохранённые флаги не раскрывают отсутствующие в деле источники', () => {
  const digest = getOldCaseBoardDigest([{ id: 'old_case_details' }], {
    court_old_case_closure_review: {}, court_old_case_witness_reading: { choice: 'direct_only' },
    court_old_case_discrepancy: { id: 'source_gap' }, court_old_case_port_log_reading: { choice: 'limited_record' }
  });
  assert.deepEqual(digest.observations, []);
});
test('повреждённые элементы не считаются найденными уликами', () => {
  assert.equal(getOldCaseBoardDigest([null, {}, { id: null }]), null);
});
