import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { Events } from '../src/js/core/events.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

function captureState() {
  return {
    npcMemory: GameState.npcMemory,
    relationships: GameState.relationships,
    saveBlocked: GameState.saveBlocked
  };
}

test('ordinary NPC memory mutations roll back when storage rejects the save', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  const emitted = [];
  const off = Events.on('npc:flag_set', payload => emitted.push(payload));

  try {
    GameState.npcMemory = {
      npc_test: {
        met: false,
        flags: { existing: true },
        conversationCount: 0,
        questionCount: 0,
        unlockedTopics: ['intro'],
        askedQuestions: ['first_question'],
        criticalChoiceMade: false,
        interviewHistory: []
      }
    };
    const memory = NPCMemory.getMemory('npc_test');
    const flagsRef = memory.flags;
    const topicsRef = memory.unlockedTopics;
    const questionsRef = memory.askedQuestions;
    const historyRef = memory.interviewHistory;
    Storage.save = () => false;

    assert.equal(NPCMemory.setFlag('npc_test', 'promise_kept', true), false);
    assert.equal(NPCMemory.hasFlag('npc_test', 'promise_kept'), false);
    assert.equal(memory.flags, flagsRef);
    assert.deepEqual(emitted, []);

    assert.equal(NPCMemory.clearFlag('npc_test', 'existing'), false);
    assert.equal(NPCMemory.hasFlag('npc_test', 'existing'), true);

    assert.equal(NPCMemory.markQuestionAsked('npc_test', 'second_question'), false);
    assert.equal(memory.askedQuestions, questionsRef);
    assert.deepEqual(memory.askedQuestions, ['first_question']);

    assert.equal(NPCMemory.unlockTopics('npc_test', ['new_topic']), false);
    assert.equal(memory.unlockedTopics, topicsRef);
    assert.deepEqual(memory.unlockedTopics, ['intro']);

    assert.equal(NPCMemory.markMet('npc_test'), false);
    assert.equal(memory.met, false);
    assert.equal(memory.conversationCount, 0);

    assert.equal(NPCMemory.incrementQuestionCount('npc_test'), false);
    assert.equal(memory.questionCount, 0);

    assert.equal(NPCMemory.recordInterview('npc_test', {
      tone: 'patient',
      response: 'shared_lead',
      statementRef: 'test_statement'
    }), null);
    assert.equal(memory.interviewHistory, historyRef);
    assert.deepEqual(memory.interviewHistory, []);
    assert.deepEqual(emitted, []);
  } finally {
    off();
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});

test('ordinary NPC memory mutations become visible only after a successful save', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  const emitted = [];
  const off = Events.on('npc:flag_set', payload => emitted.push(payload));

  try {
    GameState.npcMemory = {};
    Storage.save = () => true;

    assert.equal(NPCMemory.setFlag('npc_test', 'promise_kept', true), true);
    assert.equal(NPCMemory.markQuestionAsked('npc_test', 'promise_question'), true);
    assert.equal(NPCMemory.unlockTopics('npc_test', ['promise_follow_up']), true);
    assert.equal(NPCMemory.markMet('npc_test'), true);
    assert.equal(NPCMemory.incrementQuestionCount('npc_test'), true);

    const interview = NPCMemory.recordInterview('npc_test', {
      tone: 'patient',
      response: 'shared_lead',
      statementRef: 'promise_statement'
    });
    assert.equal(interview.sequence, 1);

    const memory = NPCMemory.getMemory('npc_test');
    assert.equal(memory.met, true);
    assert.equal(memory.conversationCount, 1);
    assert.equal(memory.questionCount, 1);
    assert.equal(memory.flags.promise_kept, true);
    assert.deepEqual(memory.askedQuestions, ['promise_question']);
    assert.deepEqual(memory.unlockedTopics, ['promise_follow_up']);
    assert.equal(memory.interviewHistory.length, 1);
    assert.deepEqual(emitted, [{ npcId: 'npc_test', flag: 'promise_kept' }]);
  } finally {
    off();
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});


