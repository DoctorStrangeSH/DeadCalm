import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { recordCase001MiniGameEvidence } from '../src/js/systems/case-001-evidence.js';

test('GameState.init restores the saved campaign before scenes use it', () => {
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
    Storage.load = key => key === 'gameState' ? structuredClone(saved) : null;
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
    Storage.load = originalLoad;
    Object.assign(GameState, original);
  }
});

test('GameState.init keeps a clean initial state when no save exists', () => {
  const originalLoad = Storage.load;
  const originalHasAnyRecord = Storage.hasAnyRecord;
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
    Storage.load = () => null;
    Storage.hasAnyRecord = () => false;
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
    Storage.load = originalLoad;
    Storage.hasAnyRecord = originalHasAnyRecord;
    Object.assign(GameState, original);
  }
});


test('GameState.init clamps invalid saved settings and falls back to supported text speed', () => {
  const originalLoad = Storage.load;
  const originalSettings = GameState.settings;
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
    notebook: GameState.notebook
  };

  try {
    Storage.load = () => ({
      settings: { musicVolume: 4, sfxVolume: -2, textSpeed: 'warp-speed' }
    });
    GameState.init();
    assert.deepEqual(GameState.settings, {
      musicVolume: 1,
      sfxVolume: 0,
      textSpeed: 'normal'
    });
  } finally {
    Storage.load = originalLoad;
    Object.assign(GameState, original);
    GameState.settings = originalSettings;
  }
});


test('partial mini-game evidence survives reload and upgrades in place after a stronger replay', () => {
  const originalLoad = Storage.load;
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
    settings: GameState.settings
  };
  let persisted = null;

  try {
    GameState.player = { name: 'Джон Риверс', reputation: 50 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [] };
    GameState.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    GameState.flags = {};
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [];
    GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };

    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
    };
    Storage.load = key => key === 'gameState' && persisted ? structuredClone(persisted) : null;

    GameState.recordMiniGameResult({
      type: 'radio-tuning', outcome: 'fragmented', quality: 78
    }, '1987-11-04T18:00:00.000Z');
    assert.equal(recordCase001MiniGameEvidence(GameState, 'radio-tuning', {
      outcome: 'fragmented', quality: 78
    }), true);
    assert.equal(persisted.currentCase.clues.length, 1);
    assert.equal(persisted.currentCase.clues[0].quality, 78);

    GameState.recordMiniGameResult({
      type: 'radio-tuning', outcome: 'clear', quality: 96
    }, '1987-11-04T18:10:00.000Z');
    assert.equal(recordCase001MiniGameEvidence(GameState, 'radio-tuning', {
      outcome: 'clear', quality: 96
    }), true);
    assert.equal(GameState.currentCase.clues.length, 1);
    assert.equal(GameState.currentCase.clues[0].quality, 96);

    GameState.init();

    assert.equal(GameState.currentCase.clues.length, 1,
      'replaying must upgrade the existing clue rather than create a duplicate');
    assert.equal(GameState.currentCase.clues[0].quality, 96);
    assert.match(GameState.currentCase.clues[0].description, /Приём чистый/);
    assert.equal(GameState.miniGameProgress['radio-tuning'].attempts, 2);
    assert.equal(GameState.miniGameProgress['radio-tuning'].bestOutcome, 'clear');
    assert.equal(GameState.miniGameProgress['radio-tuning'].bestQuality, 96);
    assert.equal(GameState.miniGameProgress['radio-tuning'].lastOutcome, 'clear');
  } finally {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});


