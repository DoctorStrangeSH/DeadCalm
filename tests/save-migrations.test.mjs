import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SAVE_VERSION, migrateSave } from '../src/js/core/save-migrations.js';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('legacy unversioned saves migrate once and preserve unknown fields', () => {
  const legacy = {
    player: { name: 'John Rivers', reputation: 72, customBadge: 'founder' },
    currentCase: {
      id: 'case_001',
      clues: [{ id: 'clue_legacy' }],
      suspects: [],
      timeline: [],
      customCaseField: { retained: true }
    },
    flags: { day_2: true },
    customTopLevel: { source: 'old-build' }
  };

  const first = migrateSave(legacy);
  assert.equal(first.status, 'ok');
  assert.equal(first.migrated, true);
  assert.equal(first.fromVersion, 0);
  assert.equal(first.toVersion, CURRENT_SAVE_VERSION);
  assert.equal(first.data.schemaVersion, CURRENT_SAVE_VERSION);
  assert.equal(first.data.currentCase.hypotheses.length, 0);
  assert.deepEqual(first.data.currentCase.customCaseField, { retained: true });
  assert.deepEqual(first.data.customTopLevel, { source: 'old-build' });
  assert.equal(first.data.player.customBadge, 'founder');

  const second = migrateSave(first.data);
  assert.equal(second.status, 'ok');
  assert.equal(second.migrated, false);
  assert.deepEqual(second.data, first.data);
});

test('legacy saves with missing optional collections receive safe defaults', () => {
  const result = migrateSave({ player: { name: 'John Rivers' }, currentCase: { id: 'case_001' } });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.data.currentCase.clues, []);
  assert.deepEqual(result.data.currentCase.suspects, []);
  assert.deepEqual(result.data.currentCase.timeline, []);
  assert.deepEqual(result.data.currentCase.hypotheses, []);
  assert.deepEqual(result.data.relationships, {});
  assert.deepEqual(result.data.notebook, []);
});

test('future, negative, and malformed schema versions are rejected without downgrade', () => {
  assert.equal(migrateSave({ schemaVersion: CURRENT_SAVE_VERSION + 1 }).status, 'unsupported');
  assert.equal(migrateSave({ schemaVersion: -1 }).status, 'invalid');
  assert.equal(migrateSave({ schemaVersion: '2' }).status, 'invalid');
  assert.equal(migrateSave([]).status, 'invalid');
  assert.equal(migrateSave(null).status, 'invalid');
});

test('GameState refuses to overwrite a save from a newer game version', () => {
  const originalLoad = Storage.load;
  const originalSave = Storage.save;
  const originalBlocked = GameState.saveBlocked;
  const futureSave = { schemaVersion: CURRENT_SAVE_VERSION + 1, customFutureField: { preserve: true } };
  let writes = 0;

  try {
    Storage.load = key => key === 'gameState' ? structuredClone(futureSave) : null;
    Storage.save = () => { writes += 1; return true; };

    assert.equal(GameState.init(), false);
    assert.equal(GameState.saveBlocked, true);
    assert.equal(GameState.save(), false);
    assert.equal(writes, 0);
  } finally {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    GameState.saveBlocked = originalBlocked;
  }
});

test('GameState writes the current schema version for all new saves', () => {
  const originalSave = Storage.save;
  const originalBlocked = GameState.saveBlocked;
  let saved = null;

  try {
    GameState.saveBlocked = false;
    Storage.save = (key, data) => {
      if (key === 'gameState') saved = structuredClone(data);
      return true;
    };
    assert.equal(GameState.save(), true);
    assert.equal(saved.schemaVersion, CURRENT_SAVE_VERSION);
  } finally {
    Storage.save = originalSave;
    GameState.saveBlocked = originalBlocked;
  }
});


