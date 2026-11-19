import test from 'node:test';
import assert from 'node:assert/strict';
import { alignComponent, createRepairSession, getRepairSummary, inspectMechanism, releasePressure, testMechanism } from '../src/js/systems/mechanical-repair.js';

test('a careful repair completes successfully in the intended order', () => {
  const session = createRepairSession({ id: 'watch_01' });
  assert.equal(inspectMechanism(session, 'spring_under_tension'), true);
  assert.equal(releasePressure(session, 'controlled_release'), true);
  assert.equal(alignComponent(session, 'tooth_mark'), true);
  assert.equal(testMechanism(session), 'success');
  assert.equal(session.phase, 'completed');
});

test('an incorrect observation is recoverable and recorded', () => {
  const session = createRepairSession();
  assert.equal(inspectMechanism(session, 'loose_gear'), false);
  assert.equal(session.phase, 'inspect');
  assert.equal(inspectMechanism(session, 'spring_under_tension'), true);
  assert.equal(session.mistakes, 1);
  assert.equal(testMechanism(session), null);
});

test('forcing the spring causes damage but does not softlock the repair', () => {
  const session = createRepairSession();
  inspectMechanism(session, 'spring_under_tension');
  assert.equal(releasePressure(session, 'force'), false);
  assert.equal(session.damage, 1);
  assert.equal(releasePressure(session, 'controlled_release'), true);
  assert.equal(alignComponent(session, 'tooth_mark'), true);
  assert.equal(testMechanism(session), 'partial');
});

test('incorrect alignment can be retried without losing prior progress', () => {
  const session = createRepairSession();
  inspectMechanism(session, 'spring_under_tension');
  releasePressure(session, 'controlled_release');
  assert.equal(alignComponent(session, 'reverse_tooth'), false);
  assert.equal(session.phase, 'align');
  assert.equal(alignComponent(session, 'tooth_mark'), true);
  assert.equal(testMechanism(session), 'partial');
});

test('actions outside their phase are rejected and completed sessions are immutable', () => {
  const session = createRepairSession();
  assert.equal(releasePressure(session, 'controlled_release'), false);
  assert.equal(alignComponent(session, 'tooth_mark'), false);
  inspectMechanism(session, 'spring_under_tension');
  releasePressure(session, 'controlled_release');
  alignComponent(session, 'tooth_mark');
  assert.equal(testMechanism(session), 'success');
  const historyLength = session.history.length;
  assert.equal(inspectMechanism(session, 'spring_under_tension'), false);
  assert.equal(session.history.length, historyLength);
});

test('summary exposes a safe recovery state without leaking mutable internals', () => {
  const session = createRepairSession();
  const summary = getRepairSummary(session);
  assert.equal(summary.canRecover, true);
  assert.equal(summary.outcome, null);
  assert.equal(getRepairSummary(null), null);
});
