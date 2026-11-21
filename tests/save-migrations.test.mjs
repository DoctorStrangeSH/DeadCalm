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
