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

function withFirstMeeting(npcId, saveResult, run) {
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousDialogue = Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]));
  let saveCalls = 0;

  try {
    GameState.saveBlocked = false;
    GameState.player = { name: 'Джон Риверс', reputation: 50 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.relationships = { [npcId]: { trust: characters[npcId].initial_trust, met: false } };
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

test('all six first NPC meetings commit met state, one conversation and initial topics in one save', () => {
  for (const npcId of Object.keys(dialogues)) {
    withFirstMeeting(npcId, true, getSaveCalls => {
      const result = DialogueEngine.startDialogue(npcId);
      const memory = NPCMemory.getMemory(npcId);

      assert.equal(result?.type, 'first_meeting', npcId);
      assert.equal(memory.met, true, npcId);
      assert.equal(memory.conversationCount, 1, npcId + ' first meeting must count exactly once');
      assert.deepEqual(memory.unlockedTopics, dialogues[npcId].first_meeting.unlocks_topics, npcId);
      assert.equal(getSaveCalls(), 1, npcId + ' first meeting must be one atomic save');
    });
  }
});

test('failed first-meeting save leaves no partial meeting or unlocked topics for every NPC', () => {
  for (const npcId of Object.keys(dialogues)) {
    withFirstMeeting(npcId, false, getSaveCalls => {
      const result = DialogueEngine.startDialogue(npcId);

      assert.equal(result?.saveError, true, npcId);
      const memory = NPCMemory.getMemory(npcId);
      assert.equal(memory.met, false, npcId);
      assert.equal(memory.conversationCount, 0, npcId);
      assert.deepEqual(memory.unlockedTopics, [], npcId);
      assert.equal(getSaveCalls(), 1, npcId + ' failed meeting must not perform a second partial save');
    });
  }
});
