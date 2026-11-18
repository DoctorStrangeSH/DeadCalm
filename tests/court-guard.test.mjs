import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canChallengeGuard, resolveGuardChallenge } from '../src/js/systems/court-guard.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));

test('guard follow-up is unlocked by a saved, evidence-backed deduction only', () => {
  const both = [clues.guard_key_testimony, clues.spare_key_inventory];
  const hypothesis = { clueIds: ['guard_key_testimony', 'spare_key_inventory'] };
  assert.equal(canChallengeGuard({ clues: both, hypotheses: [] }, rules), false);
  assert.equal(canChallengeGuard({ clues: both, hypotheses: [{ clueIds: ['guard_key_testimony'] }] }, rules), false);
  assert.equal(canChallengeGuard({ clues: both.slice(0, 1), hypotheses: [hypothesis] }, rules), false);
  assert.equal(canChallengeGuard({ clues: both, hypotheses: [hypothesis] }, rules), true);
  assert.equal(canChallengeGuard({ clues: both, hypotheses: [hypothesis] }, []), false);
});

test('both interview tones retain the route to the shift sheet while changing trust', () => {
  const patient = resolveGuardChallenge('patient');
  const pressure = resolveGuardChallenge('pressure');
  assert.ok(patient.trustDelta > 0);
  assert.ok(pressure.trustDelta < 0);
  assert.match(patient.text, /маршрутн/);
  assert.match(pressure.text, /маршрутн/);
  assert.equal(resolveGuardChallenge('unknown'), null);
  assert.ok(clues.guard_round_sheet.connections_to.includes('court_phone_register_copy'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /canChallengeGuard\(GameState\.currentCase, rules\)/);
  assert.match(scene, /GameState\.addClue\(catalog\.guard_round_sheet\)/);
  assert.match(scene, /GameState\.setFlag\('court_guard_interview_tone', tone\)/);
  assert.match(scene, /GameState\.updateRelationship\('npc_viktor_bell', choice\.trustDelta\)/);
});
