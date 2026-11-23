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


test('episode conclusions, review history, directives, and narrative choices survive a fresh save reload', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalLoad = Storage.load;
  const originalSave = Storage.save;
  let persisted = null;

  try {
    GameState.saveBlocked = false;
    GameState.player = { name: 'Джон Риверс', reputation: 71 };
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'reader_reconstructed_timeline' }, { id: 'reader_archive_crosscheck' }],
      suspects: [{ id: 'sebastian_blackwood', status: 'under_review' }],
      timeline: [{ id: 'harbor_evening', time: '20:58' }],
      hypotheses: [{ id: 'hyp_reader_01', status: 'probable', clueIds: ['reader_archive_crosscheck'], history: [{ status: 'possible' }, { status: 'probable' }] }]
    };
    GameState.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    GameState.flags = {
      day_2: true, day_3: true, day_4: true,
      court_reader_conclusions: [{
        version: 2,
        status: 'Промежуточное заключение',
        documentIds: ['reader_archive_crosscheck'],
        contradictionIds: [],
        unresolved: ['Проверить журнал порта']
      }],
      court_reader_conclusion_reviews: [{
        conclusionVersion: 2,
        status: 'Возвращено на уточнение',
        comments: ['Проверить недостающие материалы']
      }],
      court_reader_review_directives: [{
        conclusionVersion: 2,
        kind: 'additional_check',
        targetClueId: 'port_cargo_ledger'
      }],
      npc_anna_trust_consequence: 'kept_promise',
      npc_sebastian_critical_choice: 'refused_compromise'
    };
    GameState.relationships = { anna_holt: { trust: 76, met: true } };
    GameState.npcMemory = { anna_holt: { promises: [{ id: 'promise_01', status: 'kept' }], flags: { archive_shared: true } } };
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [{ id: 'note_01', text: 'Сверить портовый журнал с хронологией' }];
    GameState.settings = { musicVolume: 0.35, sfxVolume: 0.65, textSpeed: 'fast' };

    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
      return true;
    };
    Storage.load = key => key === 'gameState' && persisted ? structuredClone(persisted) : null;

    assert.equal(GameState.save(), true);
    const exported = GameState.export();
    exported.flags.court_reader_conclusions[0].documentIds.push('forged_export_mutation');
    assert.equal(GameState.flags.court_reader_conclusions[0].documentIds.includes('forged_export_mutation'), false);

    // Simulate a completely new application session using only the persisted payload.
    GameState.flags = {};
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    GameState.relationships = {};
    GameState.npcMemory = {};
    assert.equal(GameState.init(), true);

    assert.equal(GameState.campaign.day, 4);
    assert.equal(GameState.flags.court_reader_conclusions[0].version, 2);
    assert.deepEqual(GameState.flags.court_reader_conclusions[0].documentIds, ['reader_archive_crosscheck']);
    assert.equal(GameState.flags.court_reader_conclusion_reviews[0].status, 'Возвращено на уточнение');
    assert.equal(GameState.flags.court_reader_review_directives[0].targetClueId, 'port_cargo_ledger');
    assert.equal(GameState.flags.npc_anna_trust_consequence, 'kept_promise');
    assert.equal(GameState.flags.npc_sebastian_critical_choice, 'refused_compromise');
    assert.equal(GameState.relationships.anna_holt.trust, 76);
    assert.equal(GameState.npcMemory.anna_holt.promises[0].status, 'kept');
    assert.equal(GameState.currentCase.hypotheses[0].history.length, 2);
    assert.equal(GameState.notebook[0].text, 'Сверить портовый журнал с хронологией');
    assert.equal(GameState.settings.textSpeed, 'fast');
  } finally {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});


