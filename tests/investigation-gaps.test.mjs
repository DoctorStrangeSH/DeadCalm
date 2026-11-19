import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInvestigationGaps, buildInvestigationAssignmentJournal, getInvestigationGapStatus, updateInvestigationGapStatus } from '../src/js/systems/investigation-gaps.js';
const timeline = { id: 'reader_reconstructed_timeline', category: 'document', source: 'Архив' };
test('report stays locked before the timeline is found', () => assert.deepEqual(buildInvestigationGaps({ clues: [], hypotheses: [{ id: 'h', clueIds: [] }] }), []));
test('reports unknown and shared origins without counting them as independent', () => { const gaps = buildInvestigationGaps({ clues: [timeline, { id: 'a', source: 'Архив' }, { id: 'b', source: 'архив' }, { id: 'c' }], hypotheses: [{ id: 'h', title: 'Версия', clueIds: ['a', 'b', 'c'] }] }); assert.ok(gaps.some(x => /происхождение части/.test(x.title))); assert.ok(gaps.some(x => /общий источник/.test(x.title))); assert.ok(gaps.some(x => /независимых источников/.test(x.title))); });
test('missing clue names are never exposed', () => { const gaps = buildInvestigationGaps({ clues: [timeline], hypotheses: [{ id: 'h', title: 'Пустая', clueIds: ['secret-id'] }] }); assert.ok(gaps.some(x => /без опорных/.test(x.title))); assert.ok(gaps.some(x => /недоступные ссылки/.test(x.title))); assert.equal(JSON.stringify(gaps).includes('secret-id'), false); });
test('only discovered testimony creates witness and open-question gaps', () => { const gaps = buildInvestigationGaps({ clues: [timeline, { id: 'w', name: 'Показания', category: 'testimony', description: 'Его присутствие пока подтверждено только собственными словами. Запись не позволяет установить личность.' }], hypotheses: [] }); assert.ok(gaps.some(x => /без независимого подтверждения/.test(x.title))); assert.ok(gaps.some(x => /Открытый вопрос/.test(x.title))); });
test('report does not mutate case data or claim that absence proves non-occurrence', () => { const data = { clues: [timeline, { id: 'w', source: 'Свидетель' }], hypotheses: [{ id: 'h', title: 'Версия', clueIds: ['w'] }] }; const before = structuredClone(data); const gaps = buildInvestigationGaps(data); assert.deepEqual(data, before); assert.ok(gaps.every(x => !/доказано отсутствие|виновность/.test(x.detail))); });
test('investigation tasks retain a valid plan across visits and reset without altering evidence', () => {
  const data = { clues: [timeline], hypotheses: [{ id: 'h', title: 'Версия', clueIds: [] }] };
  const original = structuredClone(data);
  const gaps = buildInvestigationGaps(data);
  const id = gaps[0].id;
  const active = updateInvestigationGapStatus(gaps, undefined, id, 'active');
  assert.equal(getInvestigationGapStatus(active, id), 'active');
  const deferred = updateInvestigationGapStatus(gaps, active, id, 'deferred');
  assert.equal(getInvestigationGapStatus(deferred, id), 'deferred');
  assert.equal(getInvestigationGapStatus(active, id), 'active');
  assert.deepEqual(updateInvestigationGapStatus(gaps, deferred, id, 'pending'), {});
  assert.deepEqual(data, original);
});
test('invalid and no-longer-visible gaps cannot be marked as checked', () => {
  const gaps = buildInvestigationGaps({ clues: [timeline], hypotheses: [{ id: 'h', clueIds: [] }] });
  const saved = { [gaps[0].id]: 'active' };
  assert.equal(updateInvestigationGapStatus(gaps, saved, 'unseen:secret', 'active'), null);
  assert.equal(updateInvestigationGapStatus(gaps, saved, gaps[0].id, 'verified'), null);
  assert.equal(getInvestigationGapStatus({ [gaps[0].id]: 'verified' }, gaps[0].id), 'pending');
  assert.deepEqual(saved, { [gaps[0].id]: 'active' });
});

test('assignment journal includes only current active and deferred gaps', () => {
  const gaps = [{ id: 'active-now', title: 'Проверить источник', detail: 'Архив' }, { id: 'deferred-now', title: 'Сверить показания', detail: 'Свидетель' }, { id: 'pending-now', title: 'Новая проверка', detail: 'Нет статуса' }];
  const saved = { 'active-now': 'active', 'deferred-now': 'deferred', 'resolved-earlier': 'active' };
  const journal = buildInvestigationAssignmentJournal(gaps, saved);
  assert.deepEqual(journal.map(item => item.id), ['active-now', 'deferred-now']);
  assert.equal(journal[0].statusLabel, 'В работе');
  assert.equal(journal[1].statusLabel, 'Отложено');
  assert.equal(journal.some(item => item.id === 'resolved-earlier'), false);
});

test('assignment journal is derived and does not mutate saved statuses or gap records', () => {
  const gaps = [{ id: 'task', title: 'Проверка', detail: 'Описание' }];
  const saved = { task: 'active' };
  const gapsBefore = structuredClone(gaps);
  const savedBefore = structuredClone(saved);
  const journal = buildInvestigationAssignmentJournal(gaps, saved);
  journal[0].title = 'Изменённая копия';
  assert.deepEqual(gaps, gapsBefore);
  assert.deepEqual(saved, savedBefore);
});

test('assignment journal excludes invalid, pending and resolved statuses', () => {
  const gaps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const journal = buildInvestigationAssignmentJournal(gaps, { a: 'pending', b: 'verified', c: 'deferred' });
  assert.deepEqual(journal.map(item => item.id), ['c']);
});
