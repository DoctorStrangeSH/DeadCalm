import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewReaderConclusion } from '../src/js/systems/conclusion-review.js';
import { READER_AUDIT_DOCUMENTS } from '../src/js/systems/investigation-quality.js';

test('review does not accept invalid reports or duplicate submissions', () => {
  assert.equal(reviewReaderConclusion(null), null);
  assert.equal(reviewReaderConclusion({ status: 'Раскрыто' }), null);
  const report = { version: 1, status: 'Промежуточное заключение', documentIds: [], contradictionIds: [] };
  const first = reviewReaderConclusion(report, [], '2026-11-19T10:00:00Z');
  assert.equal(first.status, 'Возвращено на уточнение');
  assert.equal(reviewReaderConclusion(report, [first]), null);
  assert.equal(first.reviewedAt, '2026-11-19T10:00:00Z');
});

test('review feedback lists real evidence deficits, never invents a guilty party', () => {
  const report = { version: 2, status: 'Промежуточное заключение', documentIds: READER_AUDIT_DOCUMENTS.slice(0, 3), contradictionIds: [] };
  const review = reviewReaderConclusion(report);
  assert.equal(review.status, 'Возвращено на уточнение');
  assert.ok(review.comments.some(text => /5 архивных материалов/.test(text)));
  assert.ok(review.comments.some(text => /Ни одно расхождение/.test(text)));
  assert.match(review.finalVerdict, /не установлена/);
});

test('complete evidence permits only a provisional acceptance and new revision', () => {
  const complete = { version: 3, status: 'Промежуточное заключение', documentIds: [...READER_AUDIT_DOCUMENTS], contradictionIds: ['orlov_departure_vs_badge'] };
  const review = reviewReaderConclusion(complete);
  assert.equal(review.status, 'Принято как промежуточное');
  assert.deepEqual(review.comments, ['Нельзя приписывать действия конкретному человеку без доказательства личности.']);
  const next = reviewReaderConclusion({ ...complete, version: 4 }, [review]);
  assert.equal(next.status, 'Принято как промежуточное');
  assert.equal(reviewReaderConclusion(complete, [review, next]), null);
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
