import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMiniGameProgress, normalizeMiniGameProgress, recordMiniGameResult } from '../src/js/systems/minigame-progress.js';

test('progress starts empty and rejects unknown activity types', () => {
  const progress = createEmptyMiniGameProgress();
  assert.deepEqual(progress, {});
  assert.equal(recordMiniGameResult(progress, { type: 'cipher-puzzle', outcome: 'success' }), null);
});

test('first completion is stored with an attempt count and timestamp', () => {
  const progress = {};
  const entry = recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'fragmented', quality: 78 }, '1987-10-14T23:17:00.000Z');
  assert.equal(entry.attempts, 1);
  assert.equal(entry.bestOutcome, 'fragmented');
  assert.equal(entry.bestQuality, 78);
  assert.equal(entry.completedAt, '1987-10-14T23:17:00.000Z');
});

test('replay increments attempts but never overwrites a better result', () => {
  const progress = {};
  recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'clear', quality: 99 }, 'first');
  const replay = recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'unreadable', quality: 12 }, 'second');
  assert.equal(replay.attempts, 2);
  assert.equal(replay.bestOutcome, 'clear');
  assert.equal(replay.bestQuality, 99);
  assert.equal(replay.lastOutcome, 'unreadable');
  assert.equal(replay.improved, false);
});

test('a stronger result improves the saved best while preserving attempt history', () => {
  const progress = {};
  recordMiniGameResult(progress, { type: 'mechanical-repair', outcome: 'partial' });
  const improved = recordMiniGameResult(progress, { type: 'mechanical-repair', outcome: 'success' });
  assert.equal(improved.attempts, 2);
  assert.equal(improved.bestOutcome, 'success');
  assert.equal(improved.improved, true);
});

test('same-rank radio result keeps only a higher signal quality as best', () => {
  const progress = {};
  recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'clear', quality: 94 });
  const weaker = recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'clear', quality: 90 });
  assert.equal(weaker.bestQuality, 94);
  const stronger = recordMiniGameResult(progress, { type: 'radio-tuning', outcome: 'clear', quality: 100 });
  assert.equal(stronger.bestQuality, 100);
});

test('normalization safely migrates absent and malformed old save data', () => {
  assert.deepEqual(normalizeMiniGameProgress(undefined), {});
  const restored = normalizeMiniGameProgress({
    'radio-tuning': { attempts: 2, bestOutcome: 'clear', bestQuality: 120, lastOutcome: 'fragmented', lastQuality: 72 },
    'unknown-game': { attempts: 5, bestOutcome: 'success' },
    'mechanical-repair': { attempts: -2, bestOutcome: 'not-real' }
  });
  assert.equal(restored['radio-tuning'].bestQuality, 100);
  assert.equal(restored['radio-tuning'].attempts, 2);
  assert.equal(restored['unknown-game'], undefined);
  assert.equal(restored['mechanical-repair'], undefined);
});
