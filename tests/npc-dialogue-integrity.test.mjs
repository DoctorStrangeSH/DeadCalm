import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

test('all six case NPCs have matching character profiles and a complete first meeting', () => {
  assert.deepEqual(Object.keys(dialogues).sort(), Object.keys(characters).sort());
  assert.equal(Object.keys(dialogues).length, 6);
  for (const [npcId, npc] of Object.entries(dialogues)) {
    assert.equal(typeof npc.first_meeting?.text, 'string', npcId + ' needs a first-meeting scene');
    assert.ok(npc.first_meeting.text.trim().length > 40, npcId + ' first meeting is too short');
    assert.ok(Array.isArray(npc.first_meeting.unlocks_topics), npcId + ' must unlock topics');
    assert.deepEqual([...npc.first_meeting.unlocks_topics].sort(), Object.keys(npc.topics || {}).sort(),
      npcId + ' first meeting must unlock every authored topic');
    assert.ok(Number.isFinite(characters[npcId].initial_trust), npcId + ' needs initial trust');
    assert.ok(characters[npcId].initial_trust >= 0 && characters[npcId].initial_trust <= 100,
      npcId + ' initial trust must be between 0 and 100');
  }
});

test('NPC dialogue response IDs are unique and every dependency resolves', () => {
  const responseIds = new Set();
  const allResponses = [];
  const contradictionIds = new Set(contradictions.map(rule => rule.id));
  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      assert.ok(Array.isArray(topic.responses) && topic.responses.length > 0, npcId + '/' + topicId);
      for (const response of topic.responses) {
        assert.ok(response.id, npcId + '/' + topicId + ' response needs an id');
        assert.ok(!responseIds.has(response.id), 'duplicate response id: ' + response.id);
        responseIds.add(response.id);
        allResponses.push(response);
        if (response.gives_clue) assert.ok(clues[response.gives_clue], response.id + ' gives missing clue ' + response.gives_clue);
        if (response.requires_clue) assert.ok(clues[response.requires_clue], response.id + ' requires missing clue ' + response.requires_clue);
        if (response.requires_contradiction) {
          assert.ok(contradictionIds.has(response.requires_contradiction), response.id + ' requires missing contradiction');
        }
        if (response.min_trust != null) {
          assert.ok(Number.isFinite(response.min_trust) && response.min_trust >= 0 && response.min_trust <= 100,
            response.id + ' has invalid trust threshold');
        }
      }
    }
  }
  for (const response of allResponses) {
    if (response.requires_question) {
      assert.ok(responseIds.has(response.requires_question), response.id + ' requires missing question ' + response.requires_question);
    }
  }
});

test('dialogue initializes each NPC with profile trust and never overwrites an existing save', () => {
  const previous = {
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    save: GameState.save,
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clues: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized
  };

  try {
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.save = () => {};
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    for (const [npcId, npc] of Object.entries(dialogues)) {
      DialogueEngine.startDialogue(npcId);
      assert.equal(NPCMemory.getTrust(npcId), characters[npcId].initial_trust, npcId + ' initial trust was ignored');
      NPCMemory.changeTrust(npcId, 5);
      DialogueEngine.startDialogue(npcId);
      assert.equal(NPCMemory.getTrust(npcId), Math.min(100, characters[npcId].initial_trust + 5),
        npcId + ' trust changed when reopening dialogue');
    }

    GameState.relationships.npc_ray_morgan = { trust: 73, met: true };
    DialogueEngine.startDialogue('npc_ray_morgan');
    assert.equal(NPCMemory.getTrust('npc_ray_morgan'), 73, 'existing save trust must be preserved');
  } finally {
    GameState.relationships = previous.relationships;
    GameState.npcMemory = previous.npcMemory;
    GameState.save = previous.save;
    DialogueEngine._dialogues = previous.dialogues;
    DialogueEngine._characters = previous.characters;
    DialogueEngine._clues = previous.clues;
    DialogueEngine._contradictionRules = previous.rules;
    DialogueEngine._initialized = previous.initialized;
  }
});
