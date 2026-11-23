import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

const required = [
  'autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice',
  'matthews_letter', 'port_cargo_ledger', 'port_cargo_ledger_archive', 'markus_statement',
  'sebastian_delivery_statement', 'port_radio_fragment'
];

function withCampaign(day, extra = [], run) {
  const keys = ['player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress', 'notebook',
    'settings', 'saveBlocked'];
  const previousState = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const previousSave = Storage.save;
  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
    GameState.campaign = { caseId: 'case_001', day, completed: false, ending: null };
    GameState.currentCase = { id: 'case_001', clues: [...required, ...extra].map(id => ({
      id, name: id, quality: id === 'restored_film_frame' ? 100 : undefined
    })), suspects: [], timeline: [], hypotheses: [] };
    GameState.flags = {};
    return run();
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previousState);
  }
}

test('open-case ending requires the complete dossier and a high-quality restored film frame', () => {
  withCampaign(5, [], () => {
    assert.equal(GameState.completeCampaign('open_case'), false,
      'radio alone and missing film must not authorize full public disclosure');
    GameState.currentCase.clues.push({ id: 'restored_film_frame', name: 'Кадр', quality: 70 });
    assert.equal(GameState.completeCampaign('open_case'), false,
      'a partially restored film must not authorize full public disclosure');
    GameState.currentCase.clues.find(item => item.id === 'restored_film_frame').quality = 100;
    assert.equal(GameState.completeCampaign('open_case'), true);
    assert.equal(GameState.campaign.completed, true);
    assert.equal(GameState.campaign.ending, 'open_case');
  });
});

test('compromise ending requires every mandatory exhibit, an independent source and sealed confession', () => {
  withCampaign(5, [], () => {
    assert.equal(GameState.completeCampaign('price_of_silence'), false,
      'the sealed confession must exist as a case exhibit before the deal can be completed');
    GameState.currentCase.clues.push({ id: 'sebastian_sealed_confession', name: 'Запечатанное признание' });
    assert.equal(GameState.completeCampaign('price_of_silence'), true);
    assert.equal(GameState.campaign.completed, true);
    assert.equal(GameState.campaign.ending, 'price_of_silence');
  });
});

test('neither ending can be committed outside the fifth day or after a previous ending', () => {
  withCampaign(4, ['restored_film_frame'], () => {
    GameState.currentCase.clues.find(item => item.id === 'restored_film_frame').quality = 100;
    GameState.currentCase.clues.push({ id: 'sebastian_sealed_confession', name: 'Запечатанное признание' });
    assert.equal(GameState.completeCampaign('open_case'), false);
    assert.equal(GameState.completeCampaign('price_of_silence'), false);
    assert.equal(GameState.campaign.completed, false);
  });
});

test('failed persistence rolls back the finale without leaving a completed campaign in memory', () => {
  withCampaign(5, ['restored_film_frame'], () => {
    const film = GameState.currentCase.clues.find(item => item.id === 'restored_film_frame');
    film.quality = 100;
    Storage.save = () => false;
    assert.equal(GameState.completeCampaign('open_case'), false);
    assert.equal(GameState.campaign.completed, false);
    assert.equal(GameState.campaign.ending, null);
  });
});


test('strong evidence can unlock full disclosure after a partial film, without altering the compromise route', () => {
  withCampaign(5, ['restored_film_frame', 'sebastian_sealed_confession'], () => {
    const film = GameState.getClue('restored_film_frame');
    film.quality = 70;
    assert.equal(GameState.completeCampaign('open_case'), false,
      'a partial film must never be described as clear independent proof');
    assert.equal(GameState.campaign.completed, false);
    film.quality = 100;
    assert.equal(GameState.completeCampaign('open_case'), true,
      'replaying the film to a clear frame should permit public disclosure');
  });

  withCampaign(5, ['restored_film_frame', 'sebastian_sealed_confession'], () => {
    GameState.getClue('restored_film_frame').quality = 70;
    assert.equal(GameState.completeCampaign('price_of_silence'), true,
      'an imperfect film must not block the compromise ending when the dossier is complete');
  });
});

test('NPC trust penalties and critical choices cannot silently revoke already obtained mandatory evidence', () => {
  withCampaign(5, ['restored_film_frame', 'sebastian_sealed_confession'], () => {
    GameState.getClue('restored_film_frame').quality = 100;
    GameState.relationships = {
      npc_ray_morgan: { trust: 0, met: true },
      npc_marta_hayes: { trust: 0, met: true },
      npc_father_thomas: { trust: 0, met: true },
      npc_anna_holt: { trust: 0, met: true },
      npc_sebastian_blackwood: { trust: 0, met: true }
    };
    GameState.npcMemory = {
      npc_marta_hayes: { flags: { marta_source_pressured: true } },
      npc_anna_holt: { flags: { anna_box_taken: true } }
    };
    assert.equal(GameState.completeCampaign('open_case'), true);
  });
});
