import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareReaderTheories, READER_THEORIES, snapshotReaderTheory, evaluateTheoryChanges, resolveTheoryApproach, resolveWitnessRecall, getReaderEvidenceRoute } from '../src/js/systems/reader-theories.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));

test('competing scenarios stay locked before the reconstructed chronology', () => {
  assert.deepEqual(compareReaderTheories(() => false), []);
  assert.deepEqual(compareReaderTheories(id => id !== 'reader_reconstructed_timeline'), []);
});

test('three scenarios measure available documents and keep conclusions unproven', () => {
  assert.equal(READER_THEORIES.length, 3);
  const baseline = compareReaderTheories(id => id === 'reader_reconstructed_timeline');
  assert.equal(baseline.length, 3);
  for (const theory of baseline) {
    assert.equal(theory.status, 'Не доказано');
    assert.deepEqual(theory.observed, []);
    assert.equal(theory.unavailable.length, theory.observations.length);
    for (const id of [...theory.observations, ...theory.checks]) assert.ok(clues[id], id);
    assert.ok(theory.question.length > 30);
  }
  const discovered = new Set(['reader_reconstructed_timeline', 'orlov_badge_scan', 'reader_test_diagnostic']);
  const updated = compareReaderTheories(id => discovered.has(id));
  assert.deepEqual(updated[0].observed, ['orlov_badge_scan']);
  assert.deepEqual(updated[0].verifiedChecks, ['reader_test_diagnostic']);
  assert.deepEqual(updated[0].pendingChecks, ['key_signature_comparison', 'reader_archive_crosscheck']);
  assert.equal(updated[0].status, 'Не доказано');
  assert.equal(updated[2].status, 'Не доказано');
});

test('alternative-version panel is revealed with chronology and updates after evidence checks', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theories-view"[^>]*GameState\.hasClue\('reader_reconstructed_timeline'\)/);
  assert.match(scene, /function refreshReaderTheories\(\)/);
  assert.match(scene, /compareReaderTheories\(id => GameState\.hasClue\(id\)\)/);
  assert.match(scene, /container\.querySelector\('#reader-theories-view'\)\.hidden = false/);
  assert.match(scene, /refreshCourtWorkflow\(\);\s*refreshReaderTheories\(\)/);
  assert.match(scene, /setAttribute\('aria-pressed'/);
  assert.match(css, /\.reader-theories-option:focus-visible/);
  assert.match(css, /\.reader-theories-options \{ grid-template-columns:1fr/);
  assert.match(cache, /reader-theories\.js/);
});

test('saved versions are immutable snapshots and new evidence is explicitly detectable', () => {
  const known = new Set(['reader_reconstructed_timeline', 'orlov_badge_scan']);
  const initial = compareReaderTheories(id => known.has(id))[0];
  const first = snapshotReaderTheory(initial, [], '2026-11-19T10:00:00Z');
  assert.equal(first.version, 1);
  assert.equal(first.status, 'Не доказано');
  assert.equal(evaluateTheoryChanges(first, initial).changed, false);
  known.add('reader_test_diagnostic');
  known.add('maintenance_tool_issue_ledger');
  const revised = compareReaderTheories(id => known.has(id))[0];
  const delta = evaluateTheoryChanges(first, revised);
  assert.deepEqual(delta.newChecks, ['reader_test_diagnostic']);
  assert.deepEqual(delta.newDocuments, ['maintenance_tool_issue_ledger']);
  assert.equal(delta.changed, true);
  const second = snapshotReaderTheory(revised, [first], '2026-11-19T11:00:00Z');
  assert.equal(second.version, 2);
  assert.deepEqual(first.verifiedChecks, []);
  assert.deepEqual(second.verifiedChecks, ['reader_test_diagnostic']);
  assert.equal(evaluateTheoryChanges(second, revised).changed, false);
  assert.equal(evaluateTheoryChanges(first, compareReaderTheories(id => known.has(id))[1]), null);
  assert.equal(snapshotReaderTheory({ id: 'unknown' }), null);
});

test('investigative journal persists theory choice but disallows duplicate unchanged snapshots', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theory-record"/);
  assert.match(scene, /id="reader-theory-history"/);
  assert.match(scene, /GameState\.setFlag\('court_reader_theory_history', \[\.\.\.history, snapshot\]\)/);
  assert.match(scene, /latest\?\.theoryId === current\.id && !evaluateTheoryChanges\(latest, current\)\?\.changed/);
  assert.match(scene, /ПЕРЕСМОТРЕТЬ ВЕРСИЮ С НОВЫМИ ДАННЫМИ/);
});

