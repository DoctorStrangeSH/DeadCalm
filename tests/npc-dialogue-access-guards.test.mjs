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

function preserve() {
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
    dialogue: Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]))
  };
}

function setup() {
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
  Object.assign(GameState, previous.state);
  Object.assign(DialogueEngine, previous.dialogue);
}

test('locked NPC topics and their questions cannot be called directly', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_lydia_winter')?.type, 'first_meeting');
    assert.ok(DialogueEngine._unlockedTopics.includes('about_town'));

    DialogueEngine._unlockedTopics = DialogueEngine._unlockedTopics.filter(id => id !== 'about_town');
    assert.equal(DialogueEngine.selectTopic('about_town'), null,
      'selectTopic must reject a topic absent from the saved unlock list');
    assert.equal(DialogueEngine.askQuestion('town_history'), null,
      'askQuestion must not bypass the topic unlock list');
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('town_history'), false);
  } finally {
    restore(previous);
  }
});

test('an ordinary NPC question can be answered only once, including stale or repeated UI actions', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'topic_selection');

    const topic = DialogueEngine.selectTopic('about_himself');
    assert.ok(topic.questions.some(question => question.id === 'ray_background'));
    const firstAnswer = DialogueEngine.askQuestion('ray_background');
    assert.equal(firstAnswer?.type, 'answer');
    assert.equal(NPCMemory.getAskedQuestions('npc_ray_morgan').includes('ray_background'), true);

    assert.equal(DialogueEngine.askQuestion('ray_background'), null,
      'a stale click must not execute an already-consumed ordinary question again');
    assert.equal(NPCMemory.getAskedQuestions('npc_ray_morgan').filter(id => id === 'ray_background').length, 1);
  } finally {
    restore(previous);
  }
});

test('an unresolved critical choice remains replayable until the player explicitly commits it', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'topic_selection');
    assert.ok(DialogueEngine.selectTopic('about_box').questions.some(q => q.id === 'anna_box_trust'));

    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    assert.equal(NPCMemory.getAskedQuestions('npc_anna_holt').includes('anna_box_trust'), false);
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice',
      'the unresolved choice must remain available if the player closes the dialogue');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary')?.type, 'critical_result');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust'), null,
      'once committed, the trigger question must no longer reopen the choice');
  } finally {
    restore(previous);
  }
});


test('Sebastian only confirms the vial transfer after both the appointment and pharmacy record are found', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_sebastian_blackwood')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_sebastian_blackwood')?.type, 'topic_selection');

    let topic = DialogueEngine.selectTopic('about_judge');
    assert.ok(topic.questions.some(item => item.id === 'sebastian_judge'));
    assert.equal(topic.questions.some(item => item.id === 'sebastian_delivery_statement'), false);

    GameState.currentCase.clues.push({ id: 'belladonna_invoice' });
    topic = DialogueEngine.selectTopic('about_judge');
    assert.equal(topic.questions.some(item => item.id === 'sebastian_delivery_statement'), false,
      'the pharmacy record alone must not unlock the confrontation');

    GameState.currentCase.clues.push({ id: 'judge_appointment_card' });
    topic = DialogueEngine.selectTopic('about_judge');
    assert.ok(topic.questions.some(item => item.id === 'sebastian_delivery_statement'),
      'both independent prerequisites must unlock the follow-up');
    const answer = DialogueEngine.askQuestion('sebastian_delivery_statement');
    assert.equal(answer?.addedClue?.id, 'sebastian_delivery_statement');
    assert.equal(GameState.hasClue('sebastian_delivery_statement'), true);
    assert.match(answer.text, /запечатанный флакон/);
  } finally {
    restore(previous);
  }
});


test('critical NPC choices cannot be committed directly or from a stale prompt', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'topic_selection');

    const trustBefore = NPCMemory.getTrust('npc_anna_holt');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null,
      'a choice ID alone must not bypass its trigger question');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);
    assert.equal(NPCMemory.getTrust('npc_anna_holt'), trustBefore);

    assert.ok(DialogueEngine.selectTopic('about_box').questions.some(q => q.id === 'anna_box_trust'));
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');

    assert.equal(DialogueEngine.makeCriticalChoice('unknown_choice'), null,
      'a choice from outside the active prompt must be rejected without consuming the prompt');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);

    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary')?.type, 'critical_result');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), true);
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null,
      'a resolved choice cannot be replayed after the active prompt is consumed');
  } finally {
    restore(previous);
  }
});

test('leaving or resetting a dialogue invalidates its pending critical-choice prompt', () => {
  const previous = preserve();
  try {
    setup();
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.selectTopic('about_box');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    assert.ok(DialogueEngine._pendingCriticalChoice);

    DialogueEngine.startDialogue('npc_ray_morgan');
    assert.equal(DialogueEngine._pendingCriticalChoice, null);
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);

    DialogueEngine.reset();
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);

    setup();
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.selectTopic('about_box');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    DialogueEngine.selectTopic('about_markus');
    assert.equal(DialogueEngine._pendingCriticalChoice, null,
      'navigating to another topic must invalidate the old choice prompt');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);
  } finally {
    restore(previous);
  }
});
