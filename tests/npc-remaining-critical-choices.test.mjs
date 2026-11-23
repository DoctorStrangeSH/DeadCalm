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

const scenarios = [
  { npc:'npc_marta_hayes', question:'marta_publication_risk', node:'critical_choice_source',
    choices:[
      {id:'marta_protect_source',trust:50,flag:'marta_source_respected',result:'marta_source_respected_result'},
      {id:'marta_demand_publish',trust:20,flag:'marta_source_pressured',result:'marta_source_pressured_result'}
    ] },
  { npc:'npc_father_thomas', question:'thomas_fear', node:'critical_choice_letter',
    choices:[
      {id:'thomas_preserve_context',trust:35,flag:'thomas_context_respected',result:'thomas_context_result'},
      {id:'thomas_threaten_publication',trust:10,flag:'thomas_pressured',result:'thomas_pressured_result'}
    ] },
  { npc:'npc_anna_holt', question:'anna_box_trust', node:'critical_choice_box',
    choices:[
      {id:'anna_respect_boundary',trust:40,flag:'anna_boundary_respected',result:'anna_boundary_result'},
      {id:'anna_take_box',trust:10,flag:'anna_box_taken',result:'anna_box_taken_result'}
    ] },
  { npc:'npc_sebastian_blackwood', question:'sebastian_judge', node:'critical_choice_judge',
    choices:[
      {id:'sebastian_request_record',trust:15,flag:'sebastian_requested_records',result:'sebastian_records_result'},
      {id:'sebastian_reject_framing',trust:0,flag:'sebastian_challenged',result:'sebastian_challenged_result'}
    ] }
];

test('Marta, Thomas, Anna and Sebastian have one-time critical choices with persistent consequences', () => {
  const previous = {
    relationships: GameState.relationships, npcMemory: GameState.npcMemory,
    currentCase: GameState.currentCase, notebook: GameState.notebook, save: GameState.save,
    dialogues: DialogueEngine._dialogues, characters: DialogueEngine._characters,
    clues: DialogueEngine._clues, rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized, currentNPC: DialogueEngine._currentNPC,
    asked: DialogueEngine._askedQuestions, unlocked: DialogueEngine._unlockedTopics
  };

  try {
    GameState.save = () => {};
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    for (const scenario of scenarios) {
      for (const option of scenario.choices) {
        GameState.relationships = {};
        GameState.npcMemory = {};
        GameState.currentCase = { id:'case_001', clues:[], suspects:[], timeline:[], hypotheses:[] };
        GameState.notebook = [];

        DialogueEngine.startDialogue(scenario.npc);
        const choiceNode = DialogueEngine.askQuestion(scenario.question);
        assert.equal(choiceNode?.type, 'critical_choice', scenario.npc + ' should open its critical choice');
        assert.equal(choiceNode.text, dialogues[scenario.npc][scenario.node].text);

        const result = DialogueEngine.makeCriticalChoice(option.id);
        assert.equal(result?.type, 'critical_result');
        assert.equal(result.text, dialogues[scenario.npc][option.result].text);
        assert.equal(NPCMemory.getTrust(scenario.npc), option.trust);
        assert.equal(NPCMemory.hasFlag(scenario.npc, option.flag), true);
        assert.equal(result.trustDelta, option.trust - characters[scenario.npc].initial_trust);

        const repeated = DialogueEngine.askQuestion(scenario.question);
        assert.notEqual(repeated?.type, 'critical_choice', scenario.npc + ' must not repeat the choice');
      }
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

test('the four new branches preserve source, witness and culprit knowledge boundaries', () => {
  const marta = dialogues.npc_marta_hayes;
  const thomas = dialogues.npc_father_thomas;
  const anna = dialogues.npc_anna_holt;
  const sebastian = dialogues.npc_sebastian_blackwood;

  assert.match(marta.marta_source_respected_result.text, /личность источника останется/);
  assert.doesNotMatch(marta.marta_source_respected_result.text, /Маркус Холт/);
  assert.match(thomas.thomas_context_result.text, /не говорит, кто убил Каллиопу/);
  assert.match(anna.anna_boundary_result.text, /коробка останется здесь/);
  assert.doesNotMatch(sebastian.sebastian_records_result.text, /признаю.*убил|я убил/i);
  assert.match(sebastian.sebastian_challenged_result.text, /не признаёт и не подтверждает/);
  assert.equal(sebastian.sebastian_records_result.gives_clue, undefined);
  assert.equal(sebastian.sebastian_challenged_result.gives_clue, undefined);
});
