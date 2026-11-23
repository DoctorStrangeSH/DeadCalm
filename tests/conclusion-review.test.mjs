import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewReaderConclusion } from '../src/js/systems/conclusion-review.js';
import { READER_AUDIT_DOCUMENTS } from '../src/js/systems/investigation-quality.js';

test('review does not accept invalid reports or duplicate submissions', () => {
  assert.equal(reviewReaderConclusion(null), null);
  assert.equal(reviewReaderConclusion({ status: 'Раскрыто' }), null);
  const report = { version: 1, status: 'Промежуточное заключение', documentIds: [], contradictionIds: [] };
  const currentCase = { clues: [{ id: 'reader_reconstructed_timeline' }], hypotheses: [] };
  const first = reviewReaderConclusion(report, [], '2026-11-19T10:00:00Z', currentCase, []);
  assert.equal(first.status, 'Возвращено на уточнение');
  assert.equal(reviewReaderConclusion(report, [first], undefined, currentCase, []), null);
  assert.equal(first.reviewedAt, '2026-11-19T10:00:00Z');
});

test('review feedback lists real evidence deficits, never invents a guilty party', () => {
  const report = { version: 2, status: 'Промежуточное заключение', documentIds: READER_AUDIT_DOCUMENTS.slice(0, 3), contradictionIds: [] };
  const currentCase = { clues: [{ id: 'reader_reconstructed_timeline' }, ...report.documentIds.map(id => ({ id }))], hypotheses: [] };
  const review = reviewReaderConclusion(report, [], undefined, currentCase, []);
  assert.equal(review.status, 'Возвращено на уточнение');
  assert.ok(review.comments.some(text => /5 архивных материалов/.test(text)));
  assert.ok(review.comments.some(text => /Ни одно расхождение/.test(text)));
  assert.match(review.finalVerdict, /не установлена/);
});

test('complete evidence permits only a provisional acceptance and new revision', () => {
  const complete = { version: 3, status: 'Промежуточное заключение', documentIds: [...READER_AUDIT_DOCUMENTS], contradictionIds: ['orlov_departure_vs_badge'] };
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
  const currentCase = {
    clues: [{ id: 'reader_reconstructed_timeline' }, ...READER_AUDIT_DOCUMENTS.map(id => clues[id]), clues.orlov_evening_statement],
    hypotheses: [{ clueIds: ['orlov_evening_statement', 'orlov_badge_scan'] }]
  };
  const review = reviewReaderConclusion(complete, [], undefined, currentCase, rules);
  assert.equal(review.status, 'Принято как промежуточное');
  assert.deepEqual(review.comments, ['Нельзя приписывать действия конкретному человеку без доказательства личности.']);
  const next = reviewReaderConclusion({ ...complete, version: 4 }, [review], undefined, currentCase, rules);
  assert.equal(next.status, 'Принято как промежуточное');
  assert.equal(reviewReaderConclusion(complete, [review, next], undefined, currentCase, rules), null);
});

test('submission UI shows historical feedback and stores at most one review per conclusion', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-conclusion-submit"/);
  assert.match(scene, /id="reader-conclusion-reviews"/);
  assert.match(scene, /reviews\.some\(item => item\.conclusionVersion === latest\?\.version\)/);
  assert.match(scene, /GameState\.setFlag\('court_reader_conclusion_reviews', \[\.\.\.reviews, result\]\)/);
  assert.match(cache, /conclusion-review\.js/);
});


test('review rejects forged document and contradiction IDs even when the report claims completeness', () => {
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
  const currentCase = {
    clues: [{ id: 'reader_reconstructed_timeline' }, ...READER_AUDIT_DOCUMENTS.map(id => clues[id])],
    hypotheses: []
  };
  const forged = {
    version: 5,
    status: 'Промежуточное заключение',
    documentIds: [...READER_AUDIT_DOCUMENTS, 'secret_unfound_document'],
    contradictionIds: ['invented_contradiction']
  };
  const review = reviewReaderConclusion(forged, [], undefined, currentCase, rules);
  assert.equal(review.status, 'Возвращено на уточнение');
  assert.ok(review.comments.some(text => /документы, которые не обнаружены/.test(text)));
  assert.ok(review.comments.some(text => /не подтверждённые/.test(text)));
  assert.match(review.finalVerdict, /не установлена/);
});

test('review fails closed when the live case or authored contradiction rules are unavailable', () => {
  const report = {
    version: 6,
    status: 'Промежуточное заключение',
    documentIds: [...READER_AUDIT_DOCUMENTS],
    contradictionIds: ['orlov_departure_vs_badge']
  };
  assert.equal(reviewReaderConclusion(report), null);
  assert.equal(reviewReaderConclusion(report, [], undefined, null, []), null);
  assert.equal(reviewReaderConclusion(report, [], undefined, { clues: [], hypotheses: [] }, null), null);
});
