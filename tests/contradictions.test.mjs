import test from 'node:test';
import assert from 'node:assert/strict';
import { findContradictions } from '../src/js/systems/contradictions.js';
import { readFileSync } from 'node:fs';

const rules = [{ id: 'timeline_conflict', clueIds: ['a', 'b'],
  summary: 'Факты требуют сверки времени', followUp: 'Перепроверьте показания.' }];
const discovered = [{ id: 'a' }, { id: 'b' }];

test('contradiction is shown only when both authored facts were discovered and attached', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, rules), [{
    ...rules[0], clueIds: ['a', 'b']
  }]);
  assert.deepEqual(findContradictions({ clueIds: ['a'] }, discovered, rules), []);
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered.slice(0, 1), rules), []);
});

test('empty and malformed rules cannot manufacture contradictions or leak undiscovered content', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, []), []);
  const malformed = [{ id: 'broken', clueIds: ['a'], summary: 'Fake' },
    { id: 'missing', clueIds: ['a', 'secret'], summary: 'Spoiler' },
    { id: 'blank', clueIds: ['a', 'b'], summary: '' }];
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, malformed), []);
  assert.equal(findContradictions({ clueIds: ['a', 'b'] }, discovered, [rules[0], rules[0]]).length, 1);
});

test('authored contradiction references real clues and a discoverable dialogue reward', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const authored = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
  assert.equal(authored.length, 1);
  const rule = authored[0];
  for (const id of rule.clueIds) assert.ok(catalog[id], `${id} missing from clue catalog`);
  assert.equal(dialogues.npc_ray_morgan.topics.about_case.responses.find(r => r.id === 'initial_report').gives_clue, 'patrol_initial_report');
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, rule.clueIds.map(id => catalog[id]), authored).map(r => r.id), [rule.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [catalog.autopsy_report_01], authored), []);
});
