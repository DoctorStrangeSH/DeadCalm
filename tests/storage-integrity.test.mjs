import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../src/js/core/storage.js';
import { GameState } from '../src/js/core/state.js';

class MemoryStorage {
  constructor(entries = []) { this.values = new Map(entries); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
}

test('storage inspection distinguishes missing, valid, malformed and non-object saves', () => {
  const originalStorage = globalThis.localStorage;
  const memory = new MemoryStorage();
  globalThis.localStorage = memory;
  try {
    assert.deepEqual(Storage.inspect('gameState'), { status: 'missing', data: null });

    memory.setItem('deadCalm_gameState', JSON.stringify({ campaign: { day: 3 } }));
    assert.deepEqual(Storage.inspect('gameState'), {
      status: 'valid',
      data: { campaign: { day: 3 } }
    });

    memory.setItem('deadCalm_gameState', '{broken');
    assert.equal(Storage.inspect('gameState').status, 'corrupt');
    assert.equal(Storage.load('gameState'), null);

    memory.setItem('deadCalm_gameState', 'null');
    assert.equal(Storage.inspect('gameState').status, 'corrupt');
    memory.setItem('deadCalm_gameState', '42');
    assert.equal(Storage.inspect('gameState').status, 'corrupt');
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('storage inspection reports inaccessible browser storage without treating it as an empty save', () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() { throw new Error('storage blocked'); }
  };
  try {
    assert.equal(Storage.inspect('gameState').status, 'unavailable');
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('a damaged save does not get silently replaced during initialization', () => {
  const originalInspect = Storage.inspect;
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
  const writes = [];
  try {
    Storage.inspect = () => ({ status: 'corrupt', data: null, error: new SyntaxError('bad JSON') });
    Storage.save = (...args) => writes.push(args);

    assert.equal(GameState.init(), 'corrupt');
    assert.equal(GameState.saveStatus, 'corrupt');
    assert.equal(GameState.campaign.day, 1);
    assert.deepEqual(GameState.currentCase.clues, []);
    assert.deepEqual(writes, [], 'initialization must not overwrite the damaged browser data');
  } finally {
    Storage.inspect = originalInspect;
    Storage.save = originalSave;
    Object.assign(GameState, original);
  }
});
