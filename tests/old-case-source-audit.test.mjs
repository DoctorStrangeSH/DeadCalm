import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCaseSources, recordOldCaseSourceReading, OLD_CASE_SOURCE_READINGS } from '../src/js/systems/old-case-source-audit.js';

const evidence = new Set(['old_case_details', 'old_case_closure_register', 'old_case_transfer_card']);
const hasClue = id => evidence.has(id);

test('сверка недоступна без устного сообщения и двух архивных источников', () => {
  for (const id of evidence) {
    assert.equal(assessOldCaseSources(key => key !== id && hasClue(key)), null);
  }
});

test('сверка разделяет документальные факты и неподтверждённые имена', () => {
  const check = assessOldCaseSources(hasClue);
  assert.match(check.established, /Книга закрытых дел/);
  assert.match(check.limit, /не фамилию/);
});

test('ошибочный вывод даёт объяснение и допускает повторный выбор', () => {
  const check = assessOldCaseSources(hasClue);
  for (const id of ['all_confirmed', 'nothing_confirmed']) {
    const result = recordOldCaseSourceReading(id, check);
    assert.equal(result.correct, false);
    assert.ok(result.feedback.length > 40);
  }
  assert.equal(recordOldCaseSourceReading('partial_confirmation', check).correct, true);
});

test('верная оценка сохраняется единожды, а неизвестный вариант отклоняется', () => {
  const check = assessOldCaseSources(hasClue);
  const saved = recordOldCaseSourceReading('partial_confirmation', check);
  assert.equal(saved.readingId, 'partial_confirmation');
  assert.equal(recordOldCaseSourceReading('all_confirmed', check, saved), null);
  assert.equal(recordOldCaseSourceReading('fake', check), null);
  assert.equal(OLD_CASE_SOURCE_READINGS.length, 3);
});