test('GameState does not replace unrecoverable corrupt saves with a fresh campaign', () => {
  const originalLoad = Storage.load;
  const originalHasAnyRecord = Storage.hasAnyRecord;
  const originalSave = Storage.save;
  const originalBlocked = GameState.saveBlocked;
  let writes = 0;

  try {
    Storage.load = () => null;
    Storage.hasAnyRecord = () => true;
    Storage.save = () => { writes += 1; return true; };

    assert.equal(GameState.init(), false);
    assert.equal(GameState.saveBlocked, true);
    assert.equal(GameState.save(), false);
    assert.equal(writes, 0);
  } finally {
    Storage.load = originalLoad;
    Storage.hasAnyRecord = originalHasAnyRecord;
    Storage.save = originalSave;
    GameState.saveBlocked = originalBlocked;
  }
});


test('GameState automatically persists a migrated legacy save in the current schema', () => {
  const originalLoad = Storage.load;
  const originalSave = Storage.save;
  const originalState = {
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
    saveBlocked: GameState.saveBlocked
  };
  const legacy = {
    player: { name: 'John Rivers', reputation: 66 },
    currentCase: {
      id: 'case_001',
      clues: [{ id: 'old_clue', customEvidenceNote: 'do not drop' }],
      suspects: [],
      timeline: [],
      legacyCaseMetadata: { imported: true }
    },
    campaign: { caseId: 'case_001', day: 2, completed: false, ending: null },
    flags: { day_2: true }
  };
  let persisted = null;

  try {
    Storage.load = () => structuredClone(legacy);
    Storage.save = (key, data) => {
      if (key === 'gameState') persisted = structuredClone(data);
      return true;
    };

    assert.equal(GameState.init(), true);
    assert.equal(persisted.schemaVersion, CURRENT_SAVE_VERSION);
    assert.equal(persisted.currentCase.clues[0].customEvidenceNote, 'do not drop');
    assert.deepEqual(persisted.currentCase.legacyCaseMetadata, { imported: true });
    assert.deepEqual(persisted.relationships, {});
    assert.deepEqual(persisted.currentCase.hypotheses, []);
  } finally {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    Object.assign(GameState, originalState);
  }
});


