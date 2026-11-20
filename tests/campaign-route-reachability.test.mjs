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


test('every authored contradiction has two obtainable, day-one sources and a reachable follow-up', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const clues = readJson('../src/data/clues.json');
  const contradictions = readJson('../src/data/contradictions.json');
  const locations = readJson('../src/data/locations.json');
  const dialogueSources = new Map();
  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      for (const response of topic.responses || []) {
        if (response.gives_clue) {
          if (!dialogueSources.has(response.gives_clue)) dialogueSources.set(response.gives_clue, []);
          dialogueSources.get(response.gives_clue).push({ npcId, topicId, response });
        }
      }
    }
  }

  const crimeScene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const portScene = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');
  const sceneText = crimeScene + '\n' + portScene;
  const sceneSourceIds = new Set([
    ...[...sceneText.matchAll(/id:\s*'([a-z0-9_]+)'/g)].map(match => match[1]),
    ...[...sceneText.matchAll(/inspect(?:CourtRecord|Orlov|ReaderWitness|WitnessRecord)\(\s*'[^']+'\s*,\s*'([a-z0-9_]+)'/g)].map(match => match[1])
  ]);

  assert.ok(contradictions.length > 0, 'the case must define explicit contradiction rules');
  for (const rule of contradictions) {
    assert.ok(Array.isArray(rule.clueIds) && rule.clueIds.length >= 2, rule.id + ' needs at least two sources');
    assert.equal(new Set(rule.clueIds).size, rule.clueIds.length, rule.id + ' cannot repeat a source');
    for (const id of rule.clueIds) {
      const clue = clues[id];
      assert.ok(clue, rule.id + ' references missing clue ' + id);
      assert.ok(dialogueSources.has(id) || sceneSourceIds.has(id),
        rule.id + ' source ' + id + ' has no authored acquisition path');
      assert.ok(Number.isInteger(clue.day) && clue.day <= 1,
        rule.id + ' source ' + id + ' must be available during day one');
      const location = locations[clue.location];
      assert.ok(location, id + ' points to an unknown location');
      const unlock = /^day_(\d+)$/.exec(location.unlock_condition || '');
      const unlockDay = location.unlocked === true ? 1 : unlock ? Number(unlock[1]) : Infinity;
      assert.ok(unlockDay <= clue.day, id + ' is locked after its authored evidence day');
    }
  }

  for (const [npcId, npc] of Object.entries(dialogues)) {
    const responses = Object.values(npc.topics || {}).flatMap(topic => topic.responses || []);
    for (const response of responses.filter(item => item.requires_contradiction)) {
      const rule = contradictions.find(item => item.id === response.requires_contradiction);
      assert.ok(rule, npcId + '.' + response.id + ' references an unknown contradiction');
      if (response.requires_question) {
        const prerequisite = responses.find(item => item.id === response.requires_question);
        assert.ok(prerequisite, npcId + '.' + response.id + ' has no preceding question');
        assert.ok(!prerequisite.requires_contradiction,
          npcId + '.' + response.id + ' has a circular contradiction prerequisite');
      }
    }
  }
});

test('all NPC dialogue prerequisites resolve inside the same authored conversation graph', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const clues = readJson('../src/data/clues.json');
  const contradictions = readJson('../src/data/contradictions.json');
  for (const [npcId, npc] of Object.entries(dialogues)) {
    const topics = npc.topics || {};
    for (const topicId of npc.first_meeting?.unlocks_topics || []) {
      assert.ok(topics[topicId], npcId + ' first meeting unlocks missing topic ' + topicId);
    }

    const responses = Object.entries(topics).flatMap(([topicId, topic]) =>
      (topic.responses || []).map(response => ({ ...response, topicId }))
    );
    const responseIds = responses.map(response => response.id);
    assert.equal(new Set(responseIds).size, responseIds.length, npcId + ' has duplicate question IDs');

    for (const response of responses) {
      assert.ok(typeof response.id === 'string' && response.id.length > 0,
        npcId + '.' + response.topicId + ' contains a response without an ID');
      if (response.requires_question) {
        assert.ok(responseIds.includes(response.requires_question),
          npcId + '.' + response.id + ' depends on a question that this NPC never asks: ' + response.requires_question);
        assert.notEqual(response.requires_question, response.id,
          npcId + '.' + response.id + ' cannot require itself');
      }
      if (response.requires_clue) {
        assert.ok(clues[response.requires_clue],
          npcId + '.' + response.id + ' requires an unknown clue: ' + response.requires_clue);
      }
      if (response.requires_contradiction) {
        assert.ok(contradictions.some(rule => rule.id === response.requires_contradiction),
          npcId + '.' + response.id + ' requires an unknown contradiction: ' + response.requires_contradiction);
      }
      if (response.gives_clue) {
        assert.ok(clues[response.gives_clue],
          npcId + '.' + response.id + ' grants an unknown clue: ' + response.gives_clue);
      }
    }
  }
});
