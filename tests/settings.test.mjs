import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings, getTextDelay } from '../src/js/systems/settings.js';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('settings normalization clamps volume and rejects unknown text speed', () => {
  assert.deepEqual(normalizeSettings({ musicVolume: 2, sfxVolume: -1, textSpeed: 'instant' }), {
    musicVolume: 1,
    sfxVolume: 0,
    textSpeed: 'normal'
  });
  assert.deepEqual(normalizeSettings({ musicVolume: '0.25', sfxVolume: '0.8', textSpeed: 'slow' }), {
    musicVolume: 0.25,
    sfxVolume: 0.8,
    textSpeed: 'slow'
  });
  assert.deepEqual(normalizeSettings({ musicVolume: NaN, sfxVolume: Infinity }), DEFAULT_SETTINGS);
});

test('dialogue speed maps to predictable character delays', () => {
  assert.equal(getTextDelay('slow'), 45);
  assert.equal(getTextDelay('normal'), 25);
  assert.equal(getTextDelay('fast'), 8);
  assert.equal(getTextDelay('unknown'), 25);
});

test('starting a new investigation preserves personal settings', () => {
  const originalSave = Storage.save;
  const originalClearAll = Storage.clearAll;
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
  const preferences = { musicVolume: 0.18, sfxVolume: 0.36, textSpeed: 'fast' };
  try {
    GameState.settings = { ...preferences };
    Storage.save = () => true;
    Storage.clearAll = () => true;
    GameState.reset();
    assert.deepEqual(GameState.settings, preferences);
  } finally {
    Storage.save = originalSave;
    Storage.clearAll = originalClearAll;
    Object.assign(GameState, original);
  }
});
