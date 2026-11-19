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
  const digest = getOldCaseBoardDigest([{ id: 'old_case_port_visitor_log' }], {
    court_old_case_discrepancy: { id: 'source_gap' },
    court_old_case_port_log_reading: { choice: 'limited_record' }
  });
  assert.equal(digest.observations.length, 2);
  assert.match(digest.warning, /не устанавливают/);
});
test('повреждённые элементы не считаются найденными уликами', () => {
  assert.equal(getOldCaseBoardDigest([null, {}, { id: null }]), null);
});