test('save import downgrades unverified confirmed labels and preserves a visible review trail', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalSave = Storage.save;
  let persisted = null;
  const payload = {
    schemaVersion: 1,
    player: { name: 'Джон Риверс', reputation: 50 },
    currentCase: {
      id: 'case_001', clues: [{ id: 'clue_a' }], suspects: [], timeline: [],
      hypotheses: [{
        id: 'hyp_imported', title: 'Версия из файла', reasoning: 'Непроверенное утверждение',
        status: 'confirmed', clueIds: ['clue_a'],
        history: [{ at: '2026-11-20T10:00:00.000Z', type: 'revised', status: 'confirmed',
          clueIds: ['clue_a'], title: 'Версия из файла', reasoning: 'Непроверенное утверждение' }]
      }]
    },
    campaign: { caseId: 'case_001', day: 2, completed: false, ending: null },
    flags: {}, relationships: {}, npcMemory: {},
    socialGraph: { ties: [], events: [] }, knowledgeLedger: { entries: [] },
    npcDailyLife: { schedules: [], occurrences: [] }, miniGameProgress: {},
    notebook: [], settings: { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' }
  };

  try {
    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
      return true;
    };
    assert.equal(GameState.importSave(payload), true);
    const imported = GameState.currentCase.hypotheses[0];
    assert.equal(imported.status, 'probable');
    assert.equal(imported.importReviewRequired, true);
    assert.equal(imported.history.at(-1).status, 'probable');
    assert.equal(imported.history.length, 2);
    assert.equal(persisted.currentCase.hypotheses[0].status, 'probable');

    const reviewed = GameState.reviseHypothesis(imported.id, {
      reasoning: 'Проверено повторно: подтверждающих независимых источников пока недостаточно.'
    });
    assert.equal(reviewed.status, 'probable');
    assert.equal(reviewed.importReviewRequired, false);
    assert.equal(reviewed.history.length, 3);
  } finally {
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});


test('new-game reset commits a complete fresh campaign and removes the previous backup', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalSave = Storage.save;
  const originalRemoveBackup = Storage.removeBackup;
  let persisted = null;
  let backupRemoved = false;

  try {
    GameState.player = { name: 'Джон Риверс', reputation: 91 };
    GameState.currentCase = { id: 'case_001', clues: [{ id: 'old_clue' }], suspects: [], timeline: [], hypotheses: [] };
    GameState.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    GameState.flags = { day_4: true, old_choice: true };
    GameState.relationships = { anna_holt: { trust: 90 } };
    GameState.npcMemory = { anna_holt: { met: true } };
    GameState.saveBlocked = true;
    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
      return true;
    };
    Storage.removeBackup = key => {
      assert.equal(key, 'gameState');
      backupRemoved = true;
      return true;
    };

    assert.equal(GameState.reset(), true);
    assert.equal(backupRemoved, true);
    assert.equal(persisted.campaign.day, 1);
    assert.deepEqual(persisted.currentCase.hypotheses, []);
    assert.deepEqual(persisted.currentCase.clues, []);
    assert.deepEqual(persisted.flags, {});
    assert.deepEqual(persisted.relationships, {});
    assert.deepEqual(persisted.npcMemory, {});
    assert.equal(GameState.saveBlocked, false);
  } finally {
    Storage.save = originalSave;
    Storage.removeBackup = originalRemoveBackup;
    Object.assign(GameState, original);
  }
});

test('new-game reset restores the previous in-memory campaign when no save can be staged', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalSave = Storage.save;
  const originalRemoveBackup = Storage.removeBackup;
  const previousPlayer = { name: 'Джон Риверс', reputation: 88 };
  const previousCase = { id: 'case_001', clues: [{ id: 'keep_this_clue' }], suspects: [], timeline: [], hypotheses: [] };

  try {
    GameState.player = previousPlayer;
    GameState.currentCase = previousCase;
    GameState.campaign = { caseId: 'case_001', day: 3, completed: false, ending: null };
    GameState.flags = { day_3: true, keep_choice: true };
    GameState.relationships = { anna_holt: { trust: 74 } };
    GameState.npcMemory = { anna_holt: { met: true } };
    GameState.saveBlocked = false;
    Storage.save = () => false;
    Storage.removeBackup = () => {
      throw new Error('backup must not be touched when reset save fails');
    };

    assert.equal(GameState.reset(), false);
    assert.equal(GameState.player, previousPlayer);
    assert.equal(GameState.currentCase, previousCase);
    assert.equal(GameState.campaign.day, 3);
    assert.deepEqual(GameState.flags, { day_3: true, keep_choice: true });
    assert.equal(GameState.relationships.anna_holt.trust, 74);
    assert.equal(GameState.npcMemory.anna_holt.met, true);
  } finally {
    Storage.save = originalSave;
    Storage.removeBackup = originalRemoveBackup;
    Object.assign(GameState, original);
  }
});


function installGameStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
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

function snapshotGameState() {
  return Object.fromEntries([
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ].map(key => [key, GameState[key]]));
}

test('GameState.init restores the complete campaign from backup when primary JSON is corrupt', () => {
  const original = snapshotGameState();
  const store = installGameStorage();
  try {
    const saved = GameState.export();
    saved.player = { name: 'Джон Риверс', reputation: 84 };
    saved.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    saved.currentCase.clues = [{ id: 'backup_clue', quality: 91 }];
    saved.relationships = { anna_holt: { trust: 82, met: true } };
    saved.npcMemory = { anna_holt: { met: true, promises: [{ id: 'promise_1', status: 'kept' }] } };
    saved.notebook = [{ id: 'backup_note', text: 'Проверить журнал порта' }];
    localStorage.setItem('deadCalm_gameState', '{corrupt-primary');
    localStorage.setItem('deadCalm_gameState__backup', JSON.stringify(saved));

    GameState.player = { name: 'Пустое состояние', reputation: 0 };
    assert.equal(GameState.init(), true);
    assert.equal(GameState.player.reputation, 84);
    assert.equal(GameState.campaign.day, 4);
    assert.equal(GameState.currentCase.clues[0].id, 'backup_clue');
    assert.equal(GameState.relationships.anna_holt.trust, 82);
    assert.equal(GameState.npcMemory.anna_holt.promises[0].status, 'kept');
    assert.equal(GameState.notebook[0].text, 'Проверить журнал порта');
    assert.equal(GameState.saveBlocked, false);
  } finally {
    store.restore();
    Object.assign(GameState, original);
  }
});

test('GameState.init restores the newest staged campaign and promotes it over an older primary', () => {
  const original = snapshotGameState();
  const store = installGameStorage();
  try {
    const older = GameState.export();
    older.campaign = { caseId: 'case_001', day: 2, completed: false, ending: null };
    const staged = GameState.export();
    staged.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
    staged.flags = { day_2: true, day_3: true, day_4: true, day_5: true, staged_choice: 'kept' };
    staged.currentCase.clues = [{ id: 'staged_clue' }];
    localStorage.setItem('deadCalm_gameState', JSON.stringify(older));
    localStorage.setItem('deadCalm_gameState__pending', JSON.stringify(staged));

    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    assert.equal(GameState.init(), true);
    assert.equal(GameState.campaign.day, 5);
    assert.equal(GameState.flags.staged_choice, 'kept');
    assert.equal(GameState.currentCase.clues[0].id, 'staged_clue');
    assert.equal(localStorage.getItem('deadCalm_gameState__pending'), null);
    assert.equal(JSON.parse(localStorage.getItem('deadCalm_gameState')).campaign.day, 5);
    const backupAfterInit = JSON.parse(localStorage.getItem('deadCalm_gameState__backup'));
    assert.ok([2, 5].includes(backupAfterInit.campaign.day));
  } finally {
    store.restore();
    Object.assign(GameState, original);
  }
});

test('GameState.init blocks writes when every persisted copy is corrupt and keeps the raw data', () => {
  const original = snapshotGameState();
  const store = installGameStorage({
    deadCalm_gameState: '{broken-primary',
    deadCalm_gameState__backup: '{broken-backup',
    deadCalm_gameState__pending: '{broken-pending'
  });
  try {
    const rawBefore = Object.fromEntries([...store.values.entries()]);
    assert.equal(GameState.init(), false);
    assert.equal(GameState.saveBlocked, true);
    assert.deepEqual(Object.fromEntries([...store.values.entries()]), rawBefore);
    assert.equal(GameState.save(), false);
  } finally {
    store.restore();
    Object.assign(GameState, original);
  }
});
