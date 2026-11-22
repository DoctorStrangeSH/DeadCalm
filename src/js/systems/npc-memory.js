import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { appendWitnessInterview, getWitnessInterviewContext } from './witness-interview-history.js';

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
    var memory = this.getMemory(npcId);
    memory.flags[flag] = value !== false;
    GameState.save();
    Events.emit('npc:flag_set', { npcId: npcId, flag: flag });
  },

  hasFlag(npcId, flag) {
    return !!this.getMemory(npcId).flags[flag];
  },

  clearFlag(npcId, flag) {
    var memory = this.getMemory(npcId);
    delete memory.flags[flag];
    GameState.save();
  },

  markMet(npcId) {
    var memory = this.getMemory(npcId);
    memory.met = true;
    memory.conversationCount++;
    GameState.save();
  },

  recordInterview(npcId, details) {
    var memory = this.getMemory(npcId);
    var event = appendWitnessInterview(memory, { ...details, npcId: npcId });
    if (!event) return null;
    GameState.save();
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
      for (const key of Object.keys(memory)) delete memory[key];
      Object.assign(memory, previousMemory);
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
    var memory = this.getMemory(npcId);
    var self = this;
    topicIds.forEach(function(tId) {
      if (memory.unlockedTopics.indexOf(tId) === -1) {
        memory.unlockedTopics.push(tId);
      }
    });
    GameState.save();
  },

  getUnlockedTopics(npcId) {
    return this.getMemory(npcId).unlockedTopics || [];
  },

  markQuestionAsked(npcId, questionId) {
    var memory = this.getMemory(npcId);
    if (memory.askedQuestions.indexOf(questionId) === -1) {
      memory.askedQuestions.push(questionId);
    }
    GameState.save();
  },

  getAskedQuestions(npcId) {
    return this.getMemory(npcId).askedQuestions || [];
  },

  incrementQuestionCount(npcId) {
    var memory = this.getMemory(npcId);
    memory.questionCount = (memory.questionCount || 0) + 1;
    GameState.save();
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