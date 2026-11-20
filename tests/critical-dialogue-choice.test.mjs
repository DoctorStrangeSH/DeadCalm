import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { claimCriticalDialogueChoice, findPendingCriticalDialogueNode } from '../src/js/systems/critical-dialogue-choice.js';

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
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'critical_choice_raid'), false);
  assert.equal(memory.writes.length, 0);
});

test('a critical choice can be claimed once and rejects stale or double-click callbacks', () => {
  const memory = createMemory({ 'npc_ray_morgan:critical_critical_choice_raid': true });
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'critical_choice_raid'), true);
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'critical_choice_raid'), false);
  assert.equal(memory.writes.length, 1);
  assert.equal(memory.hasFlag('npc_ray_morgan', 'critical_choice_resolved_critical_choice_raid'), true);
});

test('different critical prompts remain independently claimable', () => {
  const memory = createMemory({
    'npc_ray_morgan:critical_critical_choice_raid': true,
    'npc_lydia_winter:critical_critical_choice_trust': true
  });
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_ray_morgan', 'critical_choice_raid'), true);
  assert.equal(claimCriticalDialogueChoice(memory, 'npc_lydia_winter', 'critical_choice_trust'), true);
  assert.equal(memory.writes.length, 2);
});


test('an opened but unresolved critical prompt is restored after loading the dialogue again', () => {
  const memory = createMemory({
    'npc_ray_morgan:critical_critical_choice_raid': true,
    'npc_lydia_winter:critical_critical_choice_trust': true,
    'npc_lydia_winter:critical_choice_resolved_critical_choice_trust': true
  });
  const pending = findPendingCriticalDialogueNode({
    critical_choice_raid: { trigger_question: 'blackwood_power', choices: [{ id: 'go_with_ray' }] },
    critical_choice_trust: { trigger_question: 'her_background', choices: [{ id: 'promise_protection' }] }
  }, memory, 'npc_ray_morgan');

  assert.equal(pending?.id, 'critical_choice_raid');
  assert.equal(pending?.node.trigger_question, 'blackwood_power');
});

test('a resolved critical prompt is not restored after loading', () => {
  const memory = createMemory({
    'npc_ray_morgan:critical_critical_choice_raid': true,
    'npc_ray_morgan:critical_choice_resolved_critical_choice_raid': true
  });
  assert.equal(findPendingCriticalDialogueNode({
    critical_choice_raid: { trigger_question: 'blackwood_power', choices: [{ id: 'go_with_ray' }] }
  }, memory, 'npc_ray_morgan'), null);
});


test('the dialogue engine restores pending decisions and claims them by persisted node id', () => {
  const engine = readFileSync(new URL('../src/js/systems/dialogue.js', import.meta.url), 'utf8');
  assert.match(engine, /findPendingCriticalDialogueNode\(npcData, NPCMemory, npcId\)/);
  assert.match(engine, /claimCriticalDialogueChoice\(NPCMemory, this\._currentNPC, key\)/);
});

test('every authored NPC decision can be restored from its actual persisted prompt flag', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const npcIds = Object.keys(dialogues);
  for (const npcId of npcIds) {
    const npc = dialogues[npcId];
    const criticalNode = Object.entries(npc).find(([, node]) => node?.choices?.length && node.trigger_question);
    assert.ok(criticalNode, npcId + ' needs a critical decision');
    const [nodeId, node] = criticalNode;
    const memory = createMemory({ [npcId + ':critical_' + nodeId]: true });
    const pending = findPendingCriticalDialogueNode(npc, memory, npcId);
    assert.equal(pending?.id, nodeId);
    assert.equal(claimCriticalDialogueChoice(memory, npcId, nodeId), true);
    assert.equal(findPendingCriticalDialogueNode(npc, memory, npcId), null);
  }
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
