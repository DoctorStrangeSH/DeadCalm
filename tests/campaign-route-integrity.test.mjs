import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLocationUnlocked } from '../src/js/systems/location-access.js';
import { assessCampaignDay } from '../src/js/systems/campaign-progression.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const locations = readJson('../src/data/locations.json');
const clues = readJson('../src/data/clues.json');
const dialogues = readJson('../src/data/dialogues.json');

const requiredByDay = {
  1: ['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details'],
  2: ['marta_source_envelope', 'matthews_letter'],
  3: ['port_cargo_ledger'],
  4: ['anna_markus_items', 'belladonna_invoice']
};
const independentDayFourSources = ['restored_film_frame', 'port_radio_fragment'];

function stateAtDay(day, foundClues = []) {
  const found = new Set(foundClues);
  return {
    campaign: { day, completed: false },
    hasFlag: flag => /^day_[1-5]$/.test(flag) && Number(flag.slice(4)) <= day,
    hasClue: id => found.has(id)
  };
}

test('every mandatory campaign clue is placed in a location reachable by its required day', () => {
  for (const [dayText, clueIds] of Object.entries(requiredByDay)) {
    const day = Number(dayText);
    const state = stateAtDay(day);
    for (const clueId of clueIds) {
      const clue = clues[clueId];
      assert.ok(clue, `day ${day} references missing clue ${clueId}`);
      const location = locations[clue.location];
      assert.ok(location, `${clueId} references missing location ${clue.location}`);
      assert.equal(
        isLocationUnlocked(location, state),
        true,
        `${clueId} is required on day ${day}, but ${clue.location} is not reachable yet`
      );
    }
  }

  for (const clueId of independentDayFourSources) {
    const clue = clues[clueId];
    assert.ok(clue, `missing independent day-four clue ${clueId}`);
    assert.equal(
      isLocationUnlocked(locations[clue.location], stateAtDay(4)),
      true,
      `${clueId} must be obtainable by day four`
    );
  }
});

test('day three port ledger is obtainable from Sebastian at the unlocked mansion', () => {
  const mansion = locations.blackwood_mansion;
  assert.equal(mansion.unlock_condition, 'day_3');
  assert.equal(isLocationUnlocked(mansion, stateAtDay(3)), true);

  const sebastian = dialogues.npc_sebastian_blackwood;
  const ledgerResponse = sebastian.topics.about_port.responses.find(
    response => response.gives_clue === 'port_cargo_ledger'
  );
  assert.ok(ledgerResponse, 'Sebastian must provide the mandatory port ledger in his port topic');
  assert.equal(ledgerResponse.type, 'important');

  const blocked = assessCampaignDay(stateAtDay(3));
  assert.equal(blocked.canAdvance, false);
  const ready = assessCampaignDay(stateAtDay(3, ['port_cargo_ledger']));
  assert.equal(ready.canAdvance, true);
});

test('day four retains two independent ways to satisfy its optional evidence gate', () => {
  const gameWithFilm = stateAtDay(4, ['anna_markus_items', 'belladonna_invoice', 'restored_film_frame']);
  const gameWithRadio = stateAtDay(4, ['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment']);
  assert.equal(assessCampaignDay(gameWithFilm).canAdvance, true);
  assert.equal(assessCampaignDay(gameWithRadio).canAdvance, true);
});
