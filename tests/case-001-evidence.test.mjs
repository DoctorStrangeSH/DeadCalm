import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCase001MiniGameEvidence, recordCase001MiniGameEvidence } from '../src/js/systems/case-001-evidence.js';

test('watch repair rewards its hidden key only after a successful repair', () => {
  assert.equal(buildCase001MiniGameEvidence('mechanical-repair', { outcome: 'failure' }), null);
  const clue = buildCase001MiniGameEvidence('mechanical-repair', { outcome: 'success' });
  assert.equal(clue.id, 'markus_watch_key');
  assert.match(clue.description, /архивного ящика/);
});

test('radio evidence preserves the difference between clear and fragmented reception', () => {
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'noise', quality: 20 }), null);
  const clear = buildCase001MiniGameEvidence('radio-tuning', { outcome: 'clear', quality: 92 });
  const partial = buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: 68 });
  assert.equal(clear.id, 'port_radio_fragment');
  assert.match(clear.description, /установить личность/);
  assert.match(partial.description, /не идентифицирован/);
});

test('film evidence distinguishes a clear identification from a partial frame', () => {
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'failure', quality: 30 }), null);
  const clear = buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 100 });
  const partial = buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: 70 });
  assert.match(clear.description, /Себастьян Блэквуд и Каллиопа/);
  assert.match(partial.description, /личности пока нельзя считать подтверждёнными/i);
});

test('replaying a mini-game upgrades evidence quality without duplicating the clue', () => {
  const state = {
    clues: [],
    addClue(clue) { this.clues.push({ ...clue }); },
    getClue(id) { return this.clues.find(clue => clue.id === id) || null; },
    save() { this.saved = true; }
  };
  assert.equal(recordCase001MiniGameEvidence(state, 'film-restoration', { outcome: 'partial', quality: 70 }), true);
  assert.equal(state.clues.length, 1);
  assert.equal(recordCase001MiniGameEvidence(state, 'film-restoration', { outcome: 'success', quality: 100 }), true);
  assert.equal(state.clues.length, 1);
  assert.equal(state.clues[0].quality, 100);
  assert.match(state.clues[0].description, /Себастьян Блэквуд и Каллиопа/);
  assert.equal(recordCase001MiniGameEvidence(state, 'film-restoration', { outcome: 'partial', quality: 70 }), false);
});


test('radio evidence rejects outcomes that contradict the measured signal quality', () => {
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'clear', quality: 91 }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: 92 }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'clear', quality: 120 }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: NaN }), null);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'unreadable', quality: 100 }), null);
});

test('film evidence rejects damaged or quality-inconsistent outcomes', () => {
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 94 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: 95 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'damaged', quality: 100 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 101 }), null);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: NaN }), null);
});

test('valid radio and film evidence retain their established quality bands', () => {
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'fragmented', quality: 91 }).quality, 91);
  assert.equal(buildCase001MiniGameEvidence('radio-tuning', { outcome: 'clear', quality: 92 }).quality, 92);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'partial', quality: 94 }).quality, 94);
  assert.equal(buildCase001MiniGameEvidence('film-restoration', { outcome: 'success', quality: 95 }).quality, 95);
});
