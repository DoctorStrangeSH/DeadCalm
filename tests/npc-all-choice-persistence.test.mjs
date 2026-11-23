import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';
import { Events } from '../src/js/core/events.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

const scenarios = Object.entries(dialogues).flatMap(([npcId, npc]) =>
  Object.entries(npc).filter(([, node]) => Array.isArray(node.choices) && node.trigger_question)
    .flatMap(([nodeId, node]) => {
      const topic = Object.entries(npc.topics || {}).find(([, value]) =>
        value.responses.some(response => response.id === node.trigger_question)
      );
      assert.ok(topic, npcId + '/' + nodeId + ' trigger question must belong to a topic');
      return node.choices.map(choice => ({
        npcId, nodeId, questionId: node.trigger_question, topicId: topic[0], choice, node
      }));
    })
);

test('every authored critical NPC choice survives export/import and remains one-time in a fresh dialogue session', () => {
  assert.equal(Object.keys(dialogues).length, 6);
  assert.equal(scenarios.length, 14, 'the audit expects all 14 authored NPC choice branches');

  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked', 'save'
  ];
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousStorageSave = Storage.save;
  let choiceSaveCount = 0;
  const emittedFlags = [];
  const emittedTrust = [];
  const offFlag = Events.on('npc:flag_set', event => emittedFlags.push(event));
  const offTrust = Events.on('relationship:changed', event => emittedTrust.push(event));
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_askedQuestions', '_unlockedTopics'
  ];
  const previousDialogue = Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]));

  try {
    Storage.save = () => { choiceSaveCount++; return true; };
    GameState.saveBlocked = false;
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    for (const scenario of scenarios) {
      GameState.player = { name: 'Джон Риверс', reputation: 50 };
      GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
      GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
      GameState.flags = {};
      GameState.relationships = {};
      GameState.npcMemory = {};
      GameState.socialGraph = { ties: [], events: [] };
      GameState.knowledgeLedger = { entries: [] };
      GameState.npcDailyLife = { schedules: [], occurrences: [] };
      GameState.miniGameProgress = {};
      GameState.notebook = [];
      GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };

      DialogueEngine.reset();
      DialogueEngine.startDialogue(scenario.npcId);
      DialogueEngine.startDialogue(scenario.npcId);
      const prompt = DialogueEngine.askQuestion(scenario.questionId);
      assert.equal(prompt?.type, 'critical_choice', scenario.npcId + '/' + scenario.choice.id);

      choiceSaveCount = 0;
      const flagEventStart = emittedFlags.length;
      const trustEventStart = emittedTrust.length;
      const result = DialogueEngine.makeCriticalChoice(scenario.choice.id);
      assert.equal(choiceSaveCount, 1, scenario.npcId + '/' + scenario.choice.id + ' must persist the complete decision once');
      assert.equal(result?.type, 'critical_result', scenario.npcId + '/' + scenario.choice.id);

      const expectedTrust = Math.max(0, Math.min(100,
        characters[scenario.npcId].initial_trust + (scenario.choice.effects?.trust || 0)
      ));
      assert.equal(NPCMemory.getTrust(scenario.npcId), expectedTrust);
      assert.equal(emittedTrust.length - trustEventStart, 1,
        scenario.npcId + '/' + scenario.choice.id + ' must emit one trust-change event');
      assert.equal(emittedTrust.at(-1).delta, expectedTrust - characters[scenario.npcId].initial_trust);
      const choiceFlags = emittedFlags.slice(flagEventStart).filter(event => event.npcId === scenario.npcId).map(event => event.flag);
      assert.equal(new Set(choiceFlags).size, choiceFlags.length,
        scenario.npcId + '/' + scenario.choice.id + ' must not emit duplicate flag events');
      assert.ok(choiceFlags.includes('critical_' + scenario.nodeId));
      if (scenario.choice.memory_set) assert.ok(choiceFlags.includes(scenario.choice.memory_set));
      if (scenario.node.memory_set) assert.ok(choiceFlags.includes(scenario.node.memory_set));
      if (scenario.choice.memory_set) {
        assert.equal(NPCMemory.hasFlag(scenario.npcId, scenario.choice.memory_set), true);
      }
      if (scenario.node.memory_set) {
        assert.equal(NPCMemory.hasFlag(scenario.npcId, scenario.node.memory_set), true);
      }
      const guardFlag = 'critical_' + scenario.nodeId;
      assert.equal(NPCMemory.hasFlag(scenario.npcId, guardFlag), true);
      assert.ok(NPCMemory.getAskedQuestions(scenario.npcId).includes(scenario.questionId));

      const snapshot = GameState.export();
      GameState.relationships = {};
      GameState.npcMemory = {};
      assert.equal(GameState.importSave(snapshot), true, scenario.npcId + '/' + scenario.choice.id + ' import');

      assert.equal(NPCMemory.getTrust(scenario.npcId), expectedTrust);
      assert.equal(NPCMemory.hasFlag(scenario.npcId, guardFlag), true);
      assert.ok(NPCMemory.getAskedQuestions(scenario.npcId).includes(scenario.questionId));
      if (scenario.choice.memory_set) {
        assert.equal(NPCMemory.hasFlag(scenario.npcId, scenario.choice.memory_set), true);
      }
      if (scenario.node.memory_set) {
        assert.equal(NPCMemory.hasFlag(scenario.npcId, scenario.node.memory_set), true);
      }

      DialogueEngine.reset();
      DialogueEngine.startDialogue(scenario.npcId);
      const topic = DialogueEngine.selectTopic(scenario.topicId);
      assert.ok(!topic?.questions || !topic.questions.some(question => question.id === scenario.questionId),
        scenario.npcId + '/' + scenario.choice.id + ' must not re-offer the resolved choice after import');
    }
  } finally {
    offFlag();
    offTrust();
    Storage.save = previousStorageSave;
    Object.assign(GameState, previousState);
    Object.assign(DialogueEngine, previousDialogue);
  }
});
