import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';
import { buildCase001MiniGameEvidence, recordCase001MiniGameEvidence } from '../src/js/systems/case-001-evidence.js';
import { canAccessCase001MiniGame } from '../src/js/systems/minigame-access.js';
import { assessFinalEvidence } from '../src/js/systems/campaign-progression.js';
import { isLocationUnlocked } from '../src/js/systems/location-access.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const clues = readJson('../src/data/clues.json');
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const locations = readJson('../src/data/locations.json');
const contradictions = readJson('../src/data/contradictions.json');

const dialogueRoutes = [
  ['autopsy_report_01', 'npc_lydia_winter', 'about_autopsy', 'cause_of_death', 1],
  ['old_case_details', 'npc_ray_morgan', 'about_case', 'old_case', 1],
  ['marta_source_envelope', 'npc_marta_hayes', 'about_source', 'marta_source_identity', 2],
  ['matthews_letter', 'npc_father_thomas', 'about_letter', 'thomas_matthews_letter', 2],
  ['port_cargo_ledger', 'npc_sebastian_blackwood', 'about_port', 'sebastian_port_business', 3],
  ['anna_markus_items', 'npc_anna_holt', 'about_markus', 'anna_markus_last_seen', 4]
];

function stateAtDay(day) {
  return { hasFlag: flag => /^day_[1-5]$/.test(flag) && Number(flag.slice(4)) <= day };
}

test('every mandatory dialogue clue has an authored, unlocked NPC question at its campaign day', () => {
  for (const [clueId, npcId, topicId, questionId, day] of dialogueRoutes) {
    const clue = clues[clueId];
    const npc = dialogues[npcId];
    assert.ok(clue, 'missing clue ' + clueId);
    assert.ok(npc, 'missing NPC dialogue ' + npcId);
    assert.ok(npc.first_meeting.unlocks_topics.includes(topicId),
      npcId + ' must unlock ' + topicId + ' on first meeting');
    const response = npc.topics[topicId].responses.find(item => item.id === questionId);
    assert.ok(response, 'missing acquisition question ' + questionId);
    assert.equal(response.gives_clue, clueId, questionId + ' must grant ' + clueId);
    assert.equal(clue.day, day, clueId + ' must be authored for day ' + day);
    assert.equal(isLocationUnlocked(locations[clue.location], stateAtDay(day)), true,
      clueId + ' location must be reachable on day ' + day);
  }
});

test('the first-day court-call clue requires the documented report/autopsy contradiction, then follows the real dialogue chain', () => {
  const rule = contradictions.find(item => item.id === 'report_vs_autopsy_timing');
  assert.deepEqual(rule?.clueIds, ['patrol_initial_report', 'autopsy_report_01']);

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
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.notebook = [];
    GameState.currentCase = {
      id: 'case_001',
      clues: [clues.patrol_initial_report, clues.autopsy_report_01].map(item => ({ ...item })),
      suspects: [], timeline: [], hypotheses: []
    };
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    DialogueEngine.startDialogue('npc_ray_morgan');
    DialogueEngine.startDialogue('npc_ray_morgan');
    const beforeLink = DialogueEngine.selectTopic('about_case');
    assert.equal(beforeLink.questions.some(item => item.id === 'confront_report_timing'), false,
      'finding both documents is not enough until they are attached to a working hypothesis');

    GameState.currentCase.hypotheses.push({
      id: 'hyp_report_timing',
      title: 'Расхождение времени смерти',
      reasoning: 'Сверить предварительный рапорт с медицинским заключением.',
      clueIds: ['patrol_initial_report', 'autopsy_report_01']
    });

    const afterLink = DialogueEngine.selectTopic('about_case');
    assert.equal(afterLink.questions.some(item => item.id === 'confront_report_timing'), true);
    const confrontation = DialogueEngine.askQuestion('confront_report_timing');
    assert.equal(confrontation.type, 'answer');
    assert.equal(GameState.hasClue('court_switchboard_log'), false);

    const callRecord = DialogueEngine.askQuestion('inspect_incoming_calls');
    assert.equal(callRecord.addedClue.id, 'court_switchboard_log');
    assert.equal(GameState.hasClue('court_switchboard_log'), true);
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

test('scene-only mandatory clues have a real acquisition action in the authored scene', () => {
  const crimeScene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const portScene = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');

  assert.match(crimeScene, /id: 'judge_appointment_card'/);
  assert.match(crimeScene, /GameState\.addClue\(\{[\s\S]*?id: 'judge_appointment_card'/);
  assert.match(portScene, /id: 'belladonna_invoice'/);
  assert.match(portScene, /invoice\.id = 'btn-port-invoice'/);
  assert.match(portScene, /if \(GameState\.campaign\.day >= 5\) \{/);
  assert.match(portScene, /GameState\.addClue\(markusStatement\)/);
});

test('the two independent day-four evidence routes are actually wired to their minigames and quality thresholds', () => {
  const evidence = readFileSync(new URL('../src/js/systems/case-001-evidence.js', import.meta.url), 'utf8');
  const filmScene = readFileSync(new URL('../src/js/scenes/film-restoration.js', import.meta.url), 'utf8');
  const radioScene = readFileSync(new URL('../src/js/scenes/radio-tuning.js', import.meta.url), 'utf8');

  assert.match(filmScene, /recordCase001MiniGameEvidence\(GameState, 'film-restoration'/);
  assert.match(radioScene, /recordCase001MiniGameEvidence\(GameState, 'radio-tuning'/);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: 69 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: 70 }).id, 'restored_film_frame');
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 95 }).id, 'restored_film_frame');
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 94 }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'unreadable', quality: 67 }), null,
    'an unreadable signal must never become a story clue');
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'unreadable', quality: 68 }), null,
    'the outcome classification must agree with the evidence quality gate');
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: 67 }), null,
    'a fragmented label cannot bypass the minimum signal quality');
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: 68 }).id, 'port_radio_fragment',
    'a fragmentary but intelligible signal may become a qualified clue');
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'clear', quality: 92 }).id, 'port_radio_fragment');
  assert.match(evidence, /result\.outcome === 'success' && reportedQuality < 95/);
  assert.match(evidence, /result\.outcome === 'fragmented'/);
  assert.match(evidence, /Number\.isFinite\(reportedQuality\)/);
});