test('partial legacy nested records receive defaults without losing supplied or unknown values', () => {
  const result = migrateSave({
    player: { reputation: 61, customTitle: 'Witness' },
    campaign: { day: 3, customChapter: 'harbor' },
    socialGraph: { ties: [{ id: 'tie_1' }], customGraphFlag: true },
    settings: { musicVolume: 0.2, customSetting: 'keep' }
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.player.name, 'Джон Риверс');
  assert.equal(result.data.player.reputation, 61);
  assert.equal(result.data.campaign.day, 3);
  assert.equal(result.data.campaign.completed, false);
  assert.equal(result.data.campaign.ending, null);
  assert.equal(result.data.campaign.customChapter, 'harbor');
  assert.deepEqual(result.data.socialGraph.ties, [{ id: 'tie_1' }]);
  assert.deepEqual(result.data.socialGraph.events, []);
  assert.equal(result.data.socialGraph.customGraphFlag, true);
  assert.equal(result.data.settings.musicVolume, 0.2);
  assert.equal(result.data.settings.sfxVolume, 0.7);
  assert.equal(result.data.settings.customSetting, 'keep');
});


test('save import persists canonical campaign flags and all investigation progress before reload', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const original = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const originalSave = Storage.save;
  const originalLoad = Storage.load;
  let persisted = null;

  const payload = {
    schemaVersion: CURRENT_SAVE_VERSION,
    player: { name: 'Джон Риверс', reputation: 77 },
    currentCase: {
      id: 'case_001',
      clues: [
        { id: 'restored_film_frame', quality: 100, source: 'Архивная плёнка' },
        { id: 'markus_watch_key', name: 'Латунный ключ' }
      ],
      suspects: [{ id: 'sebastian_blackwood', status: 'under_review' }],
      timeline: [{ id: 'harbor_meeting', time: '21:10' }],
      hypotheses: [{ id: 'hyp_01', clueIds: ['restored_film_frame'], history: [{ status: 'possible' }] }]
    },
    campaign: { caseId: 'case_001', day: 3, completed: false, ending: null },
    flags: { day_5: true, old_choice: true },
    relationships: { anna_holt: { trust: 73, met: true } },
    npcMemory: { anna_holt: { flags: { shared_archive: true }, promises: [{ id: 'p1', status: 'kept' }] } },
    socialGraph: { ties: [{ id: 'tie_01', fromNpcId: 'anna_holt', toNpcId: 'sebastian_blackwood', type: 'colleague', status: 'strained', basis: 'Shared archive records' }], events: [] },
    knowledgeLedger: { entries: [{ id: 'knowledge_01', npcId: 'anna_holt', claimRef: 'archive_record_01', sourceType: 'document', state: 'corroborated', provenance: 'Read the signed archive register' }] },
    npcDailyLife: { schedules: [{ id: 'schedule_01', npcId: 'anna_holt', activity: 'work', startMinute: 540, endMinute: 1020, days: [1, 2, 3, 4, 5], locationId: 'police_station', basis: 'Observed weekday shift' }], occurrences: [] },
    miniGameProgress: { 'film-restoration': { attempts: 3, bestOutcome: 'success', bestQuality: 100, lastOutcome: 'success', lastQuality: 100 } },
    notebook: [{ id: 'note_01', text: 'Проверить портовый журнал' }],
    settings: { musicVolume: 0.3, sfxVolume: 0.8, textSpeed: 'fast' }
  };

  try {
    Storage.save = (key, value) => {
      if (key === 'gameState') persisted = structuredClone(value);
      return true;
    };
    Storage.load = key => key === 'gameState' && persisted ? structuredClone(persisted) : null;

    assert.equal(GameState.importSave(payload), true);
    assert.equal(persisted.campaign.day, 3);
    assert.equal(persisted.flags.day_2, true);
    assert.equal(persisted.flags.day_3, true);
    assert.equal('day_4' in persisted.flags, false);
    assert.equal('day_5' in persisted.flags, false);
    assert.equal(persisted.flags.old_choice, true);

    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.hasFlag('day_3'), true);
    assert.equal(GameState.hasFlag('day_4'), false);
    assert.equal(GameState.getClue('restored_film_frame').quality, 100);
    assert.equal(GameState.relationships.anna_holt.trust, 73);
    assert.equal(GameState.npcMemory.anna_holt.promises[0].status, 'kept');
    assert.equal(GameState.socialGraph.ties[0].id, 'tie_01');
    assert.equal(GameState.knowledgeLedger.entries[0].id, 'knowledge_01');
    assert.equal(GameState.npcDailyLife.schedules[0].id, 'schedule_01');
    assert.equal(GameState.miniGameProgress['film-restoration'].bestQuality, 100);
    assert.equal(GameState.notebook[0].text, 'Проверить портовый журнал');
    assert.equal(GameState.settings.textSpeed, 'fast');

    assert.equal(GameState.init(), true, 'the imported file must be loadable as a fresh application session');
    assert.equal(GameState.campaign.day, 3);
    assert.equal(GameState.hasFlag('day_2'), true);
    assert.equal(GameState.hasFlag('day_3'), true);
    assert.equal(GameState.hasFlag('day_4'), false);
    assert.equal(GameState.getClue('restored_film_frame').quality, 100);
    assert.equal(GameState.relationships.anna_holt.trust, 73);
    assert.equal(GameState.npcMemory.anna_holt.promises[0].status, 'kept');
    assert.equal(GameState.miniGameProgress['film-restoration'].bestQuality, 100);
    assert.equal(GameState.notebook[0].text, 'Проверить портовый журнал');
  } finally {
    Storage.save = originalSave;
    Storage.load = originalLoad;
    Object.assign(GameState, original);
  }
});
