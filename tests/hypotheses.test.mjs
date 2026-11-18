import test from 'node:test';
import assert from 'node:assert/strict';
import { createHypothesis, reviseHypothesis } from '../src/js/systems/hypotheses.js';

const evidence = [{ id: 'autopsy' }, { id: 'letter' }];

test('hypothesis requires an actual statement and never accepts missing clues', () => {
  assert.throws(() => createHypothesis({ id: 'h', title: '', reasoning: '...' }, evidence));
  assert.throws(() => createHypothesis({ id: 'h', title: 'Версия', reasoning: ' ' }, evidence));
  const item = createHypothesis({ id: 'h', title: ' Версия ', reasoning: 'Связь', clueIds: ['autopsy', 'unknown', 'autopsy'] }, evidence, '2026-01-01');
  assert.equal(item.title, 'Версия');
  assert.deepEqual(item.clueIds, ['autopsy']);
  assert.equal(item.status, 'unchecked');
  assert.equal(item.history.length, 1);
});

test('changing a theory retains its earlier reasoning and revisions', () => {
  const first = createHypothesis({ id: 'h', title: 'Версия', reasoning: 'Первая мысль', clueIds: ['autopsy'] }, evidence, '2026-01-01');
  const second = reviseHypothesis(first, { reasoning: 'Теперь сомневаюсь', status: 'contradicted', clueIds: ['letter'] }, evidence, '2026-01-02');
  assert.equal(first.reasoning, 'Первая мысль');
  assert.deepEqual(first.clueIds, ['autopsy']);
  assert.equal(second.history.length, 2);
  assert.equal(second.history[1].reasoning, 'Теперь сомневаюсь');
  assert.throws(() => reviseHypothesis(second, { status: 'solved' }, evidence));
});
