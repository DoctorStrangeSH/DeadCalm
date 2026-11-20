import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const requiredByCampaign = [
  'autopsy_report_01',
  'court_switchboard_log',
  'judge_appointment_card',
  'old_case_details',
  'marta_source_envelope',
  'matthews_letter',
  'port_cargo_ledger',
  'anna_markus_items',
  'belladonna_invoice',
  'port_cargo_ledger_archive'
];
const alternativeFinalEvidence = ['restored_film_frame', 'port_radio_fragment'];

test('every mandatory campaign clue has a real authored acquisition path', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const clues = readJson('../src/data/clues.json');
  const dialogueClues = new Set();
  for (const npc of Object.values(dialogues)) {
    for (const topic of Object.values(npc.topics || {})) {
      for (const response of topic.responses || []) {
        if (response.gives_clue) dialogueClues.add(response.gives_clue);
      }
    }
  }

  const crimeScene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const portScene = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');
  const miniGameEvidence = readFileSync(new URL('../src/js/systems/case-001-evidence.js', import.meta.url), 'utf8');
  const authoredSceneSources = new Set([
    ...[...crimeScene.matchAll(/id:\s*'([a-z0-9_]+)'/g)].map(match => match[1]),
    ...[...portScene.matchAll(/id:\s*'([a-z0-9_]+)'/g)].map(match => match[1])
  ]);

  for (const id of [...requiredByCampaign, ...alternativeFinalEvidence]) {
    assert.ok(clues[id], 'missing clue catalogue entry: ' + id);
    const hasSource = dialogueClues.has(id) || authoredSceneSources.has(id) || miniGameEvidence.includes("id: '" + id + "'");
    assert.ok(hasSource, id + ' is required by campaign progression but has no authored acquisition path');
  }
});

test('mandatory clue locations are available no later than their authored evidence day', () => {
  const clues = readJson('../src/data/clues.json');
  const locations = readJson('../src/data/locations.json');
  for (const id of requiredByCampaign) {
    const clue = clues[id];
    assert.ok(Number.isInteger(clue.day), id + ' needs an authored evidence day');
    assert.ok(locations[clue.location], id + ' points to an unknown location');
    const location = locations[clue.location];
    const match = /^day_(\d+)$/.exec(location.unlock_condition || '');
    const unlockDay = location.unlocked === true ? 1 : match ? Number(match[1]) : Infinity;
    assert.ok(unlockDay <= clue.day, id + ' is placed in a location that unlocks after its evidence day');
  }
});

test('the day-one court call has a complete, discoverable contradiction prerequisite chain', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const contradictions = readJson('../src/data/contradictions.json');
  const rayResponses = Object.values(dialogues.npc_ray_morgan.topics)
    .flatMap(topic => topic.responses || []);
  const reportResponse = rayResponses.find(response => response.id === 'confront_report_timing');
  const callResponse = rayResponses.find(response => response.gives_clue === 'court_switchboard_log');

  assert.ok(reportResponse, 'Ray must offer the report-timing follow-up');
  assert.equal(reportResponse.requires_contradiction, 'report_vs_autopsy_timing');
  assert.ok(callResponse, 'Ray must provide the court switchboard extract');
  assert.equal(callResponse.requires_question, 'confront_report_timing');

  const rule = contradictions.find(item => item.id === reportResponse.requires_contradiction);
  assert.deepEqual(rule?.clueIds, ['patrol_initial_report', 'autopsy_report_01']);
  assert.ok(rayResponses.some(response => response.gives_clue === 'patrol_initial_report'));
  assert.ok(Object.values(dialogues.npc_lydia_winter.topics)
    .flatMap(topic => topic.responses || [])
    .some(response => response.gives_clue === 'autopsy_report_01'));
});
