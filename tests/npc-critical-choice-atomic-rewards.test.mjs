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

test('critical choice, trust, note and clue commit or roll back together', () => {
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousSave = Storage.save;
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_pendingCriticalChoice', '_askedQuestions', '_unlockedTopics'
  ];
  const previousDialogue = Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]));
  const emitted = [];
  const off = [
    Events.on('npc:flag_set', event => emitted.push(['flag', event])),
    Events.on('relationship:changed', event => emitted.push(['trust', event])),
    Events.on('clue:added', event => emitted.push(['clue', event]))
  ];

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

    Object.assign(DialogueEngine, {
      _dialogues: dialogues,
      _characters: characters,
      _clues: clues,
      _contradictionRules: contradictions,
      _initialized: true
    });
    DialogueEngine.reset();
    DialogueEngine.startDialogue('npc_lydia_winter');
    DialogueEngine.startDialogue('npc_lydia_winter');
    assert.equal(DialogueEngine.askQuestion('her_background')?.type, 'critical_choice');

    const trustBefore = characters.npc_lydia_winter.initial_trust;
    const saveBeforeChoice = Storage.save;
    Storage.save = () => false;
    assert.equal(DialogueEngine.makeCriticalChoice('promise_protection')?.saveError, true);

    assert.equal(NPCMemory.getTrust('npc_lydia_winter'), trustBefore);
    assert.equal(NPCMemory.hasFlag('npc_lydia_winter', 'lydia_trusts_player'), false);
    assert.equal(NPCMemory.hasFlag('npc_lydia_winter', 'critical_critical_choice_trust'), false);
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('her_background'), false);
    assert.deepEqual(GameState.notebook, []);
    assert.deepEqual(GameState.currentCase.clues, []);
    assert.deepEqual(emitted, [], 'failed transaction must not publish any side-effect events');

    let saveCalls = 0;
    Storage.save = () => { saveCalls++; return true; };
    const result = DialogueEngine.makeCriticalChoice('promise_protection');
    assert.equal(result?.type, 'critical_result');
    assert.equal(saveCalls, 1, 'choice, trust, note and clue must use one save');
    assert.equal(NPCMemory.getTrust('npc_lydia_winter'), 65);
    assert.equal(GameState.notebook.length, 1);
    assert.equal(GameState.notebook[0].title, 'Признание Лидии: Габриэль');
    assert.equal(GameState.currentCase.clues.length, 1);
    assert.equal(GameState.currentCase.clues[0].id, 'gabriel_identity');
    assert.equal(result.addedNote.title, GameState.notebook[0].title);
    assert.equal(result.addedClue.id, 'gabriel_identity');
    assert.deepEqual(emitted.map(([type]) => type).sort(), ['clue', 'flag', 'flag', 'trust']);
    assert.equal(emitted.filter(([type]) => type === 'clue').length, 1);
    assert.equal(emitted.filter(([type]) => type === 'trust').length, 1);

    const saved = GameState.export();
    DialogueEngine.reset();
    assert.equal(GameState.importSave(saved), true);
    assert.equal(NPCMemory.getTrust('npc_lydia_winter'), 65);
    assert.equal(GameState.notebook.filter(item => item.title === 'Признание Лидии: Габриэль').length, 1);
    assert.equal(GameState.currentCase.clues.filter(item => item.id === 'gabriel_identity').length, 1);
  } finally {
    off.forEach(unsubscribe => unsubscribe());
    Storage.save = previousSave;
    Object.assign(GameState, previousState);
    Object.assign(DialogueEngine, previousDialogue);
  }
});
