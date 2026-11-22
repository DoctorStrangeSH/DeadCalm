import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { appendWitnessInterview, getWitnessInterviewContext } from './witness-interview-history.js';

function persistMemoryMutation(npcId, mutate) {
  const hadMemory = Object.prototype.hasOwnProperty.call(GameState.npcMemory || {}, npcId);
  const memory = NPCMemory.getMemory(npcId);
  const snapshot = JSON.parse(JSON.stringify(memory));
  const references = {
    flags: memory.flags,
    unlockedTopics: memory.unlockedTopics,
    askedQuestions: memory.askedQuestions,
    interviewHistory: memory.interviewHistory
  };

  const result = mutate(memory);
  let saved;
  try {
    saved = GameState.save();
  } catch (error) {
    console.error('[NPCMemory] Не удалось сохранить память персонажа:', error);
    saved = false;
  }
  if (saved !== false) return { saved: true, result };

  for (const key of Object.keys(memory)) delete memory[key];
  Object.assign(memory, snapshot);
  for (const [key, reference] of Object.entries(references)) {
    const previous = snapshot[key];
    if (Array.isArray(reference) && Array.isArray(previous)) {
      reference.splice(0, reference.length, ...previous.map(item =>
        item && typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item
      ));
      memory[key] = reference;
    } else if (reference && previous && typeof reference === 'object') {
      for (const nestedKey of Object.keys(reference)) delete reference[nestedKey];
      Object.assign(reference, previous);
      memory[key] = reference;
    }
  }
  if (!hadMemory) delete GameState.npcMemory[npcId];
  return { saved: false, result: null };
}

