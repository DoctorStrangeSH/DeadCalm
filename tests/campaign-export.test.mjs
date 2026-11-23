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
        'matthews_letter', 'port_cargo_ledger', 'port_cargo_ledger_archive', 'markus_statement', 'sebastian_delivery_statement', 'port_radio_fragment',
        'sebastian_sealed_confession'
      ].map(id => ({ id }))
    };
    Storage.save = (key, value) => { writes.push({ key, value: structuredClone(value) }); return true; };

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


test('GameState export includes schema version and detached copies of every campaign subsystem', () => {
  const original = preserveState();
  try {
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'clue_export' }],
      suspects: [{ id: 'suspect_export' }],
      timeline: [{ id: 'timeline_export' }],
      hypotheses: [{ id: 'hypothesis_export', history: [{ status: 'possible' }] }]
    };
    GameState.flags = { day_4: true };
    GameState.relationships = { anna_holt: { trust: 64 } };
    GameState.notebook = [{ id: 'note_export', text: 'Evidence note' }];

    const exported = GameState.export();
    assert.equal(exported.schemaVersion, 1);
    assert.deepEqual(exported.currentCase, GameState.currentCase);
    assert.deepEqual(exported.flags, GameState.flags);
    assert.deepEqual(exported.relationships, GameState.relationships);
    exported.currentCase.hypotheses[0].history[0].status = 'changed';
    exported.flags.day_4 = false;
    exported.relationships.anna_holt.trust = 0;
    assert.equal(GameState.currentCase.hypotheses[0].history[0].status, 'possible');
    assert.equal(GameState.flags.day_4, true);
    assert.equal(GameState.relationships.anna_holt.trust, 64);
  } finally {
    Object.assign(GameState, original);
  }
});

test('GameState import commits to storage before changing the live campaign', () => {
  const original = preserveState();
  const originalSave = Storage.save;
  const incoming = {
    schemaVersion: 1,
    player: { name: 'Imported Detective', reputation: 88 },
    currentCase: { id: 'case_001', clues: [{ id: 'imported_clue' }], suspects: [], timeline: [], hypotheses: [] },
    campaign: { caseId: 'case_001', day: 4, completed: false, ending: null },
    flags: { imported_flag: true },
    relationships: { anna_holt: { trust: 72 } },
    npcMemory: {},
    socialGraph: { ties: [], events: [] },
    knowledgeLedger: { entries: [] },
    npcDailyLife: { schedules: [], occurrences: [] },
    miniGameProgress: {},
    notebook: [{ id: 'imported_note', text: 'Imported note' }],
    settings: { musicVolume: 0.3, sfxVolume: 0.5, textSpeed: 'fast' }
  };
  let stored = null;

  try {
    Storage.save = (key, value) => {
      assert.equal(key, 'gameState');
      stored = structuredClone(value);
      return true;
    };
    assert.equal(GameState.importSave(incoming), true);
    assert.deepEqual(stored, {
      ...incoming,
      flags: { imported_flag: true, day_2: true, day_3: true, day_4: true }
    });
    assert.equal(GameState.player.name, 'Imported Detective');
    assert.equal(GameState.campaign.day, 4);
    assert.equal(GameState.currentCase.clues[0].id, 'imported_clue');
    assert.equal(GameState.flags.imported_flag, true);
    assert.equal(GameState.notebook[0].id, 'imported_note');
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});

test('failed import storage write leaves the current in-memory campaign untouched', () => {
  const original = preserveState();
  const originalSave = Storage.save;
  const before = GameState.export();
  try {
    Storage.save = () => false;
    const incoming = {
      schemaVersion: 1,
      player: { name: 'Do not apply', reputation: 1 },
      currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] },
      campaign: { caseId: 'case_001', day: 1, completed: false, ending: null },
      flags: {}, relationships: {}, npcMemory: {}, socialGraph: { ties: [], events: [] },
      knowledgeLedger: { entries: [] }, npcDailyLife: { schedules: [], occurrences: [] },
      miniGameProgress: {}, notebook: [], settings: { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' }
    };
    assert.equal(GameState.importSave(incoming), false);
    assert.deepEqual(GameState.export(), before);
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});
