import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('five-day campaign advances sequentially only after each daily evidence gate', () => {
  const originalCampaign = GameState.campaign;
  const originalFlags = GameState.flags;
  const originalCurrentCase = GameState.currentCase;
  const originalSave = Storage.save;
  const writes = [];
  try {
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.currentCase = { ...originalCurrentCase, clues: [] };
    Storage.save = (key, value) => writes.push({ key, value: structuredClone(value) });
    const addClues = ids => {
      for (const id of ids) {
        if (!GameState.hasClue(id)) GameState.currentCase.clues.push({
          id,
          quality: id === 'restored_film_frame' ? 100 : undefined
        });
      }
    };

    assert.equal(GameState.hasFlag('day_2'), false);
    assert.equal(GameState.setCampaignDay(3), false, 'campaign cannot skip a day');
    assert.equal(GameState.setCampaignDay(2), false, 'direct day changes cannot bypass missing evidence');
    assert.equal(GameState.advanceCampaignDay(), false, 'day one cannot advance without its evidence');

    addClues(['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details']);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 2);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), false);

    addClues(['marta_source_envelope', 'matthews_letter']);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 3);

    addClues(['port_cargo_ledger']);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 4);

    addClues(['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment']);
    assert.equal(GameState.advanceCampaignDay(), true);
    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.hasFlag('day_5'), true);

    assert.equal(GameState.completeCampaign('unknown'), false);
    addClues(['markus_statement', 'restored_film_frame']);
    assert.equal(GameState.completeCampaign('open_case'), true);
    assert.equal(GameState.campaign.completed, true);
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
  const originalLoad = Storage.load;
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
    settings: GameState.settings
  };
  const saved = {
    campaign: { caseId: 'case_001', day: 3, completed: false, ending: null },
    flags: { existing_choice: true },
    currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [] }
  };
  try {
    Storage.load = key => key === 'gameState' ? structuredClone(saved) : null;
    GameState.init();
    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), true);
    assert.equal(GameState.hasFlag('day_4'), false);
    assert.equal(GameState.hasFlag('existing_choice'), true);
  } finally {
    Storage.load = originalLoad;
    Object.assign(GameState, original);
  }
});


test('finale completion enforces ending-specific evidence at the state boundary', () => {
  const original = {
    campaign: GameState.campaign,
    currentCase: GameState.currentCase
  };
  const originalSave = Storage.save;
  try {
    Storage.save = () => {};
    const baseEvidence = [
      'autopsy_report_01',
      'judge_appointment_card',
      'belladonna_invoice',
      'matthews_letter',
      'port_cargo_ledger',
      'markus_statement'
    ];
    const setFinaleState = clues => {
      GameState.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
      GameState.currentCase = { ...original.currentCase, clues };
    };

    setFinaleState([]);
    assert.equal(GameState.completeCampaign('price_of_silence'), false, 'no evidence must not unlock a finale');
    assert.equal(GameState.completeCampaign('open_case'), false, 'no evidence must not unlock a public accusation');

    setFinaleState([...baseEvidence, { id: 'port_radio_fragment' }].map(item => typeof item === 'string' ? { id: item } : item));
    assert.equal(GameState.completeCampaign('open_case'), false, 'radio evidence alone cannot support a public accusation');
    assert.equal(GameState.completeCampaign('price_of_silence'), false, 'the compromise ending must not bypass the sealed confession exhibit');
    GameState.currentCase.clues.push({ id: 'sebastian_sealed_confession' });
    assert.equal(GameState.completeCampaign('price_of_silence'), true, 'radio evidence, the complete case file and sealed confession support the compromise');

    setFinaleState([...baseEvidence.map(id => ({ id })), { id: 'restored_film_frame', quality: 70 }]);
    assert.equal(GameState.completeCampaign('open_case'), false, 'a partial frame cannot support a public accusation');

    setFinaleState([...baseEvidence.map(id => ({ id })), { id: 'restored_film_frame', quality: 100 }]);
    assert.equal(GameState.completeCampaign('open_case'), true, 'a fully identified frame plus the complete case file supports the public accusation');
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});


test('both finale choices persist through save import and cannot be switched afterwards', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalSave = Storage.save;
  const base = [
    'autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice',
    'matthews_letter', 'port_cargo_ledger', 'markus_statement'
  ];

  try {
    Storage.save = () => true;
    for (const scenario of [
      { ending: 'price_of_silence', extra: [{ id: 'port_radio_fragment' }, { id: 'sebastian_sealed_confession' }] },
      { ending: 'open_case', extra: [{ id: 'restored_film_frame', quality: 100 }] }
    ]) {
      GameState.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
      GameState.flags = {};
      GameState.currentCase = {
        id: 'case_001',
        clues: [...base.map(id => ({ id })), ...scenario.extra],
        suspects: [], timeline: [], hypotheses: []
      };

      assert.equal(GameState.completeCampaign(scenario.ending), true);
      const saved = GameState.export();
      assert.equal(saved.campaign.completed, true);
      assert.equal(saved.campaign.ending, scenario.ending);

      // Import the exact exported payload as if the game had been reopened.
      GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
      assert.equal(GameState.importSave(saved), true);
      assert.equal(GameState.campaign.completed, true);
      assert.equal(GameState.campaign.ending, scenario.ending);
      assert.equal(GameState.completeCampaign(scenario.ending === 'open_case' ? 'price_of_silence' : 'open_case'), false,
        'a completed campaign cannot silently switch its ending');
      assert.equal(GameState.campaign.ending, scenario.ending);
    }
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});
