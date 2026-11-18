import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessIndependentAccounts, canTraceSecretary } from '../src/js/systems/witness-provenance.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));

test('secretary source check requires a real saved contradiction', () => {
  const hypothesis = { clueIds: ['court_visitor_log', 'secretary_access_testimony'] };
  const both = [clues.court_visitor_log, clues.secretary_access_testimony];
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [] }, rules), false);
  assert.equal(canTraceSecretary({ clues: both.slice(0, 1), hypotheses: [hypothesis] }, rules), false);
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [hypothesis] }, []), false);
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [hypothesis] }, rules), true);
});

test('dependent accounts sharing one source cannot be counted as corroboration', () => {
  assert.deepEqual(assessIndependentAccounts([
    { id: 'bell', origin: 'bell' },
    { id: 'savelyeva', origin: 'bell' },
    { id: 'pass', origin: 'court-register' }
  ]), { independentSources: 2, dependentAccounts: ['savelyeva'] });
  assert.deepEqual(assessIndependentAccounts([{}, { id: 'unknown' }]),
    { independentSources: 0, dependentAccounts: [] });
  assert.match(clues.secretary_source_statement.description, /Орлов|Белл/);
  assert.match(clues.pass_041_counterfoil.description, /№ 041/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /canTraceSecretary\(GameState\.currentCase, rules\)/);
  assert.match(scene, /GameState\.addClue\(catalog\[clueId\]\)/);
});
