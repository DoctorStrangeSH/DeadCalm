import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCaseWitnesses, recordOldCaseWitnessReading } from '../src/js/systems/old-case-witnesses.js';

const audit = { readingId: 'partial_confirmation' };
const clues = new Set(['old_case_clerk_statement', 'old_case_dock_statement']);
test('архивные свидетельства требуют сохранённой сверки источников', () => {
  assert.equal(assessOldCaseWitnesses(id => clues.has(id), null), null);
  assert.equal(assessOldCaseWitnesses(id => clues.has(id), { readingId: 'all_confirmed' }), null);
});
test('для оценки необходимо получить оба показания', () => {
  const partial = assessOldCaseWitnesses(id => id === 'old_case_clerk_statement', audit);
  assert.equal(partial.ready, false);
  assert.equal(recordOldCaseWitnessReading('direct_only', partial), null);
});
test('очевидец передачи не удостоверяет визит судьи', () => {
  const check = assessOldCaseWitnesses(id => clues.has(id), audit);
  assert.equal(check.ready, true);
  assert.match(check.conclusion, /пересказ/);
  assert.equal(recordOldCaseWitnessReading('both_direct', check).correct, false);
  assert.equal(recordOldCaseWitnessReading('both_rumor', check).correct, false);
});
test('осторожная оценка сохраняется единожды', () => {
  const check = assessOldCaseWitnesses(id => clues.has(id), audit);
  const saved = recordOldCaseWitnessReading('direct_only', check);
  assert.equal(saved.correct, true);
  assert.equal(recordOldCaseWitnessReading('both_direct', check, saved), null);
  assert.equal(recordOldCaseWitnessReading('unknown', check), null);
});
