import test from 'node:test';
import assert from 'node:assert/strict';
import { getMiniGameResultCue } from '../src/js/core/audio.js';

test('clean mini-game outcomes use the success cue', () => {
  assert.equal(getMiniGameResultCue('success'), 'success');
  assert.equal(getMiniGameResultCue('clear'), 'success');
});

test('damaged and unreadable outcomes use the failure cue', () => {
  assert.equal(getMiniGameResultCue('failure'), 'failure');
  assert.equal(getMiniGameResultCue('damaged'), 'failure');
  assert.equal(getMiniGameResultCue('unreadable'), 'failure');
});

test('partial outcomes do not falsely celebrate a full success or punish recovery', () => {
  assert.equal(getMiniGameResultCue('partial'), null);
  assert.equal(getMiniGameResultCue('fragmented'), null);
  assert.equal(getMiniGameResultCue(undefined), null);
  assert.equal(getMiniGameResultCue('unknown'), null);
});
