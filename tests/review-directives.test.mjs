import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planReviewDirective } from '../src/js/systems/review-directives.js';
import { READER_AUDIT_DOCUMENTS } from '../src/js/systems/investigation-quality.js';

test('directives require a review of the matching report', () => {
  const report = { version: 2, documentIds: [], contradictionIds: [] };
  assert.equal(planReviewDirective(null, report), null);
  assert.equal(planReviewDirective({ conclusionVersion: 2, status: 'Возвращено на уточнение' }, null), null);
  assert.equal(planReviewDirective({ conclusionVersion: 1, status: 'Возвращено на уточнение' }, report), null);
});

test('returned report produces targeted archive checks without fabricated evidence', () => {
  const report = { version: 1, documentIds: READER_AUDIT_DOCUMENTS.slice(1), contradictionIds: [] };
  const directive = planReviewDirective({ conclusionVersion: 1, status: 'Возвращено на уточнение' }, report);
  assert.equal(directive.kind, 'additional_check');
  assert.equal(directive.targetClueId, READER_AUDIT_DOCUMENTS[0]);
  assert.match(directive.text, /Поручение/);
  assert.equal('newClues' in directive, false);
});

test('full archive but missing contradiction receives hypothesis verification task', () => {
  const directive = planReviewDirective(
    { conclusionVersion: 3, status: 'Возвращено на уточнение' },
    { version: 3, documentIds: [...READER_AUDIT_DOCUMENTS], contradictionIds: [] }
  );
  assert.equal(directive.targetClueId, null);
  assert.match(directive.text, /доске гипотез/);
});

test('accepted provisional report points to existing diary, once per version', () => {
  const report = { version: 4, documentIds: [...READER_AUDIT_DOCUMENTS], contradictionIds: ['verified'] };
  const review = { conclusionVersion: 4, status: 'Принято как промежуточное' };
  const directive = planReviewDirective(review, report);
  assert.equal(directive.kind, 'next_lead');
  assert.equal(directive.targetClueId, 'judge_notes');
  assert.match(directive.text, /не доказательство/);
  assert.equal(planReviewDirective(review, report, [directive]), null);
});

test('court UI stores directives and service worker caches their module', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-review-directive"/);
  assert.match(scene, /id="reader-review-directions"/);
  assert.match(scene, /GameState\.setFlag\('court_reader_review_directives', \[\.\.\.assignments, directive\]\)/);
  assert.match(cache, /review-directives\.js/);
});
