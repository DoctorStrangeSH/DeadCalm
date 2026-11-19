import test from 'node:test';
import assert from 'node:assert/strict';
import { createRadioSession, tuneRadio, adjustRadioFilter, getRadioSignal, completeRadioSession } from '../src/js/systems/radio-tuning.js';

test('radio begins with noise and a usable tuning range', () => {
  const session = createRadioSession();
  assert.equal(session.frequency, 88);
  assert.equal(getRadioSignal(session).clarity, 'noise');
});

test('continuous tuning and filter adjustment can isolate a clear signal', () => {
  const session = createRadioSession();
  tuneRadio(session, 96.7);
  const signal = adjustRadioFilter(session, 54);
  assert.equal(signal.quality, 100);
  assert.equal(signal.clarity, 'clear');
  assert.equal(signal.canLock, true);
});

test('off-frequency tuning produces degraded signal quality', () => {
  const session = createRadioSession();
  const signal = tuneRadio(session, 92);
  assert.ok(signal.quality < 92);
  assert.equal(signal.canLock, false);
});

test('filter outside the useful band degrades the signal', () => {
  const session = createRadioSession();
  tuneRadio(session, 96.7);
  const signal = adjustRadioFilter(session, 100);
  assert.ok(signal.quality < 92);
  assert.equal(signal.canLock, false);
});

test('frequency and filter are clamped to physical control limits', () => {
  const session = createRadioSession();
  tuneRadio(session, 200);
  assert.equal(session.frequency, 108);
  adjustRadioFilter(session, -20);
  assert.equal(session.filter, 0);
});

test('completion grades clear, fragmented, and unreadable reception', () => {
  const clear = createRadioSession();
  tuneRadio(clear, 96.7);
  adjustRadioFilter(clear, 54);
  assert.equal(completeRadioSession(clear).result, 'clear');
  assert.equal(completeRadioSession(clear), null);

  const fragmented = createRadioSession();
  tuneRadio(fragmented, 95.7);
  assert.equal(completeRadioSession(fragmented).result, 'fragmented');

  const unreadable = createRadioSession();
  tuneRadio(unreadable, 88);
  assert.equal(completeRadioSession(unreadable).result, 'unreadable');
});

test('invalid values and actions after completion are rejected', () => {
  const session = createRadioSession();
  assert.equal(tuneRadio(session, NaN), null);
  assert.equal(adjustRadioFilter(session, Infinity), null);
  completeRadioSession(session);
  assert.equal(tuneRadio(session, 96.7), null);
  assert.equal(adjustRadioFilter(session, 54), null);
});
