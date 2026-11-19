import test from 'node:test';
import assert from 'node:assert/strict';
import { appendWitnessInterview, getWitnessInterviewContext, getWitnessRecallLine } from '../src/js/systems/witness-interview-history.js';

test('interview history appends ordered, attributed events without asserting truth', () => {
  const memory = {};
  const event = appendWitnessInterview(memory, {
    npcId: 'npc_pavel_orlov', tone: 'patient', response: 'shared_lead',
    statementRef: 'orlov_badge_handover',
    presentedEvidenceIds: ['orlov_evening_statement', 'orlov_badge_scan', 'orlov_badge_scan'],
    occurredAt: '2026-11-19T10:00:00.000Z', trustAfter: 55
  });
  assert.equal(event.sequence, 1);
  assert.deepEqual(event.presentedEvidenceIds, ['orlov_evening_statement', 'orlov_badge_scan']);
  assert.equal(event.statementRef, 'orlov_badge_handover');
  assert.equal(Object.hasOwn(event, 'truth'), false);
  assert.equal(Object.hasOwn(event, 'verified'), false);
});

test('repeated interviews preserve sequence and prior statements/evidence', () => {
  const memory = {};
  appendWitnessInterview(memory, { npcId: 'npc', tone: 'patient', response: 'shared_lead', statementRef: 'first', presentedEvidenceIds: ['clue-a'], occurredAt: '2026-11-19T10:00:00Z' });
  appendWitnessInterview(memory, { npcId: 'npc', tone: 'pressure', response: 'declined_further_comment', statementRef: 'second', presentedEvidenceIds: ['clue-b'], occurredAt: '2026-11-20T10:00:00Z' });
  const context = getWitnessInterviewContext(memory);
  assert.equal(context.interviewCount, 2);
  assert.equal(context.lastTone, 'pressure');
  assert.equal(context.lastResponse, 'declined_further_comment');
  assert.deepEqual(context.previousStatementRefs, ['first', 'second']);
  assert.deepEqual(context.previouslyPresentedEvidenceIds, ['clue-a', 'clue-b']);
});

test('pressure refusal and patient lead are response outcomes, not trust scores', () => {
  const memory = {};
  const patient = appendWitnessInterview(memory, { npcId: 'npc', tone: 'patient', response: 'shared_lead', statementRef: 'statement-a', trustAfter: 35 });
  const pressure = appendWitnessInterview(memory, { npcId: 'npc', tone: 'pressure', response: 'declined_further_comment', statementRef: 'statement-b', trustAfter: 95 });
  assert.equal(patient.response, 'shared_lead');
  assert.equal(pressure.response, 'declined_further_comment');
  assert.equal(pressure.trustAfter, 95);
  assert.equal(getWitnessInterviewContext(memory).lastResponse, 'declined_further_comment');
});

test('invalid events are rejected and history input is not mutated', () => {
  const memory = { interviewHistory: [] };
  const before = structuredClone(memory);
  assert.equal(appendWitnessInterview(memory, { npcId: 'npc', tone: 'threat', response: 'shared_lead', statementRef: 'x' }), null);
  assert.deepEqual(memory, before);
  assert.equal(getWitnessInterviewContext(null).interviewCount, 0);
});

test('first visit has no fabricated memory and repeat visit recalls tone and response neutrally', () => {
  const memory = {};
  assert.equal(getWitnessRecallLine(memory, 'Орлов'), '');
  appendWitnessInterview(memory, { npcId: 'npc_pavel_orlov', tone: 'pressure', response: 'declined_further_comment', statementRef: 'orlov_badge_handover', presentedEvidenceIds: ['one', 'two'] });
  const line = getWitnessRecallLine(memory, 'Орлов');
  assert.match(line, /Орлов помнит/);
  assert.match(line, /разговор на повышенных тонах/);
  assert.match(line, /отказался продолжать разговор/);
  assert.match(line, /2 материала дела/);
  assert.match(line, /не установленным фактом/);
});

test('patient cooperation callback is distinct from pressure refusal and never implies trust', () => {
  const memory = {};
  appendWitnessInterview(memory, { npcId: 'npc', tone: 'patient', response: 'shared_lead', statementRef: 'statement-ref', presentedEvidenceIds: ['clue-a'] });
  const line = getWitnessRecallLine(memory, 'Климов');
  assert.match(line, /спокойный разговор/);
  assert.match(line, /согласился поделиться дополнительными сведениями/);
  assert.doesNotMatch(line, /доверяет|правду|подтверждено/);
});
