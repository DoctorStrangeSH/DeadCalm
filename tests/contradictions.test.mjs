import test from 'node:test';
import assert from 'node:assert/strict';
import { findContradictions, hasDiscoveredContradiction } from '../src/js/systems/contradictions.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { GameState } from '../src/js/core/state.js';
import { readFileSync } from 'node:fs';

const rules = [{ id: 'timeline_conflict', clueIds: ['a', 'b'],
  summary: 'Факты требуют сверки времени', followUp: 'Перепроверьте показания.' }];
const discovered = [{ id: 'a' }, { id: 'b' }];

test('contradiction is shown only when both authored facts were discovered and attached', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, rules), [{
    ...rules[0], clueIds: ['a', 'b']
  }]);
  assert.deepEqual(findContradictions({ clueIds: ['a'] }, discovered, rules), []);
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered.slice(0, 1), rules), []);
});

test('empty and malformed rules cannot manufacture contradictions or leak undiscovered content', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, []), []);
  const malformed = [{ id: 'broken', clueIds: ['a'], summary: 'Fake' },
    { id: 'missing', clueIds: ['a', 'secret'], summary: 'Spoiler' },
    { id: 'blank', clueIds: ['a', 'b'], summary: '' }];
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, malformed), []);
  assert.equal(findContradictions({ clueIds: ['a', 'b'] }, discovered, [rules[0], rules[0]]).length, 1);
});

test('authored contradiction references real clues and a discoverable dialogue reward', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const authored = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
  assert.equal(authored.length, 1);
  const rule = authored[0];
  for (const id of rule.clueIds) assert.ok(catalog[id], `${id} missing from clue catalog`);
  assert.equal(dialogues.npc_ray_morgan.topics.about_case.responses.find(r => r.id === 'initial_report').gives_clue, 'patrol_initial_report');
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, rule.clueIds.map(id => catalog[id]), authored).map(r => r.id), [rule.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [catalog.autopsy_report_01], authored), []);
});

test('Ray follow-up stays locked before deduction and unlocks on a saved hypothesis', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const authored = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));
  const question = dialogues.npc_ray_morgan.topics.about_case.responses.find(r => r.id === 'confront_report_timing');
  assert.equal(question.requires_contradiction, 'report_vs_autopsy_timing');
  const oldCase = GameState.currentCase;
  const oldRules = DialogueEngine._contradictionRules;
  const oldUnlocked = DialogueEngine._unlockedTopics;
  const oldAsked = DialogueEngine._askedQuestions;
  try {
    GameState.currentCase = { clues: [catalog.autopsy_report_01, catalog.patrol_initial_report], hypotheses: [] };
    DialogueEngine._contradictionRules = authored;
    DialogueEngine._unlockedTopics = ['about_case'];
    DialogueEngine._askedQuestions = ['case_details', 'initial_report', 'old_case'];
    assert.equal(DialogueEngine._isResponseAvailable(question), false);
    assert.deepEqual(DialogueEngine._getAvailableTopics(dialogues.npc_ray_morgan), []);
    GameState.currentCase.hypotheses = [{ clueIds: ['autopsy_report_01', 'patrol_initial_report'] }];
    assert.equal(DialogueEngine._isResponseAvailable(question), true);
    assert.deepEqual(DialogueEngine._getAvailableTopics(dialogues.npc_ray_morgan), ['about_case']);
    GameState.currentCase.clues = [catalog.autopsy_report_01];
    assert.equal(DialogueEngine._isResponseAvailable(question), false);
    assert.equal(hasDiscoveredContradiction('unknown', [], [], authored), false);
  } finally {
    GameState.currentCase = oldCase;
    DialogueEngine._contradictionRules = oldRules;
    DialogueEngine._unlockedTopics = oldUnlocked;
    DialogueEngine._askedQuestions = oldAsked;
  }
});

test('Ray response adjusts to trust without changing the discovered contradiction', () => {
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const question = dialogues.npc_ray_morgan.topics.about_case.responses.find(r => r.id === 'confront_report_timing');
  const previousNPC = DialogueEngine._currentNPC;
  const previousRelationships = GameState.relationships;
  try {
    DialogueEngine._currentNPC = 'npc_ray_morgan';
    GameState.relationships = { npc_ray_morgan: { trust: 20 } };
    assert.equal(DialogueEngine._formatAnswer(question).text, question.answer_low_trust);
    GameState.relationships.npc_ray_morgan.trust = 50;
    assert.equal(DialogueEngine._formatAnswer(question).text, question.answer);
    GameState.relationships.npc_ray_morgan.trust = 80;
    assert.equal(DialogueEngine._formatAnswer(question).text, question.answer_high_trust);
  } finally {
    DialogueEngine._currentNPC = previousNPC;
    GameState.relationships = previousRelationships;
  }
});

test('phone log appears only after confronting Ray and rewards the documented clue', () => {
  const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const questions = dialogues.npc_ray_morgan.topics.about_case.responses;
  const followUp = questions.find(r => r.id === 'inspect_incoming_calls');
  assert.equal(followUp.requires_question, 'confront_report_timing');
  assert.equal(followUp.gives_clue, 'court_switchboard_log');
  assert.ok(clues[followUp.gives_clue]);
  const oldAsked = DialogueEngine._askedQuestions;
  const oldCase = GameState.currentCase;
  try {
    DialogueEngine._askedQuestions = ['initial_report'];
    GameState.currentCase = { clues: [], hypotheses: [] };
    assert.equal(DialogueEngine._isResponseAvailable(followUp), false);
    DialogueEngine._askedQuestions.push('confront_report_timing');
    assert.equal(DialogueEngine._isResponseAvailable(followUp), true);
  } finally {
    DialogueEngine._askedQuestions = oldAsked;
    GameState.currentCase = oldCase;
  }
});