test('resetting one NPC rolls back completely when saving fails and succeeds only after persistence', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  try {
    GameState.npcMemory = {
      npc_test: {
        met: true,
        flags: { promise_kept: true },
        conversationCount: 3,
        questionCount: 7,
        unlockedTopics: ['intro', 'case'],
        askedQuestions: ['first', 'second'],
        criticalChoiceMade: true,
        interviewHistory: [{ sequence: 1, tone: 'patient', response: 'shared_lead' }]
      }
    };
    const memory = NPCMemory.getMemory('npc_test');
    const flagsRef = memory.flags;
    Storage.save = () => false;
    assert.equal(NPCMemory.resetNPC('npc_test'), false);
    assert.equal(GameState.npcMemory.npc_test, memory);
    assert.equal(memory.flags, flagsRef);
    assert.equal(memory.met, true);
    assert.equal(memory.conversationCount, 3);
    assert.deepEqual(memory.flags, { promise_kept: true });
    assert.deepEqual(memory.askedQuestions, ['first', 'second']);

    Storage.save = () => true;
    assert.equal(NPCMemory.resetNPC('npc_test'), true);
    assert.equal(memory.met, false);
    assert.equal(memory.conversationCount, 0);
    assert.deepEqual(memory.flags, {});
    assert.deepEqual(memory.askedQuestions, []);
    assert.deepEqual(memory.interviewHistory, []);
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});

test('resetting all NPC memories restores the complete prior collection when saving fails', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  try {
    GameState.npcMemory = {
      npc_a: { met: true, flags: { clue_shared: true }, conversationCount: 2 },
      npc_b: { met: false, flags: { cautious: true }, conversationCount: 0 }
    };
    const collection = GameState.npcMemory;
    const snapshot = structuredClone(collection);
    Storage.save = () => false;
    assert.equal(NPCMemory.resetAll(), false);
    assert.equal(GameState.npcMemory, collection);
    assert.deepEqual(GameState.npcMemory, snapshot);

    Storage.save = () => true;
    assert.equal(NPCMemory.resetAll(), true);
    assert.deepEqual(GameState.npcMemory, {});
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});


test('return conversation count and one-time reaction flag are committed atomically', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  const emitted = [];
  const off = Events.on('npc:flag_set', payload => emitted.push(payload));
  try {
    GameState.npcMemory = {
      npc_test: {
        met: true, flags: {}, conversationCount: 4, questionCount: 0,
        unlockedTopics: [], askedQuestions: [], criticalChoiceMade: false, interviewHistory: []
      }
    };
    const memory = NPCMemory.getMemory('npc_test');
    Storage.save = () => false;
    assert.equal(NPCMemory.recordConversation('npc_test', 'return_reaction_seen'), false);
    assert.equal(memory.conversationCount, 4);
    assert.equal(memory.flags.return_reaction_seen, undefined);
    assert.deepEqual(emitted, []);

    Storage.save = () => true;
    assert.equal(NPCMemory.recordConversation('npc_test', 'return_reaction_seen'), true);
    assert.equal(memory.conversationCount, 5);
    assert.equal(memory.flags.return_reaction_seen, true);
    assert.deepEqual(emitted, []);
  } finally {
    off();
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});

test('return visits without a pending reaction still increment exactly once after a successful save', () => {
  const previous = captureState();
  const previousSave = Storage.save;
  try {
    GameState.npcMemory = {
      npc_test: {
        met: true, flags: {}, conversationCount: 2, questionCount: 0,
        unlockedTopics: [], askedQuestions: [], criticalChoiceMade: false, interviewHistory: []
      }
    };
    Storage.save = () => true;
    assert.equal(NPCMemory.recordConversation('npc_test'), true);
    assert.equal(NPCMemory.getMemory('npc_test').conversationCount, 3);
  } finally {
    Storage.save = previousSave;
    Object.assign(GameState, previous);
  }
});
