import test from 'node:test';
import assert from 'node:assert/strict';
import { auditHypothesisEvidence, createHypothesis, reviseHypothesis, findNewEvidenceLeads, compareHypothesisRevisions } from '../src/js/systems/hypotheses.js';

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

test('audit flags shared origin independently of known graph connections', () => {
  const clues = [{ id: 'a', source: 'Архив порта' }, { id: 'b', source: 'архив порта' },
    { id: 'c', source: 'Личный дневник' }, { id: 'd' }];
  const result = auditHypothesisEvidence({ clueIds: ['a', 'b', 'c', 'd'] }, clues, {
    a: { connections_to: ['b', 'c'] }, b: { connections_to: ['d'] }
  });
  assert.equal(result.needsReview, false);
  assert.deepEqual(result.sharedSources[0].clueIds, ['a', 'b']);
  assert.equal(result.unknownSources, 1);
  assert.equal(result.sharedSources.length, 1);
});

test('missing documents and unverified sources never leak into provenance groups', () => {
  const result = auditHypothesisEvidence({ clueIds: ['a', 'hidden'] }, [{ id: 'a', source: 'Запись' }], {
    hidden: { source: 'Тайный источник' }
  });
  assert.equal(result.missing, 1);
  assert.equal(result.sharedSources.length, 0);
  assert.equal(JSON.stringify(result).includes('Тайный источник'), false);
});

test('new evidence leads mention only found clues linked after last revision', () => {
  const hypothesis = { clueIds: ['archive'], updatedAt: '2026-11-18T12:00:00Z' };
  const clues = [
    { id: 'archive', foundAt: '2026-11-17T12:00:00Z' },
    { id: 'new', name: 'Путевой лист', foundAt: '2026-11-19T12:00:00Z' },
    { id: 'old', foundAt: '2026-11-17T12:00:00Z' },
    { id: 'unrelated', foundAt: '2026-11-19T12:00:00Z' }
  ];
  const catalog = { archive: { connections_to: ['new', 'old', 'hidden'] } };
  assert.deepEqual(findNewEvidenceLeads(hypothesis, clues, catalog), [{ id: 'new', name: 'Путевой лист' }]);
  assert.equal(findNewEvidenceLeads({ ...hypothesis, updatedAt: '2026-11-20T12:00:00Z' }, clues, catalog).length, 0);
});

test('unverified timestamps and absent supporting clues never reveal leads', () => {
  const clues = [{ id: 'new', foundAt: '2026-11-19T12:00:00Z', connections_to: ['secret'] }];
  assert.deepEqual(findNewEvidenceLeads({ clueIds: ['secret'], updatedAt: '2026-11-18T12:00:00Z' }, clues), []);
  assert.deepEqual(findNewEvidenceLeads({ clueIds: ['new'], updatedAt: 'unknown' }, clues), []);
});

test('revision comparison reports evidence, status and reasoning changes', () => {
  const first = createHypothesis({ id: 'h', title: 'Версия', reasoning: 'Первый вывод', clueIds: ['autopsy'] }, evidence, '2026-01-01');
  const second = reviseHypothesis(first, { reasoning: 'Новый вывод', status: 'probable', clueIds: ['letter'] }, evidence, '2026-01-02');
  assert.deepEqual(compareHypothesisRevisions(second.history), {
    added: ['letter'], removed: ['autopsy'], titleChanged: false, reasoningChanged: true,
    statusChanged: true, oldStatus: 'unchecked', newStatus: 'probable'
  });
  assert.equal(compareHypothesisRevisions(first.history), null);
  assert.equal(compareHypothesisRevisions([null, {}]), null);
});


test('a player cannot manually promote an unconfirmed hypothesis to confirmed', () => {
  const draft = createHypothesis({ id: 'h', title: 'Версия', reasoning: 'Проверяемое предположение', clueIds: ['autopsy'] }, evidence, '2026-11-21');
  assert.throws(
    () => reviseHypothesis(draft, { status: 'confirmed' }, evidence, '2026-11-21T01:00:00Z'),
    /Нельзя подтвердить версию вручную/
  );
  assert.equal(draft.status, 'unchecked');
  assert.equal(draft.history.length, 1);
});

test('legacy confirmed hypotheses remain readable and can be downgraded, not re-certified', () => {
  const legacy = createHypothesis({ id: 'legacy', title: 'Старая версия', reasoning: 'Старое сохранение' }, evidence, '2026-01-01');
  const imported = { ...legacy, status: 'confirmed', history: [...legacy.history, {
    at: '2026-01-02', type: 'revised', status: 'confirmed', clueIds: [], reasoning: legacy.reasoning, title: legacy.title
  }] };
  assert.throws(() => reviseHypothesis({ ...legacy, status: 'unchecked' }, { status: 'confirmed' }, evidence),
    /Нельзя подтвердить версию вручную/);
  const downgraded = reviseHypothesis(imported, { status: 'probable' }, evidence, '2026-01-03');
  assert.equal(downgraded.status, 'probable');
  assert.equal(downgraded.history.at(-1).status, 'probable');
});


test('legacy confirmed hypotheses cannot be edited while retaining confirmation', () => {
  const legacy = createHypothesis({ id: 'legacy-edit', title: 'Старая версия', reasoning: 'Старое обоснование', clueIds: ['autopsy'] }, evidence, '2026-01-01');
  const confirmed = { ...legacy, status: 'confirmed', history: [...legacy.history, {
    at: '2026-01-02', type: 'revised', status: 'confirmed', clueIds: ['autopsy'],
    reasoning: legacy.reasoning, title: legacy.title
  }] };

  assert.equal(reviseHypothesis(confirmed, {}, evidence), confirmed);
  assert.throws(
    () => reviseHypothesis(confirmed, { reasoning: 'Новое, ещё не проверенное обоснование' }, evidence),
    /Сначала измените статус подтверждённой версии/
  );
  assert.throws(
    () => reviseHypothesis(confirmed, { clueIds: [] }, evidence),
    /Сначала измените статус подтверждённой версии/
  );

  const downgraded = reviseHypothesis(confirmed, { status: 'probable' }, evidence, '2026-01-03');
  const revised = reviseHypothesis(downgraded, {
    reasoning: 'Новое обоснование после снятия подтверждения',
    clueIds: []
  }, evidence, '2026-01-04');
  assert.equal(revised.status, 'probable');
  assert.equal(revised.reasoning, 'Новое обоснование после снятия подтверждения');
  assert.deepEqual(revised.clueIds, []);
  assert.equal(revised.history.at(-1).status, 'probable');
});
