import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Events } from '../src/js/core/events.js';

function withMiniGameState(run) {
  const previous = {
    miniGameProgress: GameState.miniGameProgress,
    save: GameState.save,
    saveStatus: GameState.saveStatus
  };
  try {
    GameState.miniGameProgress = {};
    return run();
  } finally {
    GameState.miniGameProgress = previous.miniGameProgress;
    GameState.save = previous.save;
    GameState.saveStatus = previous.saveStatus;
  }
}

test('a new mini-game result is rolled back and not published when storage rejects the save', () => {
  withMiniGameState(() => {
    let emitted = 0;
    const unsubscribe = Events.on('minigame:result_recorded', () => { emitted += 1; });
    GameState.save = () => false;
    try {
      const result = GameState.recordMiniGameResult({
        type: 'radio-tuning', outcome: 'fragmented', quality: 78
      });
      assert.equal(result, null);
      assert.deepEqual(GameState.miniGameProgress, {});
      assert.equal(emitted, 0, 'uncommitted progress must not be published');
    } finally {
      unsubscribe();
    }
  });
});

test('a failed replay restores the previous best and attempt count', () => {
  withMiniGameState(() => {
    GameState.miniGameProgress = {
      'radio-tuning': {
        attempts: 2,
        bestOutcome: 'clear',
        bestQuality: 96,
        lastOutcome: 'fragmented',
        lastQuality: 78,
        completedAt: '1987-11-04T18:00:00.000Z'
      }
    };
    const before = structuredClone(GameState.miniGameProgress);
    GameState.save = () => false;
    const result = GameState.recordMiniGameResult({
      type: 'radio-tuning', outcome: 'clear', quality: 99
    });
    assert.equal(result, null);
    assert.deepEqual(GameState.miniGameProgress, before);
  });
});

test('a storage exception rolls back a new mini-game result and does not escape', () => {
  withMiniGameState(() => {
    GameState.save = () => { throw new Error('simulated storage failure'); };
    assert.doesNotThrow(() => {
      assert.equal(GameState.recordMiniGameResult({
        type: 'mechanical-repair', outcome: 'success'
      }), null);
    });
    assert.deepEqual(GameState.miniGameProgress, {});
  });
});

test('a committed mini-game result is still published after successful persistence', () => {
  withMiniGameState(() => {
    let emitted = null;
    const unsubscribe = Events.on('minigame:result_recorded', result => { emitted = result; });
    GameState.save = () => true;
    try {
      const result = GameState.recordMiniGameResult({
        type: 'film-restoration', outcome: 'success', quality: 100
      });
      assert.equal(result.bestOutcome, 'success');
      assert.deepEqual(emitted, result);
      assert.equal(GameState.miniGameProgress['film-restoration'].bestQuality, 100);
    } finally {
      unsubscribe();
    }
  });
});
