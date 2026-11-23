import test from 'node:test';
import assert from 'node:assert/strict';
import { canSelectDialogueTopic, canAskDialogueQuestion } from '../src/js/systems/dialogue-access.js';

const response = { id: 'inspect_incoming_calls' };
const available = () => true;

test('only topics unlocked by the NPC memory can be selected', () => {
  assert.equal(canSelectDialogueTopic('about_case', ['about_case']), true);
  assert.equal(canSelectDialogueTopic('about_case', ['about_herself']), false);
  assert.equal(canSelectDialogueTopic('about_case', null), false);
});

test('questions require an unlocked topic and a valid available response', () => {
  assert.equal(canAskDialogueQuestion({ topicId: 'about_case', unlockedTopics: ['about_case'],
    askedQuestions: [], response, isAvailable: available }), true);
  assert.equal(canAskDialogueQuestion({ topicId: 'locked_topic', unlockedTopics: ['about_case'],
    askedQuestions: [], response, isAvailable: available }), false);
  assert.equal(canAskDialogueQuestion({ topicId: 'about_case', unlockedTopics: ['about_case'],
    askedQuestions: ['inspect_incoming_calls'], response, isAvailable: available }), false);
  assert.equal(canAskDialogueQuestion({ topicId: 'about_case', unlockedTopics: ['about_case'],
    askedQuestions: [], response, isAvailable: () => false }), false);
  assert.equal(canAskDialogueQuestion({ topicId: 'about_case', unlockedTopics: ['about_case'],
    askedQuestions: [], response: null, isAvailable: available }), false);
});

test('the dialogue engine applies access guards to both topic selection and question dispatch', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../src/js/systems/dialogue.js', import.meta.url), 'utf8');
  assert.match(source, /canSelectDialogueTopic\(topicId, this\._unlockedTopics\)/);
  assert.match(source, /canAskDialogueQuestion\(\{ topicId: foundTopicId/);
});
