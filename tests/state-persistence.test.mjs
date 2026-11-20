import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('GameState.init restores the saved campaign before scenes use it', () => {
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
    player: { name: 'John Rivers', reputation: 73 },
    campaign: { caseId: 'case_001', day: 1, completed: false, ending: null },
    currentCase: {
      id: 'case_001',
      clues: [{ id: 'clue_saved', name: 'Saved clue' }],
      suspects: [{ id: 'suspect_saved' }],
      timeline: [{ id: 'event_saved' }],
      hypotheses: [{ id: 'hypothesis_saved' }]
    },
    flags: { chapter_one_complete: true },
    relationships: { lydia: { trust: 81, met: true } },
    npcMemory: { lydia: { promises: ['kept_promise'] } },
    socialGraph: { ties: [], events: [] },
    knowledgeLedger: { entries: [] },
    npcDailyLife: { schedules: [], occurrences: [] },
    miniGameProgress: {
      'radio-tuning': {
        attempts: 2,
        bestOutcome: 'clear',
        bestQuality: 92,
        lastOutcome: 'fragmented',
        lastQuality: 61,
        completedAt: '1987-11-02T12:00:00.000Z'
      }
    },
    notebook: [{ id: 'note_saved', text: 'Saved note' }],
    settings: { musicVolume: 0.2, sfxVolume: 0.4, textSpeed: 'slow' }
  };

  try {
    Storage.inspect = key => key === 'gameState' ? { status: 'valid', data: structuredClone(saved) } : { status: 'missing', data: null };
    GameState.init();

    assert.deepEqual(GameState.player, saved.player);
    assert.deepEqual(GameState.currentCase, saved.currentCase);
    assert.deepEqual(GameState.campaign, saved.campaign);
    assert.deepEqual(GameState.flags, saved.flags);
    assert.deepEqual(GameState.relationships, saved.relationships);
    assert.deepEqual(GameState.npcMemory, saved.npcMemory);
    assert.deepEqual(GameState.notebook, saved.notebook);
    assert.deepEqual(GameState.settings, saved.settings);
    assert.equal(GameState.miniGameProgress['radio-tuning'].bestQuality, 92);
    assert.ok(GameState.currentCase.hypotheses.some(item => item.id === 'hypothesis_saved'));
  } finally {
    Storage.inspect = originalInspect;
    Object.assign(GameState, original);
  }
});

test('GameState.init keeps a clean initial state when no save exists', () => {
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
    settings: GameState.settings
  };

  try {
    Storage.inspect = () => ({ status: 'missing', data: null });
    GameState.player = { name: 'John Rivers', reputation: 50 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [] };
    GameState.flags = {};
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.notebook = [];
    GameState.miniGameProgress = {};
    GameState.init();
    assert.equal(GameState.currentCase.id, 'case_001');
    assert.deepEqual(GameState.currentCase.clues, []);
    assert.deepEqual(GameState.flags, {});
    assert.deepEqual(GameState.miniGameProgress, {});
  } finally {
    Storage.inspect = originalInspect;
    Object.assign(GameState, original);
  }
});


test('GameState.export includes campaign progression and the complete case record', () => {
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
  try {
    GameState.player = { name: 'Джон Риверс', reputation: 74 };
    GameState.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'restored_film_frame', quality: 100 }],
      suspects: [{ id: 'sebastian', status: 'under_investigation' }],
      timeline: [{ id: 'port_meeting', day: 4 }],
      hypotheses: [{ id: 'hyp_final', confidence: 'corroborated', sourceRefs: ['restored_film_frame'] }]
    };
    GameState.flags = { day_2: true, day_3: true, day_4: true };
    const backup = GameState.export();
    assert.deepEqual(backup.campaign, GameState.campaign);
    assert.deepEqual(backup.currentCase, GameState.currentCase);
    assert.ok(backup.currentCase.hypotheses.some(item => item.id === 'hyp_final'));
    assert.equal(backup.currentCase.clues[0].quality, 100);
    assert.deepEqual(backup.flags, GameState.flags);
    backup.currentCase.clues[0].quality = 0;
    backup.campaign.day = 1;
    assert.equal(GameState.currentCase.clues[0].quality, 100, 'export must not share nested references with live state');
    assert.equal(GameState.campaign.day, 4);
  } finally {
    Object.assign(GameState, original);
  }
});


test('GameState.save persists the same complete detached payload as export and reports write failure', () => {
  const originalSave = Storage.save;
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
  let written = null;
  try {
    GameState.player = { name: 'Джон Риверс', reputation: 63 };
    GameState.campaign = { caseId: 'case_001', day: 3, completed: false, ending: null };
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'port_radio_fragment', quality: 84 }],
      suspects: [{ id: 'sebastian' }],
      timeline: [{ id: 'port_departure' }],
      hypotheses: [{ id: 'hyp_port', sourceRefs: ['port_radio_fragment'] }]
    };
    GameState.flags = { day_2: true, day_3: true };
    GameState.relationships = { npc_marta_hayes: { trust: 67, met: true } };
    GameState.npcMemory = { npc_marta_hayes: { flags: { promised_help: true } } };
    GameState.socialGraph = { ties: [{ id: 'tie_1' }], events: [{ id: 'event_1' }] };
    GameState.knowledgeLedger = { entries: [{ id: 'knowledge_1' }] };
    GameState.npcDailyLife = { schedules: [{ id: 'schedule_1' }], occurrences: [{ id: 'occ_1' }] };
    GameState.miniGameProgress = { 'radio-tuning': { attempts: 2, bestOutcome: 'clear', bestQuality: 96, lastOutcome: 'clear', lastQuality: 96, completedAt: '1987-11-04T10:00:00.000Z' } };
    GameState.notebook = [{ id: 'note_1', text: 'Сверить портовую запись' }];
    GameState.settings = { musicVolume: 0.3, sfxVolume: 0.6, textSpeed: 'slow' };

    Storage.save = (key, payload) => { written = { key, payload: structuredClone(payload) }; return true; };
    assert.equal(GameState.save(), true);
    assert.equal(written.key, 'gameState');
    assert.deepEqual(written.payload, GameState.export());
    assert.deepEqual(written.payload.campaign, GameState.campaign);
    assert.deepEqual(written.payload.currentCase.hypotheses, GameState.currentCase.hypotheses);
    assert.deepEqual(written.payload.knowledgeLedger, GameState.knowledgeLedger);
    assert.deepEqual(written.payload.npcDailyLife, GameState.npcDailyLife);

    Storage.save = () => false;
    assert.equal(GameState.save(), false);
    assert.equal(GameState.saveStatus, 'unavailable');
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});
