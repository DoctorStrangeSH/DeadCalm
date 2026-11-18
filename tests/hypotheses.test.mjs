import test from 'node:test';
import assert from 'node:assert/strict';
import { auditHypothesisEvidence, createHypothesis, reviseHypothesis } from '../src/js/systems/hypotheses.js';

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

test('editing title and evidence preserves past snapshots and avoids duplicate revisions', () => {
  const first = createHypothesis({ id: 'h', title: 'Старая', reasoning: 'Запись', clueIds: ['autopsy'] }, evidence, '2026-01-01');
  const second = reviseHypothesis(first, { title: 'Новая', clueIds: ['letter'] }, evidence, '2026-01-02');
  assert.equal(second.title, 'Новая');
  assert.equal(second.history[0].title, 'Старая');
  assert.deepEqual(second.history[0].clueIds, ['autopsy']);
  assert.deepEqual(second.history[1].clueIds, ['letter']);
  assert.equal(reviseHypothesis(second, {}, evidence), second);
  assert.throws(() => reviseHypothesis(second, { title: ' ' }, evidence));
});

test('audit recognizes indirect supporting chains without declaring a hypothesis true', () => {
  const clues = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const catalog = {
    a: { connections_to: ['b'] },
    b: { connections_to: ['c'] },
    c: { connections_to: [] }
  };
  const result = auditHypothesisEvidence({ clueIds: ['a', 'b', 'c'] }, clues, catalog);
  assert.equal(result.attached, 3);
  assert.equal(result.connections.length, 2);
  assert.equal(result.groups.length, 1);
  assert.equal(result.needsReview, false);
  assert.equal('confirmed' in result, false);
});

test('audit spots evidence islands and unavailable references without plot spoilers', () => {
  const result = auditHypothesisEvidence({ clueIds: ['a', 'b', 'lost'] }, [
    { id: 'a', connections_to: [] }, { id: 'b', connections_to: [] }
  ]);
  assert.equal(result.attached, 2);
  assert.equal(result.missing, 1);
  assert.equal(result.groups.length, 2);
  assert.equal(result.needsReview, true);
  assert.equal(JSON.stringify(result).includes('lost'), false);
});
