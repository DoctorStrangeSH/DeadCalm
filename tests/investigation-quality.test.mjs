import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessReaderInvestigation, READER_AUDIT_DOCUMENTS } from '../src/js/systems/investigation-quality.js';

const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
const makeCase = (ids, hypotheses = []) => ({ clues: ids.map(id => catalog[id]), hypotheses });

test('quality audit stays locked before assembled chronology and does not spoil hidden clues', () => {
  assert.equal(assessReaderInvestigation(makeCase(['orlov_badge_scan']), rules), null);
  assert.equal(READER_AUDIT_DOCUMENTS.length, 8);
  for (const id of READER_AUDIT_DOCUMENTS) assert.ok(catalog[id], id);
  const audit = assessReaderInvestigation(makeCase(['reader_reconstructed_timeline']), rules);
  assert.equal(audit.found.length, 0);
  assert.equal(audit.remaining.length, 8);
  assert.deepEqual(audit.verifiedContradictions, []);
  assert.ok(audit.nextSteps.some(step => /оставшиеся документы/.test(step)));
  assert.match(audit.verdict, /не установлена/);
});

test('only evidence-backed attached hypotheses increase verified contradiction count', () => {
  const ids = ['reader_reconstructed_timeline', 'orlov_evening_statement', 'orlov_badge_scan', 'maintenance_tool_issue_ledger'];
  const unaffiliated = assessReaderInvestigation(makeCase(ids), rules);
  assert.equal(unaffiliated.verifiedContradictions.length, 0);
  const unrelated = assessReaderInvestigation(makeCase(ids, [{ clueIds: ['orlov_evening_statement'] }]), rules);
  assert.equal(unrelated.verifiedContradictions.length, 0);
  const hypothesis = { clueIds: ['orlov_evening_statement', 'orlov_badge_scan'] };
  const verified = assessReaderInvestigation(makeCase(ids, [hypothesis, hypothesis]), rules);
  assert.deepEqual(verified.verifiedContradictions.map(item => item.id), ['orlov_departure_vs_badge']);
  assert.equal(verified.found.length, 2);
  assert.equal(verified.remaining.length, 6);
  assert.equal(verified.verdict, unaffiliated.verdict);
});

test('tact and pressure change qualitative feedback, not evidence or guilt', () => {
  const current = makeCase(['reader_reconstructed_timeline', 'reader_archive_crosscheck']);
  const tact = assessReaderInvestigation(current, rules, { court_reader_theory_consequence: { approach: 'discreet' } });
  const pressure = assessReaderInvestigation(current, rules, { court_reader_theory_consequence: { approach: 'accusation' } });
  assert.match(tact.conduct, /без публичного обвинения/);
  assert.match(pressure.conduct, /преждевременным обвинением/);
  assert.deepEqual(tact.found, pressure.found);
  assert.equal(tact.verdict, pressure.verdict);
});

test('audit UI is unlocked with chronology and cached for repeat visits', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-quality-view"[^>]*GameState\.hasClue\('reader_reconstructed_timeline'\)/);
  assert.match(scene, /assessReaderInvestigation\(GameState\.currentCase, qualityRules, GameState\.flags\)/);
  assert.match(scene, /qualityRules = rules;\s*refreshReaderQuality\(\)/);
  assert.match(scene, /container\.querySelector\('#reader-quality-view'\)\.hidden = false/);
  assert.match(cache, /investigation-quality\.js/);
});
