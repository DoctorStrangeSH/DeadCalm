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


test('mini-game evidence quality is saved atomically and failed upgrades roll back', () => {
  const previousCase = GameState.currentCase;
  const previousSave = GameState.save;
  let writes = 0;

  try {
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [] };
    GameState.save = () => { writes++; return true; };

    assert.equal(recordCase001MiniGameEvidence(GameState, 'film-restoration', {
      outcome: 'partial', quality: 78
    }), true);
    assert.equal(writes, 1, 'new clue and its quality must be committed in one save');
    assert.equal(GameState.currentCase.clues.length, 1);
    assert.equal(GameState.currentCase.clues[0].quality, 78);

    const originalDescription = GameState.currentCase.clues[0].description;
    GameState.save = () => false;
    assert.equal(recordCase001MiniGameEvidence(GameState, 'film-restoration', {
      outcome: 'success', quality: 100
    }), false, 'a failed quality upgrade must not report success');
    assert.equal(GameState.currentCase.clues[0].quality, 78,
      'failed upgrade must restore the previous quality');
    assert.equal(GameState.currentCase.clues[0].description, originalDescription,
      'failed upgrade must restore the previous evidence description');
  } finally {
    GameState.currentCase = previousCase;
    GameState.save = previousSave;
  }
});


test('both campaign endings roll back when the final campaign save fails', () => {
  const previous = {
    currentCase: GameState.currentCase,
    campaign: GameState.campaign,
    save: GameState.save
  };
  const required = [
    'autopsy_report_01',
    'judge_appointment_card',
    'belladonna_invoice',
    'matthews_letter',
    'port_cargo_ledger',
    'port_cargo_ledger_archive',
    'markus_statement',
    'sebastian_delivery_statement'
  ];

  try {
    for (const ending of ['open_case', 'price_of_silence']) {
      GameState.currentCase = {
        id: 'case_001',
        clues: [
          ...required.map(id => ({ id })),
          ...(ending === 'open_case'
            ? [{ id: 'restored_film_frame', quality: 100 }]
            : [{ id: 'port_radio_fragment' }, { id: 'sebastian_sealed_confession' }])
        ],
        suspects: [],
        timeline: []
      };
      GameState.campaign = {
        caseId: 'case_001', day: 5, completed: false, ending: null
      };
      GameState.save = () => false;

      assert.equal(GameState.completeCampaign(ending), false,
        ending + ' must not complete when its final save fails');
      assert.equal(GameState.campaign.completed, false);
      assert.equal(GameState.campaign.ending, null);
    }
  } finally {
    GameState.currentCase = previous.currentCase;
    GameState.campaign = previous.campaign;
    GameState.save = previous.save;
  }
});


