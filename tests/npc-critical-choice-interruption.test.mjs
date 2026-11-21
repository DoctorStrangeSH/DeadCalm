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

test('an unresolved critical choice is offered again after reload and is committed only after selection', () => {
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousSave = Storage.save;
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_askedQuestions', '_unlockedTopics'
  ];
  const previousDialogue = Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]));

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

    DialogueEngine.reset();
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    const promptBeforeExit = DialogueEngine.askQuestion('anna_box_trust');
    assert.equal(promptBeforeExit?.type, 'critical_choice');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false,
      'the choice must not be marked resolved before the player selects an option');
    assert.equal(NPCMemory.getAskedQuestions('npc_anna_holt').includes('anna_box_trust'), false,
      'the trigger question must remain available until the choice is committed');

    const interruptedSave = GameState.export();
    DialogueEngine.reset();
    assert.equal(GameState.importSave(interruptedSave), true);

    DialogueEngine.startDialogue('npc_anna_holt');
    const topic = DialogueEngine.selectTopic('about_box');
    assert.ok(topic?.questions?.some(question => question.id === 'anna_box_trust'),
      'the unresolved critical question must reappear after reload');
    const restoredPrompt = DialogueEngine.askQuestion('anna_box_trust');
    assert.equal(restoredPrompt?.type, 'critical_choice');

    const result = DialogueEngine.makeCriticalChoice('anna_respect_boundary');
    assert.equal(result?.type, 'critical_result');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), true);
    assert.equal(NPCMemory.getAskedQuestions('npc_anna_holt').includes('anna_box_trust'), true);

    const completedSave = GameState.export();
    DialogueEngine.reset();
    assert.equal(GameState.importSave(completedSave), true);
    DialogueEngine.startDialogue('npc_anna_holt');
    const completedTopic = DialogueEngine.selectTopic('about_box');
    assert.ok(!completedTopic?.questions?.some(question => question.id === 'anna_box_trust'),
      'a committed critical choice must not be offered again');
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previousState);
    Object.assign(DialogueEngine, previousDialogue);
  }
});
