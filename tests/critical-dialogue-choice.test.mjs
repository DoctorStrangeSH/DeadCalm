import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { claimCriticalDialogueChoice } from '../src/js/systems/critical-dialogue-choice.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

function createMemory(initialFlags = {}) {
  const flags = { ...initialFlags };
  const writes = [];
  return {
    flags,
    writes,
    hasFlag(npcId, flag) { return Boolean(flags[npcId + ':' + flag]); },
    setFlag(npcId, flag) {
      flags[npcId + ':' + flag] = true;
      writes.push({ npcId, flag });
    }
  };
}

test('a critical choice cannot be claimed before its prompt is opened', () => {
  const memory = createMemory();
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'blackwood_power'), false);
  assert.equal(memory.writes.length, 0);
});

test('a critical choice can be claimed once and rejects stale or double-click callbacks', () => {
  const memory = createMemory({ 'npc_ray_morgan:critical_blackwood_power': true });
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'blackwood_power'), true);
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'blackwood_power'), false);
  assert.equal(memory.writes.length, 1);
  assert.equal(memory.hasFlag('npc_ray_morgan', 'critical_choice_resolved_blackwood_power'), true);
});

test('different critical prompts remain independently claimable', () => {
  const memory = createMemory({
    'npc_ray_morgan:critical_blackwood_power': true,
    'npc_lydia_winter:critical_her_background': true
  });
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'blackwood_power'), true);
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_lydia_winter', 'her_background'), true);
  assert.equal(memory.writes.length, 2);
});

test('all six authored critical decisions are tied to an actual one-time question trigger', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const expectedNpcCount = 6;
  let decisionCount = 0;

  for (const [npcId, npc] of Object.entries(dialogues)) {
    const responses = Object.values(npc.topics || {}).flatMap(topic => topic.responses || []);
    for (const [nodeId, node] of Object.entries(npc)) {
      if (!node?.choices) continue;
      decisionCount++;
      assert.ok(node.trigger_question, npcId + '.' + nodeId + ' needs a trigger question');
      const trigger = responses.find(response => response.id === node.trigger_question);
      assert.equal(trigger?.triggers_critical, nodeId, npcId + '.' + nodeId + ' must be opened by its declared question');
      assert.ok(node.choices.length >= 2, npcId + '.' + nodeId + ' needs meaningful alternatives');
      for (const choice of node.choices) {
        assert.ok(npc[choice.next_dialogue]?.text, npcId + '.' + choice.id + ' needs a valid result node');
      }
    }
  }

  assert.equal(decisionCount, expectedNpcCount);
});
