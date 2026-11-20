import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('five-day campaign advances sequentially and opens only reached day flags', () => {
  const originalCampaign = GameState.campaign;
  const originalFlags = GameState.flags;
  const originalCurrentCase = GameState.currentCase;
  const originalSave = Storage.save;
  const writes = [];
  try {
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.currentCase = { id: 'case_001', clues: [
      'autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice',
      'matthews_letter', 'port_cargo_ledger', 'port_cargo_ledger_archive',
      'port_radio_fragment'
    ].map(id => ({ id })).concat([{ id: 'restored_film_frame', quality: 100 }]) };
    Storage.save = (key, value) => writes.push({ key, value: structuredClone(value) });

    assert.equal(GameState.hasFlag('day_2'), false);
    assert.equal(GameState.setCampaignDay(3), false, 'campaign cannot skip a day');
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 2);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), false);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.hasFlag('day_5'), true);
    assert.equal(GameState.completeCampaign('unknown'), false);
    assert.equal(GameState.completeCampaign('open_case'), true);
    assert.equal(GameState.campaign.completed, true);
    assert.equal(GameState.campaign.ending, 'open_case');
    assert.equal(GameState.completeCampaign('price_of_silence'), false, 'a completed ending cannot be overwritten');
    assert.equal(GameState.campaign.ending, 'open_case');
    assert.equal(GameState.advanceCampaignDay(), false);
    assert.ok(writes.length >= 5);
    assert.ok(writes.every(write => write.key === 'gameState' && write.value.campaign));
  } finally {
    GameState.campaign = originalCampaign;
    GameState.flags = originalFlags;
    GameState.currentCase = originalCurrentCase;
    Storage.save = originalSave;
  }
});

test('campaign state restores day and synchronizes legacy location flags', () => {
  const originalInspect = Storage.inspect;
  const original = {
    player: GameState.player,
    currentCase: GameState.currentCase,
    campaign: GameState.campaign,
    flags: GameState.flags,
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    socialGraph: GameState.socialGraph,
    knowledgeLedger: GameState.knowledgeLedger,
    npcDailyLife: GameState.npcDailyLife,
    miniGameProgress: GameState.miniGameProgress,
    notebook: GameState.notebook,
    settings: GameState.settings,
    saveStatus: GameState.saveStatus
  };
  const saved = {
    campaign: { caseId: 'case_001', day: 3, completed: false, ending: null },
    flags: { existing_choice: true },
    currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [] }
  };
  try {
    Storage.inspect = key => key === 'gameState' ? { status: 'valid', data: structuredClone(saved) } : { status: 'missing', data: null };
    GameState.init();
    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), true);
    assert.equal(GameState.hasFlag('day_4'), false);
    assert.equal(GameState.hasFlag('existing_choice'), true);
  } finally {
    Storage.inspect = originalInspect;
    Object.assign(GameState, original);
  }
});

test('a completed ending survives save loading and cannot be replaced by another outcome', () => {
  const originalInspect = Storage.inspect;
  const original = {
    player: GameState.player,
    currentCase: GameState.currentCase,
    campaign: GameState.campaign,
    flags: GameState.flags,
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    socialGraph: GameState.socialGraph,
    knowledgeLedger: GameState.knowledgeLedger,
    npcDailyLife: GameState.npcDailyLife,
    miniGameProgress: GameState.miniGameProgress,
    notebook: GameState.notebook,
    settings: GameState.settings,
    saveStatus: GameState.saveStatus
  };
  const saved = {
    campaign: { caseId: 'case_001', day: 5, completed: true, ending: 'price_of_silence' },
    flags: {},
    currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [] }
  };
  try {
    Storage.inspect = key => key === 'gameState' ? { status: 'valid', data: structuredClone(saved) } : { status: 'missing', data: null };
    GameState.init();
    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.campaign.completed, true);
    assert.equal(GameState.campaign.ending, 'price_of_silence');
    assert.equal(GameState.completeCampaign('open_case'), false);
    assert.equal(GameState.campaign.ending, 'price_of_silence');
  } finally {
    Storage.inspect = originalInspect;
    Object.assign(GameState, original);
  }
});


test('final state transition cannot bypass evidence requirements', () => {
  const originalCampaign = GameState.campaign;
  const originalCurrentCase = GameState.currentCase;
  const originalSave = Storage.save;
  try {
    GameState.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [] };
    Storage.save = () => true;

    assert.equal(GameState.completeCampaign('price_of_silence'), false,
      'even the negotiated ending requires the mandatory evidence dossier');
    assert.equal(GameState.completeCampaign('open_case'), false,
      'the public accusation cannot be committed without evidence');
    assert.equal(GameState.campaign.completed, false);
    assert.equal(GameState.campaign.ending, null);

    GameState.currentCase.clues = [
      'autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice',
      'matthews_letter', 'port_cargo_ledger', 'port_cargo_ledger_archive',
      'port_radio_fragment'
    ].map(id => ({ id })).concat([{ id: 'restored_film_frame', quality: 70 }]);

    assert.equal(GameState.completeCampaign('open_case'), false,
      'a partial frame cannot authorize the public accusation');
    assert.equal(GameState.completeCampaign('price_of_silence'), true,
      'the negotiated ending remains available with the complete but partial dossier');
    assert.equal(GameState.campaign.ending, 'price_of_silence');
  } finally {
    GameState.campaign = originalCampaign;
    GameState.currentCase = originalCurrentCase;
    Storage.save = originalSave;
  }
});
