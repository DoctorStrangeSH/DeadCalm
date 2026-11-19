import test from 'node:test';
import assert from 'node:assert/strict';
import { planOldCaseWitnessFollowUp, recordOldCaseWitnessFollowUp } from '../src/js/systems/old-case-witness-follow-up.js';

const reading = { choice: 'direct_only' };
const clues = new Set(['old_case_clerk_statement', 'old_case_dock_statement', 'old_case_transfer_card']);
test('запрос открывается после корректной сверки показаний', () => {
  assert.equal(planOldCaseWitnessFollowUp(null), null);
  assert.equal(planOldCaseWitnessFollowUp({ choice: 'both_direct' }), null);
  assert.equal(planOldCaseWitnessFollowUp(reading).length, 2);
});
test('обе проверки требуют существования архивных показаний', () => {
  const missing = id => id !== 'old_case_dock_statement' && clues.has(id);
  assert.equal(recordOldCaseWitnessFollowUp('dock_origin', reading, missing), null);
  assert.equal(recordOldCaseWitnessFollowUp('clerk_precision', reading, missing), null);
});
test('сверка делопроизводителя требует карточку и не устанавливает отправителя', () => {
  assert.equal(recordOldCaseWitnessFollowUp('clerk_precision', reading, id => id !== 'old_case_transfer_card' && clues.has(id)), null);
  const result = recordOldCaseWitnessFollowUp('clerk_precision', reading, id => clues.has(id));
  assert.match(result.response, /Имя отправителя не указано/);
});
test('поиск слуха сохраняет ограничение доказательства и не повторяется', () => {
  const result = recordOldCaseWitnessFollowUp('dock_origin', reading, id => clues.has(id));
  assert.match(result.response, /первоисточник/);
  assert.equal(recordOldCaseWitnessFollowUp('dock_origin', reading, id => clues.has(id), result), null);
  assert.equal(recordOldCaseWitnessFollowUp('invented', reading, id => clues.has(id)), null);
});
