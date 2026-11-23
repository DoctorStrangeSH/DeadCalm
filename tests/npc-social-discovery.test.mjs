import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

function preserve() {
  const previousStorageSave = Storage.save;
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'save', 'saveBlocked'
  ];
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_pendingCriticalChoice', '_unlockedTopics', '_askedQuestions'
  ];
  return {
    state: Object.fromEntries(stateKeys.map(key => [key, GameState[key]])),
    storageSave: previousStorageSave,
    dialogue: Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]))
  };
}

function setup() {
  Storage.save = () => true;
  GameState.save = () => true;
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
  Object.assign(DialogueEngine, {
    _dialogues: dialogues,
    _characters: characters,
    _clues: clues,
    _contradictionRules: contradictions,
    _initialized: true
  });
  DialogueEngine.reset();
}

function restore(previous) {
  Storage.save = previous.storageSave;
  Object.assign(GameState, previous.state);
  Object.assign(DialogueEngine, previous.dialogue);
}

test('Lydia-Gabriel family tie appears only after the player hears Lydia identify her brother', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(GameState.getSocialTies('npc_lydia_winter').length, 0);
    DialogueEngine.startDialogue('npc_lydia_winter');
    DialogueEngine.startDialogue('npc_lydia_winter');
    DialogueEngine.selectTopic('about_herself');

    const result = DialogueEngine.askQuestion('her_background');
    assert.equal(result?.type, 'critical_choice');
    assert.equal(result.addedSocialTie?.fromNpcId, 'npc_lydia_winter');
    assert.equal(result.addedSocialTie?.toNpcId, 'npc_gabriel');
    assert.equal(result.addedSocialTie?.type, 'family');
    assert.match(result.addedSocialTie.basis, /Габриэль — её брат/);

    const ties = GameState.getSocialTies('npc_lydia_winter');
    assert.equal(ties.length, 1);
    assert.deepEqual(ties[0].sourceRefs, ['dialogue:npc_lydia_winter:her_background']);
    assert.equal(GameState.getSocialTies('npc_gabriel').length, 1,
      'the same tie is queryable from either person');
  } finally {
    restore(previous);
  }
});

test('Anna-Marcus family tie is discovered from her own account, not seeded from hidden character data', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(GameState.getSocialTies('npc_anna_holt').length, 0);
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.selectTopic('about_markus');

    const result = DialogueEngine.askQuestion('anna_markus_last_seen');
    assert.equal(result?.type, 'answer');
    assert.equal(result.addedSocialTie?.fromNpcId, 'npc_anna_holt');
    assert.equal(result.addedSocialTie?.toNpcId, 'npc_markus_holt');
    assert.equal(result.addedSocialTie?.type, 'family');
    assert.match(result.text, /Отец — Маркус/);
    assert.match(result.addedSocialTie.basis, /называет Маркуса отцом/);
    assert.equal(GameState.getSocialTies('npc_anna_holt').length, 1);

    const snapshot = GameState.export();
    GameState.socialGraph = { ties: [], events: [] };
    assert.equal(GameState.importSave(snapshot), true);
    assert.equal(GameState.getSocialTies('npc_anna_holt').length, 1,
      'discovered relationships survive save export/import');
  } finally {
    restore(previous);
  }
});

test('unrelated testimony does not fabricate NPC-to-NPC relationships', () => {
  const previous = preserve();
  try {
    setup();
    DialogueEngine.startDialogue('npc_marta_hayes');
    DialogueEngine.startDialogue('npc_marta_hayes');
    DialogueEngine.selectTopic('about_source');
    const response = DialogueEngine.askQuestion('marta_source_identity');
    if (response) assert.equal(response.addedSocialTie, null);
    assert.deepEqual(GameState.socialGraph, { ties: [], events: [] },
      'Marta does not know the identity of her anonymous source');
  } finally {
    restore(previous);
  }
});