export var NPCMemory = {
  getMemory(npcId) {
    if (!GameState.npcMemory) GameState.npcMemory = {};
    if (!GameState.npcMemory[npcId]) {
      GameState.npcMemory[npcId] = {
        met: false,
        flags: {},
        conversationCount: 0,
        questionCount: 0,
        unlockedTopics: [],
        askedQuestions: [],
        criticalChoiceMade: false,
        interviewHistory: []
      };
    }
    return GameState.npcMemory[npcId];
  },

  hasMet(npcId) {
    return this.getMemory(npcId).met;
  },

  setFlag(npcId, flag, value) {
    const outcome = persistMemoryMutation(npcId, memory => {
      memory.flags[flag] = value !== false;
    });
    if (!outcome.saved) return false;
    Events.emit('npc:flag_set', { npcId, flag });
    return true;
  },

  hasFlag(npcId, flag) {
    return !!this.getMemory(npcId).flags[flag];
  },

  clearFlag(npcId, flag) {
    return persistMemoryMutation(npcId, memory => {
      delete memory.flags[flag];
    }).saved;
  },

  markMet(npcId) {
    return persistMemoryMutation(npcId, memory => {
      memory.met = true;
      memory.conversationCount++;
    }).saved;
  },

  recordInterview(npcId, details) {
    let event = null;
    const outcome = persistMemoryMutation(npcId, memory => {
      event = appendWitnessInterview(memory, { ...details, npcId: npcId });
      return event;
    });
    if (!outcome.saved || !event) return null;
    Events.emit('npc:interview_recorded', { npcId: npcId, sequence: event.sequence, tone: event.tone, response: event.response });
    return event;
  },

  getInterviewHistory(npcId) {
    return this.getMemory(npcId).interviewHistory || [];
  },

  getInterviewContext(npcId) {
    return getWitnessInterviewContext(this.getMemory(npcId));
  },

  commitCriticalChoice(npcId, input = {}) {
    if (!npcId || !input.choiceFlag) return null;
    const hadMemory = Object.prototype.hasOwnProperty.call(GameState.npcMemory || {}, npcId);
    const memory = this.getMemory(npcId);
    const previousMemory = JSON.parse(JSON.stringify(memory));
    const hadRelationship = Object.prototype.hasOwnProperty.call(GameState.relationships || {}, npcId);
    const previousRelationship = hadRelationship
      ? JSON.parse(JSON.stringify(GameState.relationships[npcId]))
      : null;
    const relationship = GameState.relationships[npcId] || { trust: 50, met: false };
    const trustBefore = relationship.trust;
    const trustDelta = Number.isFinite(input.trustDelta) ? input.trustDelta : 0;

    if (input.questionId && !memory.askedQuestions.includes(input.questionId)) {
      memory.askedQuestions.push(input.questionId);
    }
    memory.flags[input.choiceFlag] = true;
    if (input.memorySet) memory.flags[input.memorySet] = true;
    if (input.resultFlag) memory.flags[input.resultFlag] = true;
    if (input.memoryClear) delete memory.flags[input.memoryClear];

    relationship.trust = Math.max(0, Math.min(100, relationship.trust + trustDelta));
    relationship.met = true;
    GameState.relationships[npcId] = relationship;

    let saved = false;
    try {
      saved = GameState.save();
    } catch (error) {
      console.error('[NPCMemory] Не удалось сохранить решающий выбор:', error);
    }
    if (saved === false) {
      const flagsRef = memory.flags;
      const askedRef = memory.askedQuestions;
      const unlockedRef = memory.unlockedTopics;
      const interviewsRef = memory.interviewHistory;
      for (const key of Object.keys(memory)) {
        if (!['flags', 'askedQuestions', 'unlockedTopics', 'interviewHistory'].includes(key)) {
          delete memory[key];
        }
      }
      Object.assign(memory, previousMemory);
      for (const [target, snapshot] of [
        [flagsRef, previousMemory.flags],
        [askedRef, previousMemory.askedQuestions],
        [unlockedRef, previousMemory.unlockedTopics],
        [interviewsRef, previousMemory.interviewHistory]
      ]) {
        if (Array.isArray(target) && Array.isArray(snapshot)) target.splice(0, target.length, ...snapshot);
        else if (target && snapshot && typeof target === 'object' && typeof snapshot === 'object') {
          for (const key of Object.keys(target)) delete target[key];
          Object.assign(target, snapshot);
        }
      }
      memory.flags = flagsRef;
      memory.askedQuestions = askedRef;
      memory.unlockedTopics = unlockedRef;
      memory.interviewHistory = interviewsRef;
      if (!hadMemory) delete GameState.npcMemory[npcId];
      if (hadRelationship) {
        const current = GameState.relationships[npcId] || {};
        for (const key of Object.keys(current)) delete current[key];
        Object.assign(current, previousRelationship);
        GameState.relationships[npcId] = current;
      } else {
        delete GameState.relationships[npcId];
      }
      return null;
    }

    Events.emit('npc:flag_set', { npcId, flag: input.choiceFlag });
    if (input.memorySet) Events.emit('npc:flag_set', { npcId, flag: input.memorySet });
    if (input.resultFlag) Events.emit('npc:flag_set', { npcId, flag: input.resultFlag });
    if (trustDelta !== 0) {
      Events.emit('relationship:changed', {
        npcId,
        trust: relationship.trust,
        delta: relationship.trust - trustBefore,
        oldTrust: trustBefore
      });
    }
    return { trustBefore, trustAfter: relationship.trust };
  },

  changeTrust(npcId, delta) {
    GameState.updateRelationship(npcId, delta);
  },

  getTrust(npcId) {
    return GameState.getRelationship(npcId).trust;
  },

  unlockTopics(npcId, topicIds) {
    if (!Array.isArray(topicIds)) return false;
    return persistMemoryMutation(npcId, memory => {
      topicIds.forEach(tId => {
        if (memory.unlockedTopics.indexOf(tId) === -1) memory.unlockedTopics.push(tId);
      });
    }).saved;
  },

  getUnlockedTopics(npcId) {
    return this.getMemory(npcId).unlockedTopics || [];
  },

  markQuestionAsked(npcId, questionId) {
    if (typeof questionId !== 'string' || !questionId) return false;
    return persistMemoryMutation(npcId, memory => {
      if (memory.askedQuestions.indexOf(questionId) === -1) {
        memory.askedQuestions.push(questionId);
      }
    }).saved;
  },

  getAskedQuestions(npcId) {
    return this.getMemory(npcId).askedQuestions || [];
  },

  incrementQuestionCount(npcId) {
    return persistMemoryMutation(npcId, memory => {
      memory.questionCount = (memory.questionCount || 0) + 1;
    }).saved;
  },

  getQuestionCount(npcId) {
    return this.getMemory(npcId).questionCount || 0;
  },

  /**
   * Сбросить память конкретного NPC
   */
  resetNPC(npcId) {
    GameState.npcMemory[npcId] = {
      met: false,
      flags: {},
      conversationCount: 0,
      questionCount: 0,
      unlockedTopics: [],
      askedQuestions: [],
      criticalChoiceMade: false,
      interviewHistory: []
    };
    GameState.save();
    console.log('[NPCMemory] Память ' + npcId + ' сброшена');
  },

  /**
   * Сбросить память ВСЕХ NPC
   */
  resetAll() {
    GameState.npcMemory = {};
    GameState.save();
    console.log('[NPCMemory] Память всех NPC очищена');
  }
};