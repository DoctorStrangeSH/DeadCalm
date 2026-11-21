import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../src/js/core/storage.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
}

test('save writes a primary record and keeps the previous valid save as backup', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    assert.equal(Storage.save('gameState', { day: 1 }), true);
    assert.equal(Storage.save('gameState', { day: 2 }), true);
    assert.deepEqual(Storage.load('gameState'), { day: 2 });
    assert.deepEqual(JSON.parse(localStorage.getItem('deadCalm_gameState__backup')), { day: 1 });
  } finally {
    globalThis.localStorage = previous;
  }
});

test('corrupt primary JSON falls back to the last valid backup', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    localStorage.setItem('deadCalm_gameState', '{"broken":');
    localStorage.setItem('deadCalm_gameState__backup', JSON.stringify({ day: 4, clues: ['clue_a'] }));
    assert.deepEqual(Storage.load('gameState'), { day: 4, clues: ['clue_a'] });
    assert.equal(Storage.exists('gameState'), true);
  } finally {
    globalThis.localStorage = previous;
  }
});

test('a staged complete save can recover when the primary record is missing', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    localStorage.setItem('deadCalm_gameState__pending', JSON.stringify({ day: 3, flags: { clue_found: true } }));
    assert.deepEqual(Storage.load('gameState'), { day: 3, flags: { clue_found: true } });
  } finally {
    globalThis.localStorage = previous;
  }
});

test('remove and clearAll delete primary, backup, and pending records', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    for (const key of ['deadCalm_gameState', 'deadCalm_gameState__backup', 'deadCalm_gameState__pending']) {
      localStorage.setItem(key, '{}');
    }
    Storage.remove('gameState');
    assert.equal(localStorage.length, 0);

    localStorage.setItem('deadCalm_gameState', '{}');
    localStorage.setItem('deadCalm_settings__backup', '{}');
    localStorage.setItem('unrelated_app_key', '{}');
    Storage.clearAll();
    assert.equal(localStorage.getItem('unrelated_app_key'), '{}');
    assert.equal(localStorage.length, 1);
  } finally {
    globalThis.localStorage = previous;
  }
});

test('failed primary write recovers the newest staged save while keeping it available for retry', () => {
  const previous = globalThis.localStorage;
  const memory = createMemoryStorage();
  globalThis.localStorage = memory;
  try {
    Storage.save('gameState', { day: 1 });
    const originalSetItem = memory.setItem.bind(memory);
    memory.setItem = (key, value) => {
      if (key === 'deadCalm_gameState') throw new Error('simulated quota exceeded');
      originalSetItem(key, value);
    };

    assert.equal(Storage.save('gameState', { day: 2 }), false);
    // A complete staged payload is newer than the previous primary and is
    // therefore the correct recovery choice even when promotion still fails.
    assert.deepEqual(Storage.load('gameState'), { day: 2 });
    assert.deepEqual(JSON.parse(memory.getItem('deadCalm_gameState__pending')), { day: 2 });
  } finally {
    globalThis.localStorage = previous;
  }
});


test('hasAnyRecord detects corrupt records even when no valid copy can be parsed', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    localStorage.setItem('deadCalm_gameState', '{broken');
    localStorage.setItem('deadCalm_gameState__backup', '{also broken');
    assert.equal(Storage.load('gameState'), null);
    assert.equal(Storage.exists('gameState'), false);
    assert.equal(Storage.hasAnyRecord('gameState'), true);
  } finally {
    globalThis.localStorage = previous;
  }
});
