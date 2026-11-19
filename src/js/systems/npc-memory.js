import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

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
        criticalChoiceMade: false
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