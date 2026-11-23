import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

test('critical NPC choice, trust and asked-question lock survive export/import and a new dialogue session', () => {
  const previousState = {
    player: GameState.player,
    currentCase: GameState.currentCase,
    campaign: GameState.campaign,
    flags: GameState.flags,
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    socialGraph: GameState.socialGraph,
    knowledgeLedger: GameState.knowledgeLedger,
    npcDailyLife: GameState.npcDailyLife,
    miniGameProgress: GameState.miniGameProgress,
    notebook: GameState.notebook,
    settings: GameState.settings,
    saveBlocked: GameState.saveBlocked,
    save: GameState.save
  };
  const previousStorageSave = Storage.save;
  const previousDialogue = {
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clues: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized,
    currentNPC: DialogueEngine._currentNPC,
    currentNode: DialogueEngine._currentNode,
    asked: DialogueEngine._askedQuestions,
    unlocked: DialogueEngine._unlockedTopics
  };

  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
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

    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    const choicePrompt = DialogueEngine.askQuestion('anna_box_trust');
    assert.equal(choicePrompt?.type, 'critical_choice');

    const choiceResult = DialogueEngine.makeCriticalChoice('anna_respect_boundary');
    assert.equal(choiceResult?.type, 'critical_result');
    assert.equal(NPCMemory.getTrust('npc_anna_holt'), 40);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'anna_boundary_respected'), true);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), true);
    assert.ok(NPCMemory.getAskedQuestions('npc_anna_holt').includes('anna_box_trust'));

    const exported = GameState.export();
    GameState.npcMemory = {};
    GameState.relationships = {};
    assert.equal(GameState.importSave(exported), true);

    assert.equal(NPCMemory.getTrust('npc_anna_holt'), 40);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'anna_boundary_respected'), true);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), true);

    DialogueEngine.reset();
    DialogueEngine.startDialogue('npc_anna_holt');
    const boxTopic = DialogueEngine.selectTopic('about_box');
    assert.equal(boxTopic?.questions?.some(question => question.id === 'anna_box_trust'), false,
      'the critical choice question must stay unavailable after loading the save');
  } finally {
    Storage.save = previousStorageSave;
    Object.assign(GameState, previousState);
    DialogueEngine._dialogues = previousDialogue.dialogues;
    DialogueEngine._characters = previousDialogue.characters;
    DialogueEngine._clues = previousDialogue.clues;
    DialogueEngine._contradictionRules = previousDialogue.rules;
    DialogueEngine._initialized = previousDialogue.initialized;
    DialogueEngine._currentNPC = previousDialogue.currentNPC;
    DialogueEngine._currentNode = previousDialogue.currentNode;
    DialogueEngine._askedQuestions = previousDialogue.asked;
    DialogueEngine._unlockedTopics = previousDialogue.unlocked;
  }
});
