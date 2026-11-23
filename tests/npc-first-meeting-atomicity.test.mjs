import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
import { readFileSync } from 'node:fs';

const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

const stateKeys = [
  'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
  'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
  'notebook', 'settings', 'saveBlocked', 'save'
];
const dialogueKeys = [
  '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
  '_currentNPC', '_currentNode', '_unlockedTopics', '_askedQuestions'
];

function withFirstMeeting(saveResult, run) {
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousDialogue = Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]));
  let saveCalls = 0;

  try {
    GameState.saveBlocked = false;
    GameState.player = { name: 'Джон Риверс', reputation: 50 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.relationships = { npc_anna_holt: { trust: characters.npc_anna_holt.initial_trust, met: false } };
    GameState.npcMemory = {};
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [];
    GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };
    GameState.save = () => { saveCalls++; return saveResult; };

    Object.assign(DialogueEngine, {
      _dialogues: dialogues,
      _characters: characters,
      _clues: clues,
      _contradictionRules: contradictions,
      _initialized: true
    });
    DialogueEngine.reset();

    return run(() => saveCalls);
  } finally {
    Object.assign(GameState, previousState);
    Object.assign(DialogueEngine, previousDialogue);
  }
}

test('first NPC meeting commits met state, one conversation and initial topics in one save', () => {
  withFirstMeeting(true, getSaveCalls => {
    const result = DialogueEngine.startDialogue('npc_anna_holt');
    const memory = NPCMemory.getMemory('npc_anna_holt');

    assert.equal(result?.type, 'first_meeting');
    assert.equal(memory.met, true);
    assert.equal(memory.conversationCount, 1, 'one first meeting must count exactly once');
    assert.deepEqual(memory.unlockedTopics, dialogues.npc_anna_holt.first_meeting.unlocks_topics);
    assert.equal(getSaveCalls(), 1, 'first meeting must be one atomic save, not separate markMet and topic saves');
  });
});

test('failed first-meeting save leaves no partial meeting or unlocked topics', () => {
  withFirstMeeting(false, getSaveCalls => {
    const result = DialogueEngine.startDialogue('npc_anna_holt');

    assert.equal(result?.saveError, true);
    const memory = NPCMemory.getMemory('npc_anna_holt');
    assert.equal(memory.met, false);
    assert.equal(memory.conversationCount, 0);
    assert.deepEqual(memory.unlockedTopics, []);
    assert.equal(getSaveCalls(), 1, 'failed first meeting must not perform a second partial save');
  });
});