test('discreet questions and unfounded accusations carry bounded trust consequences', () => {
  const one = { theoryId: 'single_operator', verifiedChecks: [] };
  const prepared = { theoryId: 'single_operator', verifiedChecks: ['key_signature_comparison'] };
  assert.equal(resolveTheoryApproach(one, 'discreet').trustDelta, 2);
  assert.equal(resolveTheoryApproach(one, 'accusation').trustDelta, -8);
  assert.equal(resolveTheoryApproach(prepared, 'accusation').trustDelta, -4);
  assert.equal(resolveTheoryApproach(one, 'accusation').npcId, 'npc_nikolay_klimov');
  assert.equal(resolveTheoryApproach({ theoryId: 'borrowed_badge', verifiedChecks: [] }, 'accusation').npcId, 'npc_pavel_orlov');
  assert.match(resolveTheoryApproach(one, 'accusation').response, /не подтверждают личность/);
  assert.equal(resolveTheoryApproach(one, 'unknown'), null);
  assert.equal(resolveTheoryApproach({ theoryId: 'unknown' }, 'discreet'), null);
  assert.equal(resolveTheoryApproach(null, 'discreet'), null);
});

test('one-time consequence is saved and trust is updated only in the action handler', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theory-approaches"/);
  assert.match(scene, /function handleTheoryApproach\(approach\)/);
  assert.match(scene, /GameState\.flags\.court_reader_theory_consequence\) return/);
  assert.match(scene, /GameState\.setFlag\('court_reader_theory_consequence', outcome\)/);
  assert.match(scene, /GameState\.updateRelationship\(outcome\.npcId, outcome\.trustDelta\)/);
  assert.match(css, /\.reader-theory-approaches\[hidden\] \{ display:none; \}/);
});

test('witness remembers accusations, but official evidence route remains available', () => {
  const accusation = resolveTheoryApproach({ theoryId: 'borrowed_badge', verifiedChecks: [] }, 'accusation');
  const apology = resolveWitnessRecall(accusation, 'conversation');
  assert.equal(apology.trustDelta, 1);
  assert.equal(apology.memoryFlag, 'reader_theory_apology');
  assert.match(apology.text, /помнит ваше необоснованное обвинение/);
  assert.match(apology.text, /отказывается от новых устных показаний/);
  const official = resolveWitnessRecall(accusation, 'formal');
  assert.equal(official.trustDelta, 0);
  assert.equal(official.memoryFlag, 'reader_theory_formal_request');
  assert.match(official.text, /документы остаются доступны/);
  const friendly = resolveWitnessRecall(resolveTheoryApproach({ theoryId: 'single_operator', verifiedChecks: [] }, 'discreet'), 'conversation');
  assert.equal(friendly.trustDelta, 2);
  assert.equal(friendly.memoryFlag, 'reader_theory_cooperation');
  assert.equal(resolveWitnessRecall(accusation, 'nonsense'), null);
  assert.equal(resolveWitnessRecall(null, 'conversation'), null);
});

test('repeat interview writes persistent NPC memory once and never gates archive access', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theory-revisit"/);
  assert.match(scene, /function revisitTheoryWitness\(route\)/);
  assert.match(scene, /GameState\.flags\.court_reader_theory_revisit\) return/);
  assert.match(scene, /NPCMemory\.setFlag\(consequence\.npcId, result\.memoryFlag\)/);
  assert.match(scene, /GameState\.setFlag\('court_reader_theory_revisit', result\)/);
  assert.match(scene, /if \(result\.trustDelta\) GameState\.updateRelationship/);
  assert.match(cache, /npc-memory\.js/);
});

test('cooperative and formal access grant one identical, non-identifying archive record', () => {
  const friendly = resolveTheoryApproach({ theoryId: 'borrowed_badge', verifiedChecks: [] }, 'discreet');
  const pressured = resolveTheoryApproach({ theoryId: 'borrowed_badge', verifiedChecks: [] }, 'accusation');
  assert.equal(getReaderEvidenceRoute(friendly, resolveWitnessRecall(friendly, 'conversation')).id, 'cooperation');
  assert.equal(getReaderEvidenceRoute(pressured, resolveWitnessRecall(pressured, 'conversation')).id, 'formal');
  assert.equal(getReaderEvidenceRoute(friendly, resolveWitnessRecall(friendly, 'formal')).id, 'formal');
  assert.equal(getReaderEvidenceRoute(null, resolveWitnessRecall(friendly, 'conversation')), null);
  assert.equal(getReaderEvidenceRoute(friendly, null), null);
  assert.match(clues.reader_archive_crosscheck.description, /не личность техника/);
  assert.ok(clues.reader_archive_crosscheck.connections_to.includes('reader_reconstructed_timeline'));
  for (const theory of READER_THEORIES) assert.ok(theory.checks.includes('reader_archive_crosscheck'));
});

test('follow-up action is gated by previous choices and saved chronology', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-theory-evidence"/);
  assert.match(scene, /getReaderEvidenceRoute\(consequence, revisit\)/);
  assert.match(scene, /GameState\.hasClue\('reader_archive_crosscheck'\)/);
  assert.match(scene, /inspectCourtRecord\('reader-theory-evidence', 'reader_archive_crosscheck', narrative, 'reader_reconstructed_timeline'\)/);
  assert.match(scene, /refreshReaderTheories\(\)/);
});
