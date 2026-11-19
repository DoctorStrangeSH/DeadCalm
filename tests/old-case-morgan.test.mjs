import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canApproachMorganAboutOldCase, resolveMorganOldCaseApproach, OLD_CASE_MORGAN_APPROACHES } from '../src/js/systems/old-case-morgan.js';

test('Morgan reaction requires a recorded, valid archival follow-up', () => {
  assert.equal(canApproachMorganAboutOldCase(null), false);
  assert.equal(canApproachMorganAboutOldCase({ sourceId: 'invented' }), false);
  assert.equal(resolveMorganOldCaseApproach('careful_request', null), null);
});

test('each approach produces distinct consequences without locking documents', () => {
  const followUp = { sourceId: 'old_case_custody_extract' };
  const careful = resolveMorganOldCaseApproach('careful_request', followUp);
  const accusation = resolveMorganOldCaseApproach('unsupported_accusation', followUp);
  assert.ok(careful.trustDelta > 0);
  assert.ok(accusation.trustDelta < 0);
  assert.notEqual(careful.flag, accusation.flag);
  assert.match(accusation.result, /не заблокированы/);
  assert.match(careful.result, /недостаточно/);
  assert.equal(resolveMorganOldCaseApproach('careful_request', followUp, careful), null);
  assert.equal(resolveMorganOldCaseApproach('fabricated', followUp), null);
});

test('specialist and custody sources both allow a conversation, once', () => {
  for (const sourceId of ['old_case_specialist_memo', 'old_case_custody_extract']) {
    assert.equal(canApproachMorganAboutOldCase({ sourceId }), true);
    for (const approach of OLD_CASE_MORGAN_APPROACHES) {
      const decision = resolveMorganOldCaseApproach(approach.id, { sourceId });
      assert.equal(decision.sourceId, sourceId);
      assert.equal(decision.flag, approach.flag);
    }
  }
});

test('UI records interaction and NPC memory rather than inventing an evidence reward', () => {
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(scene, /id="precinct-morgan-old-case"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_morgan_approach', decision\)/);
  assert.match(scene, /NPCMemory\.setFlag\('npc_ray_morgan', decision\.flag\)/);
  assert.match(scene, /NPCMemory\.changeTrust\('npc_ray_morgan', decision\.trustDelta\)/);
  assert.match(cache, /old-case-morgan\.js/);
});