test('both completed campaign endings survive a fresh-session save reload', () => {
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
    saveBlocked: GameState.saveBlocked,
    saveStatus: GameState.saveStatus
  };
  const storageMethods = {
    save: Storage.save,
    load: Storage.load,
    inspect: Storage.inspect
  };
  const requiredClues = [
    'autopsy_report_01',
    'judge_appointment_card',
    'belladonna_invoice',
    'matthews_letter',
    'port_cargo_ledger',
    'port_cargo_ledger_archive',
    'markus_statement',
    'sebastian_delivery_statement'
  ];
  let persisted = null;

  try {
    Storage.save = (key, payload) => {
      if (key === 'gameState') persisted = structuredClone(payload);
      return true;
    };
    Storage.load = key => key === 'gameState' && persisted ? structuredClone(persisted) : null;
    Storage.inspect = key => key === 'gameState'
      ? { status: persisted ? 'valid' : 'missing', data: persisted ? structuredClone(persisted) : null }
      : { status: 'missing', data: null };

    for (const ending of ['open_case', 'price_of_silence']) {
      GameState.saveBlocked = false;
      GameState.currentCase = {
        id: 'case_001',
        clues: [
          ...requiredClues.map(id => ({ id })),
          ...(ending === 'open_case'
            ? [{ id: 'restored_film_frame', quality: 100 }]
            : [{ id: 'port_radio_fragment' }, { id: 'sebastian_sealed_confession' }])
        ],
        suspects: [],
        timeline: [],
        hypotheses: []
      };
      GameState.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
      GameState.flags = { day_2: true, day_3: true, day_4: true, day_5: true };

      assert.equal(GameState.completeCampaign(ending), true, ending + ' should commit');
      assert.equal(persisted.campaign.completed, true);
      assert.equal(persisted.campaign.ending, ending);

      GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
      GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
      assert.equal(GameState.init(), true, 'a fresh app session should restore ' + ending);
      assert.equal(GameState.campaign.day, 5);
      assert.equal(GameState.campaign.completed, true);
      assert.equal(GameState.campaign.ending, ending);
      assert.equal(GameState.flags.day_5, true);
      assert.equal(GameState.currentCase.clues.some(clue => clue.id === 'sebastian_sealed_confession'),
        ending === 'price_of_silence');
    }
  } finally {
    Object.assign(Storage, storageMethods);
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
      assert.equal(GameState.knowledgeLedger.entries[0].provenance, 'Себастьян оспаривает детали передачи флакона.');
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


test('campaign day and pending recap are committed atomically or both roll back', () => {
  const original = snapshotGameState();
  const originalSave = GameState.save;
  const store = installGameStorage();
  const required = [
    'autopsy_report_01',
    'court_switchboard_log',
    'judge_appointment_card',
    'old_case_details'
  ];

  try {
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.currentCase = { id: 'case_001', clues: required.map(id => ({ id })), suspects: [], timeline: [], hypotheses: [] };
    GameState.flags = {};
    GameState.save = () => false;

    assert.equal(GameState.advanceCampaignDayWithSummary(1), false);
    assert.equal(GameState.campaign.day, 1);
    assert.equal(GameState.hasFlag('day_2'), false);
    assert.equal(GameState.hasFlag('campaign_day_summary_pending_1'), false);

    GameState.save = originalSave;
    assert.equal(GameState.advanceCampaignDayWithSummary(1), true);
    assert.equal(GameState.campaign.day, 2);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('campaign_day_summary_pending_1'), true);

    const persisted = Storage.load('gameState');
    assert.equal(persisted.campaign.day, 2);
    assert.equal(persisted.flags.day_2, true);
    assert.equal(persisted.flags.campaign_day_summary_pending_1, true);
  } finally {
    GameState.save = originalSave;
    store.restore();
    Object.assign(GameState, original);
  }
});


test('clearing a campaign recap flag rolls back when storage rejects dismissal', () => {
  const previousFlags = GameState.flags;
  const previousSave = GameState.save;
  try {
    GameState.flags = { campaign_day_summary_pending_1: true };
    GameState.save = () => false;
    assert.equal(GameState.clearFlag('campaign_day_summary_pending_1'), false);
    assert.equal(GameState.hasFlag('campaign_day_summary_pending_1'), true,
      'a failed dismissal must leave the recap pending');

    GameState.save = () => true;
    assert.equal(GameState.clearFlag('campaign_day_summary_pending_1'), true);
    assert.equal(GameState.hasFlag('campaign_day_summary_pending_1'), false);
  } finally {
    GameState.flags = previousFlags;
    GameState.save = previousSave;
  }
});


test('real storage adapter restores both completed endings and the full investigation after a fresh session', () => {
  const original = snapshotGameState();
  const store = installGameStorage();

  const requiredClues = [
    'autopsy_report_01',
    'judge_appointment_card',
    'belladonna_invoice',
    'matthews_letter',
    'port_cargo_ledger',
    'port_cargo_ledger_archive',
    'markus_statement',
    'sebastian_delivery_statement'
  ];

  try {
    for (const ending of ['open_case', 'price_of_silence']) {
      store.values.clear();
      const endingClues = ending === 'open_case'
        ? [{ id: 'restored_film_frame', quality: 100, source: 'Плёнка Маркуса' }]
        : [
            { id: 'port_radio_fragment', quality: 82, source: 'Портовый радиоканал' },
            { id: 'sebastian_sealed_confession', source: 'Запечатанное признание Себастьяна' }
          ];

      GameState.saveBlocked = false;
      GameState.player = { name: 'Джон Риверс', reputation: 73 };
      GameState.currentCase = {
        id: 'case_001',
        clues: [...requiredClues.map(id => ({ id, source: 'Проверенный источник' })), ...endingClues],
        suspects: [{ id: 'sebastian_blackwood', status: 'under_investigation' }],
        timeline: [{ id: 'meeting_1967', day: 5, verified: true }],
        hypotheses: [{ id: 'hyp_final', status: 'probable', clueIds: ['port_cargo_ledger'] }]
      };
      GameState.campaign = { caseId: 'case_001', day: 5, completed: false, ending: null };
      GameState.flags = { day_2: true, day_3: true, day_4: true, day_5: true, final_choice_seen: true };
      GameState.relationships = { npc_sebastian_blackwood: { trust: 12, met: true } };
      GameState.npcMemory = {
        npc_sebastian_blackwood: {
          met: true,
          promises: [{ id: 'promise_final', status: 'broken' }],
          flags: { sealed_confession_offered: true }
        }
      };
      GameState.socialGraph = { ties: [{ id: 'tie_1', fromNpcId: 'anna_holt', toNpcId: 'markus_holt', type: 'family', status: 'strained', basis: 'Анна передала вещи брата детективу.' }], events: [] };
      GameState.knowledgeLedger = { entries: [{ id: 'claim_final', npcId: 'npc_sebastian_blackwood', claimRef: 'claim_poison_delivery', sourceType: 'interview', state: 'disputed', provenance: 'Себастьян оспаривает детали передачи флакона.', sourceRefs: ['sebastian_delivery_statement'], stateHistory: [] }] };
      GameState.npcDailyLife = { schedules: [{ id: 'schedule_final', npcId: 'npc_sebastian_blackwood', activity: 'private', startMinute: 0, endMinute: 1439, days: [1, 2, 3, 4, 5, 6, 7], locationId: 'blackwood_mansion', basis: 'Авторское расписание персонажа.' }], occurrences: [{ id: 'final_observation', npcId: 'npc_sebastian_blackwood', scheduleId: 'schedule_final', day: 5, minute: 600, locationId: 'blackwood_mansion', description: 'Себастьян находился в особняке.', basis: 'Наблюдение игрока.' }] };
      GameState.miniGameProgress = { 'film-restoration': { attempts: 2, bestOutcome: 'success', bestQuality: ending === 'open_case' ? 100 : 72, lastOutcome: 'success', lastQuality: ending === 'open_case' ? 100 : 72, completedAt: '2026-11-24T08:00:00.000Z' } };
      GameState.notebook = [{ id: 'final_note', text: 'Сверить показания и архивный экземпляр.' }];
      GameState.settings = { musicVolume: 0.35, sfxVolume: 0.65, textSpeed: 'fast' };

      assert.equal(GameState.completeCampaign(ending), true, ending + ' should save through real Storage');
      assert.ok(store.values.has('deadCalm_gameState'));

      // Simulate closing the app: discard every in-memory campaign object.
      Object.assign(GameState, {
        player: { name: 'Пустая сессия', reputation: 0 },
        currentCase: { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] },
        campaign: { caseId: 'case_001', day: 1, completed: false, ending: null },
        flags: {},
        relationships: {},
        npcMemory: {},
        socialGraph: { ties: [], events: [] },
        knowledgeLedger: { entries: [] },
        npcDailyLife: { schedules: [], occurrences: [] },
        miniGameProgress: {},
        notebook: [],
        settings: {},
        saveBlocked: false
      });

      assert.equal(GameState.init(), true, 'fresh session should load ' + ending);
      assert.equal(GameState.campaign.day, 5);
      assert.equal(GameState.campaign.completed, true);
      assert.equal(GameState.campaign.ending, ending);
      assert.equal(GameState.currentCase.clues.length, requiredClues.length + endingClues.length);
      assert.equal(GameState.currentCase.clues.find(clue => clue.id === endingClues[0].id).source, endingClues[0].source);
      assert.equal(GameState.relationships.npc_sebastian_blackwood.trust, 12);
      assert.equal(GameState.npcMemory.npc_sebastian_blackwood.promises[0].status, 'broken');
      assert.equal(GameState.npcMemory.npc_sebastian_blackwood.flags.sealed_confession_offered, true);
      assert.equal(GameState.socialGraph.ties[0].id, 'tie_1');
      assert.equal(GameState.socialGraph.ties[0].basis, 'Анна передала вещи брата детективу.');
      assert.equal(GameState.knowledgeLedger.entries[0].state, 'disputed');
      assert.equal(GameState.npcDailyLife.occurrences[0].id, 'final_observation');
      assert.equal(GameState.npcDailyLife.schedules[0].id, 'schedule_final');
      assert.equal(GameState.miniGameProgress['film-restoration'].bestQuality, ending === 'open_case' ? 100 : 72);
      assert.equal(GameState.notebook[0].id, 'final_note');
      assert.equal(GameState.settings.textSpeed, 'fast');
      assert.equal(GameState.flags.day_5, true);
    }
  } finally {
    store.restore();
    Object.assign(GameState, original);
  }
});

