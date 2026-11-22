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

function snapshot() {
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked', 'save'
  ];
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_askedQuestions', '_unlockedTopics'
  ];
  return {
    state: Object.fromEntries(stateKeys.map(key => [key, GameState[key]])),
    dialogue: Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]])),
    storageSave: Storage.save
  };
}

function prepare() {
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
}

function restore(previous) {
  Storage.save = previous.storageSave;
  Object.assign(GameState, previous.state);
  Object.assign(DialogueEngine, previous.dialogue);
}

test('first NPC meeting and initial topics are committed together and can be retried', () => {
  const previous = snapshot();
  try {
    prepare();
    let writes = 0;
    Storage.save = () => ++writes === 1;

    const failed = DialogueEngine.startDialogue('npc_lydia_winter');
    assert.equal(failed?.type, 'simple');
    assert.equal(failed.saveError, true);
    assert.equal(NPCMemory.hasMet('npc_lydia_winter'), false);
    assert.deepEqual(NPCMemory.getUnlockedTopics('npc_lydia_winter'), []);

    Storage.save = () => true;
    const firstMeeting = DialogueEngine.startDialogue('npc_lydia_winter');
    assert.equal(firstMeeting?.type, 'first_meeting');
    assert.equal(NPCMemory.hasMet('npc_lydia_winter'), true);
    assert.ok(NPCMemory.getUnlockedTopics('npc_lydia_winter').includes('about_town'));
  } finally {
    restore(previous);
  }
});

test('ordinary dialogue question remains retryable if its memory cannot be saved', () => {
  const previous = snapshot();
  try {
    prepare();
    Storage.save = () => true;
    DialogueEngine.startDialogue('npc_lydia_winter');
    DialogueEngine.startDialogue('npc_lydia_winter');
    const topic = DialogueEngine.selectTopic('about_town');
    assert.ok(topic.questions.some(question => question.id === 'town_history'));

    Storage.save = () => false;
    const failed = DialogueEngine.askQuestion('town_history');
    assert.equal(failed?.type, 'answer');
    assert.equal(failed.saveError, true);
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('town_history'), false);
    assert.equal(DialogueEngine._askedQuestions.includes('town_history'), false);

    Storage.save = () => true;
    const retry = DialogueEngine.askQuestion('town_history');
    assert.equal(retry?.type, 'answer');
    assert.equal(retry.saveError, false);
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('town_history'), true);
  } finally {
    restore(previous);
  }
});
