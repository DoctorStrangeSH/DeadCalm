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

  recordConversation(npcId, consumedFlag = null, memorySet = null) {
    if (typeof npcId !== 'string' || !npcId.trim()) return false;
    if (consumedFlag !== null && (typeof consumedFlag !== 'string' || !consumedFlag.trim())) return false;
    if (memorySet !== null && (typeof memorySet !== 'string' || !memorySet.trim())) return false;
    const outcome = persistMemoryMutation(npcId, memory => {
      memory.met = true;
      memory.conversationCount = (Number.isInteger(memory.conversationCount) && memory.conversationCount >= 0
        ? memory.conversationCount
        : 0) + 1;
      if (consumedFlag) memory.flags[consumedFlag] = true;
      if (memorySet) memory.flags[memorySet] = true;
    });
    if (!outcome.saved) return false;
    if (memorySet) Events.emit('npc:flag_set', { npcId, flag: memorySet });
    return true;
  },

  commitFirstMeeting(npcId, topicIds = []) {
    if (!Array.isArray(topicIds)) return false;
    return persistMemoryMutation(npcId, memory => {
      memory.met = true;
      memory.conversationCount++;
      topicIds.forEach(topicId => {
        if (memory.unlockedTopics.indexOf(topicId) === -1) {
          memory.unlockedTopics.push(topicId);
        }
      });
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
    const notebook = Array.isArray(GameState.notebook) ? GameState.notebook : (GameState.notebook = []);
    const caseClues = Array.isArray(GameState.currentCase?.clues)
      ? GameState.currentCase.clues
      : (GameState.currentCase.clues = []);
    const notebookSnapshot = JSON.parse(JSON.stringify(notebook));
    const cluesSnapshot = JSON.parse(JSON.stringify(caseClues));
    let addedNote = null;
    let addedClue = null;

    if (input.note && typeof input.note.title === 'string' && input.note.title.trim() &&
        typeof input.note.text === 'string' &&
        !notebook.some(item => item.title === input.note.title)) {
      addedNote = {
        title: input.note.title,
        text: input.note.text,
        category: input.note.category || 'общее',
        timestamp: new Date().toISOString()
      };
      notebook.push(addedNote);
    }

    if (input.clue && typeof input.clue.id === 'string' && input.clue.id &&
        !caseClues.some(item => item.id === input.clue.id)) {
      addedClue = {
        id: input.clue.id,
        name: input.clue.name,
        category: input.clue.category,
        description: input.clue.description,
        source: input.clue.source || null,
        location: input.clue.location,
        day: input.clue.day,
        connections_to: Array.isArray(input.clue.connections_to) ? [...input.clue.connections_to] : [],
        foundAt: new Date().toISOString()
      };
      caseClues.push(addedClue);
    }

    if (input.questionId && !memory.askedQuestions.includes(input.questionId)) {
      memory.askedQuestions.push(input.questionId);
    }
    memory.flags[input.choiceFlag] = true;
    if (typeof input.choiceFlag === 'string' && input.choiceFlag.startsWith('critical_')) {
      const nodeId = input.choiceFlag.slice('critical_'.length);
      memory.flags['critical_choice_resolved_' + nodeId] = true;
    }
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
      notebook.splice(0, notebook.length, ...notebookSnapshot);
      caseClues.splice(0, caseClues.length, ...cluesSnapshot);
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

    const committedFlags = [...new Set([input.choiceFlag, input.memorySet, input.resultFlag]
      .filter(flag => typeof flag === 'string' && flag.trim()))];
    for (const flag of committedFlags) {
      Events.emit('npc:flag_set', { npcId, flag });
    }
    if (addedClue) Events.emit('clue:added', input.clue);
    if (trustDelta !== 0) {
      Events.emit('relationship:changed', {
        npcId,
        trust: relationship.trust,
        delta: relationship.trust - trustBefore,
        oldTrust: trustBefore
      });
    }
    return { trustBefore, trustAfter: relationship.trust, addedNote, addedClue };
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

  markQuestionAsked(npcId, questionId, consequences = {}) {
    if (typeof questionId !== 'string' || !questionId) return false;
    const outcome = persistMemoryMutation(npcId, memory => {
      if (memory.askedQuestions.indexOf(questionId) === -1) {
        memory.askedQuestions.push(questionId);
      }
      if (consequences.memorySet) memory.flags[consequences.memorySet] = true;
      if (consequences.memoryClear) delete memory.flags[consequences.memoryClear];
    });
    if (!outcome.saved) return false;
    if (consequences.memorySet) {
      Events.emit('npc:flag_set', { npcId, flag: consequences.memorySet });
    }
    return true;
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
    if (typeof npcId !== 'string' || !npcId.trim()) return false;
    const outcome = persistMemoryMutation(npcId, memory => {
      memory.met = false;
      memory.flags = {};
      memory.conversationCount = 0;
      memory.questionCount = 0;
      memory.unlockedTopics = [];
      memory.askedQuestions = [];
      memory.criticalChoiceMade = false;
      memory.interviewHistory = [];
    });
    if (!outcome.saved) return false;
    console.log('[NPCMemory] Память ' + npcId + ' сброшена');
    return true;
  },

  /**
   * Сбросить память всех NPC только после подтверждённого сохранения.
   */
  resetAll() {
    const previous = GameState.npcMemory || {};
    const previousSnapshot = JSON.parse(JSON.stringify(previous));
    GameState.npcMemory = {};
    let saved = false;
    try {
      saved = GameState.save();
    } catch (error) {
      console.error('[NPCMemory] Не удалось сбросить память всех персонажей:', error);
    }
    if (saved === false) {
      GameState.npcMemory = previous;
      for (const key of Object.keys(previous)) delete previous[key];
      Object.assign(previous, previousSnapshot);
      return false;
    }
    console.log('[NPCMemory] Память всех NPC очищена');
    return true;
  }
};