test('radio-first day-four route can still reach the film evidence required for full public disclosure', () => {
  const found = new Map([
    ['autopsy_report_01', { id: 'autopsy_report_01' }],
    ['judge_appointment_card', { id: 'judge_appointment_card' }],
    ['belladonna_invoice', { id: 'belladonna_invoice' }],
    ['matthews_letter', { id: 'matthews_letter' }],
    ['port_cargo_ledger', { id: 'port_cargo_ledger' }],
    ['markus_statement', { id: 'markus_statement' }],
    ['anna_markus_items', { id: 'anna_markus_items' }],
    ['port_radio_fragment', { id: 'port_radio_fragment', quality: 82 }]
  ]);
  const game = {
    campaign: { day: 5, completed: false },
    hasClue: id => found.has(id),
    getClue: id => found.get(id) || null,
    addClue: clue => found.set(clue.id, { ...clue }),
    save() {}
  };

  assert.equal(assessFinalEvidence(game).ready, true,
    'radio is a valid independent day-four source and should permit the compromise route');
  assert.equal(assessFinalEvidence(game).fullDisclosureReady, false,
    'radio alone must not unlock the full public-disclosure ending');
  assert.equal(canAccessCase001MiniGame('mechanical-repair', game), true,
    'Anna’s items must keep the watch-repair route available on day five');

  assert.equal(recordCase001MiniGameEvidence(game, 'mechanical-repair', { outcome: 'success' }), true);
  assert.equal(game.hasClue('markus_watch_key'), true);
  assert.equal(canAccessCase001MiniGame('film-restoration', game), true,
    'the repaired watch key must unlock film restoration after choosing radio first');

  assert.equal(recordCase001MiniGameEvidence(game, 'film-restoration', { outcome: 'success', quality: 100 }), true);
  assert.equal(game.hasClue('restored_film_frame'), true);
  assert.equal(assessFinalEvidence(game).fullDisclosureReady, true,
    'the player can still earn the high-quality film and complete the open-case route');
});


test('failed dialogue clue persistence leaves the question retryable and reports no false discovery', () => {
  const previous = {
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    currentCase: GameState.currentCase,
    notebook: GameState.notebook,
    save: GameState.save,
    addClue: GameState.addClue,
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clueCatalog: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized,
    currentNPC: DialogueEngine._currentNPC,
    asked: DialogueEngine._askedQuestions,
    unlocked: DialogueEngine._unlockedTopics
  };

  try {
    GameState.save = () => true;
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.notebook = [];
    GameState.currentCase = {
      ...previous.currentCase,
      clues: [],
      hypotheses: []
    };
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    DialogueEngine.startDialogue('npc_lydia_winter');
    DialogueEngine.backToTopics();
    const topic = DialogueEngine.selectTopic('about_autopsy');
    assert.ok(topic.questions.some(item => item.id === 'cause_of_death'));

    GameState.addClue = () => false;
    const failed = DialogueEngine.askQuestion('cause_of_death');
    assert.equal(failed.type, 'answer');
    assert.equal(failed.saveError, true);
    assert.equal(failed.addedClue, null);
    assert.equal(GameState.hasClue('autopsy_report_01'), false);
    assert.equal(DialogueEngine._askedQuestions.includes('cause_of_death'), false);
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('cause_of_death'), false);

    GameState.addClue = previous.addClue;
    const retry = DialogueEngine.askQuestion('cause_of_death');
    assert.equal(retry.saveError, false);
    assert.equal(retry.addedClue.id, 'autopsy_report_01');
    assert.equal(GameState.hasClue('autopsy_report_01'), true);
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('cause_of_death'), true);
  } finally {
    GameState.relationships = previous.relationships;
    GameState.npcMemory = previous.npcMemory;
    GameState.currentCase = previous.currentCase;
    GameState.notebook = previous.notebook;
    GameState.save = previous.save;
    GameState.addClue = previous.addClue;
    DialogueEngine._dialogues = previous.dialogues;
    DialogueEngine._characters = previous.characters;
    DialogueEngine._clues = previous.clueCatalog;
    DialogueEngine._contradictionRules = previous.rules;
    DialogueEngine._initialized = previous.initialized;
    DialogueEngine._currentNPC = previous.currentNPC;
    DialogueEngine._askedQuestions = previous.asked;
    DialogueEngine._unlockedTopics = previous.unlocked;
  }
});
