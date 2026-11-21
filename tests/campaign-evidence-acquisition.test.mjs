import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';
import { buildCase001MiniGameEvidence } from '../src/js/systems/case-001-evidence.js';
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
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { quality: 69 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { quality: 70 }).id, 'restored_film_frame');
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { quality: 37 }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { quality: 38 }).id, 'port_radio_fragment');
  assert.match(evidence, /if \(type === 'film-restoration' && !\(Number\(result\.quality\) >= 70\)\) return null/);
  assert.match(evidence, /if \(type === 'radio-tuning' && !\(Number\(result\.quality\) >= 38\)\) return null/);
});
