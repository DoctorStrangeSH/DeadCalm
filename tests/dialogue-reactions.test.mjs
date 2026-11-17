import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDialogueReaction } from '../src/js/systems/dialogue-reactions.js';

test('critical questions look tense before a decision', () => {
  assert.equal(resolveDialogueReaction({ type: 'critical_choice' }), 'tension');
});

test('trust changes determine the emotional presentation of a result', () => {
  assert.equal(resolveDialogueReaction({ type: 'critical_result', trustDelta: 12 }), 'warmth');
  assert.equal(resolveDialogueReaction({ type: 'critical_result', trustDelta: -8 }), 'withdrawal');
});

test('a hostile tone without a trust change remains tense', () => {
  assert.equal(resolveDialogueReaction({ type: 'critical_result', tone: 'aggressive' }), 'tension');
});

test('ordinary dialogue has no fabricated emotional response', () => {
  assert.equal(resolveDialogueReaction({ type: 'answer', trustDelta: -50 }), 'neutral');
  assert.equal(resolveDialogueReaction({ type: 'critical_result', tone: 'neutral' }), 'neutral');
  assert.equal(resolveDialogueReaction(), 'neutral');
});
