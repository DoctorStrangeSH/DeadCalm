import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReaderEpisodeConclusion, hasNewConclusionEvidence } from '../src/js/systems/episode-conclusion.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
const makeCase = (ids, hypotheses = []) => ({ clues: ids.map(id => clues[id]), hypotheses });

test('intermediate conclusion cannot be recorded without a chronology', () => {
  const draft = buildReaderEpisodeConclusion(makeCase(['orlov_badge_scan']), rules);
  assert.equal(draft, null);
  assert.equal(hasNewConclusionEvidence(null, draft), false);
});

test('conclusion snapshots prove sequence, not an unverified participant', () => {
  const first = buildReaderEpisodeConclusion(makeCase(['reader_reconstructed_timeline']), rules, {}, [], '2026-11-19T10:00:00Z');
  assert.equal(first.version, 1);
  assert.equal(first.status, 'Промежуточное заключение');
  assert.match(first.established[0], /19:58 до 20:58/);
  assert.match(first.verdict, /не установлена/);
  assert.deepEqual(first.contradictionIds, []);
  assert.equal(hasNewConclusionEvidence(null, first), true);
  assert.equal(hasNewConclusionEvidence(first, first), false);
  const second = buildReaderEpisodeConclusion(makeCase(['reader_reconstructed_timeline', 'reader_test_diagnostic']), rules, {}, [first], '2026-11-19T11:00:00Z');
  assert.equal(second.version, 2);
  assert.deepEqual(first.documentIds, []);
  assert.deepEqual(second.documentIds, ['reader_test_diagnostic']);
  assert.equal(hasNewConclusionEvidence(first, second), true);
});

test('only a discovered and attached contradiction can revise the conclusion', () => {
  const facts = ['reader_reconstructed_timeline', 'orlov_evening_statement', 'orlov_badge_scan'];
  const before = buildReaderEpisodeConclusion(makeCase(facts), rules);
  const hypothesis = { clueIds: ['orlov_evening_statement', 'orlov_badge_scan'] };
  const after = buildReaderEpisodeConclusion(makeCase(facts, [hypothesis]), rules, {}, [before]);
  assert.deepEqual(after.contradictionIds, ['orlov_departure_vs_badge']);
  assert.equal(hasNewConclusionEvidence(before, after), true);
  assert.deepEqual(before.contradictionIds, []);
  assert.match(after.established[1], /не доказательство личного присутствия/);
});

test('conclusion history is persistent and cannot duplicate unchanged reports', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-conclusion-save"/);
  assert.match(scene, /id="reader-conclusion-history"/);
  assert.match(scene, /hasNewConclusionEvidence\(history\.at\(-1\), draft\)/);
  assert.match(scene, /GameState\.setFlag\('court_reader_conclusions', \[\.\.\.history, draft\]\)/);
  assert.match(cache, /episode-conclusion\.js/);
});
