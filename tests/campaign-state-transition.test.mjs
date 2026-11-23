import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('real GameState advances only through evidence-complete days and synchronizes location flags', () => {
  const keys = ['player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress', 'notebook',
    'settings', 'saveBlocked'];
  const previousState = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const previousSave = Storage.save;

  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };

    assert.equal(GameState.setCampaignDay(2), false, 'day one cannot be skipped while required evidence is missing');
    for (const id of ['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details']) {
      GameState.currentCase.clues.push({ id, name: id });
    }
    assert.equal(GameState.setCampaignDay(2), true);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), false);

    for (const id of ['marta_source_envelope', 'matthews_letter']) {
      GameState.currentCase.clues.push({ id, name: id });
    }
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), true);

    GameState.currentCase.clues.push({ id: 'port_cargo_ledger', name: 'port_cargo_ledger' });
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 4);
    assert.equal(GameState.hasFlag('day_4'), true);

    for (const id of ['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment']) {
      GameState.currentCase.clues.push({ id, name: id });
    }
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.hasFlag('day_5'), true);
    assert.equal(GameState.advanceCampaignDay(), false, 'the five-day campaign must not create a sixth day');
    assert.equal(GameState.setCampaignDay(3), false, 'campaign day cannot be moved backwards');
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previousState);
  }
});

test('failed day transition rolls back campaign day and every synchronized flag', () => {
  const keys = ['player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress', 'notebook',
    'settings', 'saveBlocked'];
  const previousState = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const previousSave = Storage.save;

  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = { custom_flag: true };
    GameState.currentCase = { id: 'case_001', clues: [
      ...['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details']
        .map(id => ({ id, name: id }))
    ], suspects: [], timeline: [], hypotheses: [] };

    Storage.save = () => false;
    assert.equal(GameState.setCampaignDay(2), false);
    assert.equal(GameState.campaign.day, 1);
    assert.deepEqual(GameState.flags, { custom_flag: true });
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previousState);
  }
});
