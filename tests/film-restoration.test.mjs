import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustFilmTransport,
  advanceFilm,
  canAdvanceFilm,
  createFilmRestorationSession,
  getFilmRestorationSummary,
  restoreFilmFrame,
  testFilmProjection
} from '../src/js/systems/film-restoration.js';

function restoreAllCleanly(session) {
  assert.equal(restoreFilmFrame(session, 'clean', 28), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'polish', 14), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'splice', 0.2), true);
  assert.equal(advanceFilm(session).phase, 'projection');
}

test('reel begins on the first damaged frame with a safe transport baseline', () => {
  const session = createFilmRestorationSession();
  assert.equal(session.phase, 'transport');
  assert.equal(getFilmRestorationSummary(session).restoredFrames, 0);
  assert.equal(advanceFilm(session).reason, 'restoration_required');
});

test('transport controls are clamped and safe values allow film movement', () => {
  const session = createFilmRestorationSession();
  const controls = adjustFilmTransport(session, { tension: 120, speed: 0 });
  assert.equal(controls.tension, 100);
  assert.equal(controls.speed, 1);
  assert.equal(controls.safe, false);
  const safe = adjustFilmTransport(session, { tension: 48, speed: 2 });
  assert.equal(safe.safe, true);
});

test('unsafe transport damages the reel but never silently advances it', () => {
  const session = createFilmRestorationSession();
  adjustFilmTransport(session, { tension: 90, speed: 4 });
  const result = advanceFilm(session);
  assert.equal(result.advanced, false);
  assert.equal(session.frameIndex, 0);
  assert.equal(session.filmDamage, 1);
});

test('each defect requires its own physical restoration operation', () => {
  const session = createFilmRestorationSession();
  assert.equal(restoreFilmFrame(session, 'polish', 14), false);
  assert.equal(restoreFilmFrame(session, 'clean', 28), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'clean', 28), false);
  assert.equal(restoreFilmFrame(session, 'polish', 14), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'splice', 0.2), true);
});

test('cleaning, polishing and splicing enforce safe physical tolerances', () => {
  const session = createFilmRestorationSession();
  assert.equal(restoreFilmFrame(session, 'clean', 80), false);
  assert.equal(restoreFilmFrame(session, 'clean', 28), true);
  advanceFilm(session);
  assert.equal(restoreFilmFrame(session, 'polish', 40), false);
  assert.equal(restoreFilmFrame(session, 'polish', 14), true);
  advanceFilm(session);
  assert.equal(restoreFilmFrame(session, 'splice', 1.2), false);
  assert.equal(restoreFilmFrame(session, 'splice', 0.2), true);
  assert.equal(session.filmDamage, 3);
});

test('a careful full restoration produces a clean projection result', () => {
  const session = createFilmRestorationSession();
  restoreAllCleanly(session);
  const result = testFilmProjection(session);
  assert.equal(result.outcome, 'success');
  assert.equal(result.restoredFrames, 3);
  assert.equal(testFilmProjection(session), null);
});

test('mistakes can be recovered but remain visible in the final grading', () => {
  const session = createFilmRestorationSession();
  assert.equal(restoreFilmFrame(session, 'clean', 80), false);
  assert.equal(restoreFilmFrame(session, 'clean', 28), true);
  advanceFilm(session);
  restoreFilmFrame(session, 'polish', 14);
  advanceFilm(session);
  restoreFilmFrame(session, 'splice', 0.2);
  advanceFilm(session);
  assert.equal(testFilmProjection(session).outcome, 'partial');
});

test('projection cannot start before all frames have been fed through the gate', () => {
  const session = createFilmRestorationSession();
  assert.equal(testFilmProjection(session), null);
  assert.equal(getFilmRestorationSummary(null), null);
});

test('completed reels reject further restoration and transport changes', () => {
  const session = createFilmRestorationSession();
  restoreAllCleanly(session);
  testFilmProjection(session);
  assert.equal(restoreFilmFrame(session, 'clean', 28), false);
  assert.equal(advanceFilm(session), null);
  assert.equal(adjustFilmTransport(session, { tension: 50 }), null);
});


test('the final restored frame unlocks projection instead of leaving the action disabled', () => {
  const session = createFilmRestorationSession();
  assert.equal(canAdvanceFilm(session), false);
  assert.equal(restoreFilmFrame(session, 'clean', 28), true);
  assert.equal(canAdvanceFilm(session), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'polish', 14), true);
  assert.equal(advanceFilm(session).advanced, true);
  assert.equal(restoreFilmFrame(session, 'splice', 0.2), true);
  assert.equal(canAdvanceFilm(session), true, 'last restored frame must allow the final advance');
  assert.equal(advanceFilm(session).phase, 'projection');
  assert.equal(canAdvanceFilm(session), true, 'projection action must remain enabled');
  assert.equal(testFilmProjection(session).outcome, 'success');
  assert.equal(canAdvanceFilm(session), false, 'completed reel must not advance again');
});

test('unsafe transport blocks both frame advance and final projection', () => {
  const session = createFilmRestorationSession();
  restoreAllCleanly(session);
  session.phase = 'projection';
  session.tension = 90;
  assert.equal(canAdvanceFilm(session), false);
  session.tension = 48;
  assert.equal(canAdvanceFilm(session), true);
});
