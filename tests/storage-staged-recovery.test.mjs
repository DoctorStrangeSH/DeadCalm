import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../src/js/core/storage.js';

function installStorage(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (options.failWrites) throw new Error('quota exceeded');
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; }
  };
  return {
    values,
    restore() {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete globalThis.localStorage;
    }
  };
}

test('load promotes the newest valid staged save ahead of older primary and backup copies', () => {
  const store = installStorage({
    deadCalm_gameState: JSON.stringify({ revision: 1 }),
    deadCalm_gameState__backup: JSON.stringify({ revision: 0 }),
    deadCalm_gameState__pending: JSON.stringify({ revision: 2 })
  });
  try {
    assert.deepEqual(Storage.load('gameState'), { revision: 2 });
    assert.deepEqual(JSON.parse(store.values.get('deadCalm_gameState')), { revision: 2 });
    assert.deepEqual(JSON.parse(store.values.get('deadCalm_gameState__backup')), { revision: 1 });
    assert.equal(store.values.has('deadCalm_gameState__pending'), false);
  } finally {
    store.restore();
  }
});

test('load returns a valid staged save even when browser storage prevents promotion', () => {
  const store = installStorage({
    deadCalm_gameState: JSON.stringify({ revision: 1 }),
    deadCalm_gameState__pending: JSON.stringify({ revision: 2 })
  }, { failWrites: true });
  try {
    assert.deepEqual(Storage.load('gameState'), { revision: 2 });
    assert.equal(store.values.has('deadCalm_gameState__pending'), true);
    assert.deepEqual(JSON.parse(store.values.get('deadCalm_gameState')), { revision: 1 });
  } finally {
    store.restore();
  }
});

test('load ignores an invalid staged payload and falls back to the valid primary save', () => {
  const store = installStorage({
    deadCalm_gameState: JSON.stringify({ revision: 1 }),
    deadCalm_gameState__backup: JSON.stringify({ revision: 0 }),
    deadCalm_gameState__pending: '{broken'
  });
  try {
    assert.deepEqual(Storage.load('gameState'), { revision: 1 });
  } finally {
    store.restore();
  }
});

test('load uses the backup when primary and staged records are both invalid', () => {
  const store = installStorage({
    deadCalm_gameState: '{broken',
    deadCalm_gameState__backup: JSON.stringify({ revision: 0 }),
    deadCalm_gameState__pending: 'null'
  });
  try {
    assert.deepEqual(Storage.load('gameState'), { revision: 0 });
  } finally {
    store.restore();
  }
});
