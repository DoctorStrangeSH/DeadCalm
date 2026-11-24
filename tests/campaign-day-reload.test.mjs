import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';

function installStorage() {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; }
  };
  return {
    values,
    restore() {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else delete globalThis.localStorage;
    }
  };
}

const stateKeys = [
  'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
  'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
  'notebook', 'settings', 'saveBlocked', 'saveStatus'
];

function resetInMemoryState() {
  Object.assign(GameState, {
    player: { name: 'Пустая сессия', reputation: 0 },
    currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] },
    campaign: { caseId: 'case_001', day: 1, completed: false, ending: null },
    flags: {},
    relationships: {},
    npcMemory: {},
    socialGraph: { ties: [], events: [] },
    knowledgeLedger: { entries: [] },
    npcDailyLife: { schedules: [], occurrences: [] },
    miniGameProgress: {},
    notebook: [],
    settings: {},
    saveBlocked: false,
    saveStatus: 'missing'
  });
}

test('the complete five-day investigation survives a fresh-session reload after every day transition', () => {
  const previous = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const store = installStorage();
  const dayEvidence = {
    1: ['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details'],
    2: ['marta_source_envelope', 'matthews_letter'],
    3: ['port_cargo_ledger'],
    4: ['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment']
  };

  try {
    resetInMemoryState();
    assert.equal(GameState.init(), true);
    for (let day = 1; day <= 4; day += 1) {
      for (const id of dayEvidence[day]) {
        if (!GameState.hasClue(id)) GameState.currentCase.clues.push({ id, name: id });
      }

      assert.equal(
        GameState.advanceCampaignDayWithSummary(day),
        true,
        'day ' + day + ' should advance only after its evidence requirements are met'
      );
      assert.equal(GameState.campaign.day, day + 1);
      assert.equal(GameState.hasFlag('campaign_day_summary_pending_' + day), true);

      resetInMemoryState();
      assert.equal(GameState.init(), true, 'fresh app session should reload after day ' + day);
      assert.equal(GameState.campaign.day, day + 1);
      assert.equal(GameState.hasFlag('day_' + (day + 1)), true);
      assert.equal(GameState.hasFlag('campaign_day_summary_pending_' + day), true);
      for (let savedDay = 1; savedDay <= day; savedDay += 1) {
        for (const id of dayEvidence[savedDay]) {
          assert.equal(GameState.hasClue(id), true, id + ' must survive reload after day ' + day);
        }
      }
    }

    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.advanceCampaignDay(), false, 'the investigation must not create a sixth day');
  } finally {
    store.restore();
    Object.assign(GameState, previous);
  }
});
