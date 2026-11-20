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

test('all authored Lydia and Ray critical choices apply their trust and persistent consequences once', () => {
  const previous = {
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    currentCase: GameState.currentCase,
    notebook: GameState.notebook,
    save: GameState.save,
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clues: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized,
    currentNPC: DialogueEngine._currentNPC,
    asked: DialogueEngine._askedQuestions,
    unlocked: DialogueEngine._unlockedTopics
  };

  const scenarios = [
    { npc: 'npc_lydia_winter', question: 'her_background', node: 'critical_choice_trust',
      choice: 'promise_protection', trust: 65, flag: 'lydia_trusts_player', result: 'lydia_reveals_secret' },
    { npc: 'npc_lydia_winter', question: 'her_background', node: 'critical_choice_trust',
      choice: 'stay_neutral', trust: 40, flag: 'lydia_cautious', result: 'lydia_partial_info' },
    { npc: 'npc_lydia_winter', question: 'her_background', node: 'critical_choice_trust',
      choice: 'pressure_her', trust: 0, flag: 'lydia_refuses', result: 'lydia_shuts_down_forever' },
    { npc: 'npc_ray_morgan', question: 'blackwood_power', node: 'critical_choice_raid',
      choice: 'go_with_ray', trust: 35, flag: 'ray_official_cooperation', result: 'ray_raid_together' },
    { npc: 'npc_ray_morgan', question: 'blackwood_power', node: 'critical_choice_raid',
      choice: 'decline_raid', trust: 25, flag: 'ray_records_first', result: 'ray_goes_alone' },
    { npc: 'npc_ray_morgan', question: 'blackwood_power', node: 'critical_choice_raid',
      choice: 'report_raid', trust: 0, flag: 'ray_hostile', result: 'ray_betrayed' }
  ];

  try {
    GameState.save = () => {};
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    for (const scenario of scenarios) {
      GameState.relationships = {};
      GameState.npcMemory = {};
      GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
      GameState.notebook = [];

      DialogueEngine.startDialogue(scenario.npc);
      const choiceNode = DialogueEngine.askQuestion(scenario.question);
      assert.equal(choiceNode.type, 'critical_choice', scenario.choice + ' should trigger a critical choice');
      assert.deepEqual(choiceNode.choices.map(choice => choice.id),
        dialogues[scenario.npc][scenario.node].choices.map(choice => choice.id));

      const result = DialogueEngine.makeCriticalChoice(scenario.choice);
      assert.equal(result.type, 'critical_result');
      assert.equal(result.text, dialogues[scenario.npc][scenario.result].text);
      assert.equal(NPCMemory.getTrust(scenario.npc), scenario.trust);
      assert.equal(NPCMemory.hasFlag(scenario.npc, scenario.flag), true);
      assert.equal(result.trustDelta, scenario.trust - characters[scenario.npc].initial_trust);

      const repeated = DialogueEngine.askQuestion(scenario.question);
      assert.notEqual(repeated?.type, 'critical_choice', 'the same critical choice must not be offered twice');
    }
  } finally {
    GameState.relationships = previous.relationships;
    GameState.npcMemory = previous.npcMemory;
    GameState.currentCase = previous.currentCase;
    GameState.notebook = previous.notebook;
    GameState.save = previous.save;
    DialogueEngine._dialogues = previous.dialogues;
    DialogueEngine._characters = previous.characters;
    DialogueEngine._clues = previous.clues;
    DialogueEngine._contradictionRules = previous.rules;
    DialogueEngine._initialized = previous.initialized;
    DialogueEngine._currentNPC = previous.currentNPC;
    DialogueEngine._askedQuestions = previous.asked;
    DialogueEngine._unlockedTopics = previous.unlocked;
  }
});
