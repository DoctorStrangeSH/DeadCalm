import test from 'node:test';
import assert from 'node:assert/strict';
import { getOldCaseNavigation } from '../src/js/systems/old-case-navigation.js';

test('маршрут скрыт до обнаружения старого дела', () => {
  assert.deepEqual(getOldCaseNavigation().stages, []);
});
test('показывает только доступные этапы, не раскрывая будущие', () => {
  const route = getOldCaseNavigation({ court_old_case_reading: { id: 'x' } });
  assert.deepEqual(route.stages.map(stage => stage.id), ['archive']);
  assert.equal(route.next.id, 'archive');
});
test('завершённые проверки сохраняют статус и добавляют следующий этап', () => {
  const route = getOldCaseNavigation({ court_old_case_reading: {}, court_old_case_closure_review: {} });
  assert.deepEqual(route.stages.map(stage => stage.status), ['done', 'available']);
  assert.equal(route.completed, 1);
  assert.equal(route.next.id, 'order');
});
test('сверка источников появляется только при фактическом наличии трёх улик', () => {
  const flags = { court_old_case_morgan_approach: {} };
  const required = new Set(['old_case_details', 'old_case_closure_register', 'old_case_transfer_card']);
  assert.equal(getOldCaseNavigation(flags, () => false).stages.some(stage => stage.id === 'sources'), false);
  assert.equal(getOldCaseNavigation(flags, id => required.has(id)).stages.some(stage => stage.id === 'sources'), true);
});
