import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('five-day campaign advances sequentially and opens only reached day flags', () => {
  const originalCampaign = GameState.campaign;
  const originalFlags = GameState.flags;
  const originalSave = Storage.save;
  const writes = [];
  try {
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
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
    assert.equal(GameState.advanceCampaignDay(), false);
    assert.ok(writes.length >= 5);
    assert.ok(writes.every(write => write.key === 'gameState' && write.value.campaign));
  } finally {
    GameState.campaign = originalCampaign;
    GameState.flags = originalFlags;
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
