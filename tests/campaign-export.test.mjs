import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

function preserveState() {
  return {
    campaign: GameState.campaign,
    player: GameState.player,
    currentCase: GameState.currentCase,
    flags: GameState.flags,
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    socialGraph: GameState.socialGraph,
    knowledgeLedger: GameState.knowledgeLedger,
    npcDailyLife: GameState.npcDailyLife,
    miniGameProgress: GameState.miniGameProgress,
    notebook: GameState.notebook,
    settings: GameState.settings
  };
}

test('GameState.export includes a detached copy of the campaign and its ending', () => {
  const original = preserveState();
  try {
    GameState.campaign = {
      caseId: 'case_001',
      day: 5,
      completed: true,
      ending: 'open_case'
    };

    const exported = GameState.export();
    assert.deepEqual(exported.campaign, GameState.campaign);
    assert.notEqual(exported.campaign, GameState.campaign);

    exported.campaign.ending = 'price_of_silence';
    assert.equal(GameState.campaign.ending, 'open_case');
  } finally {
    Object.assign(GameState, original);
  }
});

test('completing either finale persists the exact ending in the save payload', () => {
  const original = preserveState();
  const originalSave = Storage.save;
  const writes = [];

  try {
    GameState.campaign = {
      caseId: 'case_001',
      day: 5,
      completed: false,
      ending: null
    };
    GameState.currentCase = {
      ...GameState.currentCase,
      clues: [
        'autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice',
        'matthews_letter', 'port_cargo_ledger', 'markus_statement', 'port_radio_fragment'
      ].map(id => ({ id }))
    };
    Storage.save = (key, value) => writes.push({ key, value: structuredClone(value) });

    assert.equal(GameState.completeCampaign('price_of_silence'), true);
    assert.equal(GameState.campaign.completed, true);
    assert.equal(GameState.campaign.ending, 'price_of_silence');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].value.campaign, {
      caseId: 'case_001',
      day: 5,
      completed: true,
      ending: 'price_of_silence'
    });

    assert.equal(GameState.completeCampaign('open_case'), false, 'a completed campaign cannot be overwritten');
    assert.equal(writes.length, 1);
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});

test('GameState.init restores both saved finale outcomes after reload', () => {
  const original = preserveState();
  const originalLoad = Storage.load;
  try {
    for (const ending of ['open_case', 'price_of_silence']) {
      const saved = {
        player: { name: 'Джон Риверс', reputation: 50 },
        currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [] },
        campaign: { caseId: 'case_001', day: 5, completed: true, ending },
        flags: { day_2: true, day_3: true, day_4: true, day_5: true }
      };
      Storage.load = key => key === 'gameState' ? structuredClone(saved) : null;
      GameState.init();
      assert.deepEqual(GameState.campaign, saved.campaign);
    }
  } finally {
    Storage.load = originalLoad;
    Object.assign(GameState, original);
  }
});