test('full investigation state survives save/load and exports nested hypotheses', () => {
  const originalLoad = Storage.load;
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
    settings: GameState.settings
  };
  let persisted = null;

  try {
    GameState.player = { name: 'Джон Риверс', reputation: 64 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    GameState.campaign = { caseId: 'case_001', day: 3, completed: false, ending: null };
    GameState.flags = { anna_spoke_about_markus: true, day_2: true, day_3: true };
    GameState.relationships = {};
    GameState.npcMemory = {
      anna_holt: {
        promises: [{ id: 'promise_anna_01', status: 'kept', subject: 'Передать вещи Маркуса' }],
        lastConversation: 'После разговора в доме Holt'
      }
    };
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [{ id: 'note_timeline', text: 'Звонок из суда был раньше указанного времени.' }];
    GameState.settings = { musicVolume: 0.4, sfxVolume: 0.6, textSpeed: 'fast' };

    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
    };
    Storage.load = key => key === 'gameState' && persisted ? structuredClone(persisted) : null;

    GameState.addClue({
      id: 'court_switchboard_log',
      name: 'Журнал телефонной станции',
      category: 'document',
      description: 'В журнале отмечен звонок из суда.',
      source: 'Первичный журнал телефонной станции',
      location: 'Полицейский участок',
      day: 1,
      connections_to: ['judge_appointment_card']
    });
    const hypothesis = GameState.addHypothesis({
      title: 'Время звонка было изменено',
      reasoning: 'Запись в журнале не совпадает с временем в первичном рапорте.',
      clueIds: ['court_switchboard_log']
    });
    GameState.reviseHypothesis(hypothesis.id, {
      status: 'probable',
      reasoning: 'Журнал подтверждает расхождение, но пока не устанавливает, кто изменил рапорт.'
    });

    GameState.updateRelationship('anna_holt', 18);
    GameState.recordSocialTie({
      fromNpcId: 'anna_holt', toNpcId: 'markus_holt',
      type: 'family', status: 'strained',
      basis: 'Анна передала детективу вещи брата после долгого молчания.',
      sourceRefs: ['anna_holt_interview']
    });
    GameState.recordSocialEvent({
      fromNpcId: 'anna_holt', toNpcId: 'markus_holt',
      description: 'Анна передала вещи Маркуса детективу.',
      sourceRefs: ['anna_holt_interview']
    });
    const knowledge = GameState.recordNpcKnowledge({
      id: 'knowledge_anna_court',
      npcId: 'anna_holt',
      claimRef: 'claim_court_report_altered',
      sourceType: 'interview',
      provenance: 'Анна рассказала, что брат просил её хранить бумаги.',
      sourceRefs: ['anna_holt_interview']
    });
    GameState.updateNpcKnowledgeState(
      knowledge.id, 'disputed', 'Позднее найденный документ противоречит части рассказа.'
    );
    GameState.setNpcSchedule({
      id: 'schedule_anna_home',
      npcId: 'anna_holt',
      activity: 'private',
      startMinute: 1080,
      endMinute: 1320,
      days: [1, 2, 3, 4, 5, 6, 7],
      locationId: 'holt_house',
      basis: 'Авторское расписание персонажа.',
      sourceRefs: ['character_dossier_anna']
    });
    GameState.recordNpcOccurrence({
      id: 'occurrence_anna_home',
      npcId: 'anna_holt',
      scheduleId: 'schedule_anna_home',
      day: 3,
      minute: 1200,
      locationId: 'holt_house',
      description: 'Анна вернулась домой после визита в участок.',
      basis: 'Игрок лично встретил Анну у дома.',
      sourceRefs: ['player_observation_anna']
    });

    GameState.save();
    const exported = GameState.export();
    assert.equal(exported.currentCase.hypotheses.length, 1);
    assert.equal(exported.currentCase.hypotheses[0].history.length, 2);
    exported.currentCase.hypotheses[0].history[0].reasoning = 'mutated export';
    assert.notEqual(GameState.currentCase.hypotheses[0].history[0].reasoning, 'mutated export');

    GameState.init();

    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.flags.anna_spoke_about_markus, true);
    assert.equal(GameState.flags.day_3, true);
    assert.equal(GameState.currentCase.clues.length, 1);
    assert.equal(GameState.currentCase.hypotheses.length, 1);
    assert.equal(GameState.currentCase.hypotheses[0].status, 'probable');
    assert.equal(GameState.currentCase.hypotheses[0].history.length, 2);
    assert.equal(GameState.relationships.anna_holt.trust, 68);
    assert.equal(GameState.npcMemory.anna_holt.promises[0].status, 'kept');
    assert.equal(GameState.socialGraph.ties[0].status, 'strained');
    assert.equal(GameState.socialGraph.events[0].description, 'Анна передала вещи Маркуса детективу.');
    assert.equal(GameState.knowledgeLedger.entries[0].state, 'disputed');
    assert.equal(GameState.knowledgeLedger.entries[0].stateHistory.length, 1);
    assert.equal(GameState.npcDailyLife.schedules[0].locationId, 'holt_house');
    assert.equal(GameState.npcDailyLife.occurrences[0].id, 'occurrence_anna_home');
    assert.equal(GameState.notebook[0].id, 'note_timeline');
    assert.equal(GameState.settings.textSpeed, 'fast');
  } finally {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});