test('real storage reset cannot resurrect the previous campaign through a backup after restart', () => {
  const original = snapshotGameState();
  const store = installGameStorage();
  try {
    GameState.saveBlocked = false;
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'old_campaign_secret' }],
      suspects: [],
      timeline: [],
      hypotheses: []
    };
    GameState.campaign = { caseId: 'case_001', day: 4, completed: false, ending: null };
    GameState.flags = { day_2: true, day_3: true, day_4: true, old_choice: true };
    assert.equal(GameState.save(), true);
    assert.ok(store.values.has('deadCalm_gameState'));

    assert.equal(GameState.reset(), true);
    assert.equal(store.values.has('deadCalm_gameState__backup'), false);
    assert.equal(JSON.parse(store.values.get('deadCalm_gameState')).campaign.day, 1);

    GameState.campaign = { caseId: 'case_001', day: 5, completed: true, ending: 'open_case' };
    GameState.currentCase.clues.push({ id: 'unsaved_memory_only' });
    assert.equal(GameState.init(), true);
    assert.equal(GameState.campaign.day, 1);
    assert.equal(GameState.campaign.completed, false);
    assert.deepEqual(GameState.currentCase.clues, []);
    assert.deepEqual(GameState.flags, {});
  } finally {
    store.restore();
    Object.assign(GameState, original);
  }
});
