import { Events } from './events.js';
import { Storage } from './storage.js';
import { createHypothesis, reviseHypothesis } from '../systems/hypotheses.js';
import { createEmptySocialGraph, normalizeSocialGraph, upsertSocialTie, appendSocialEvent, getSocialTies, getSocialContext } from '../systems/npc-social-graph.js';
import { createEmptyKnowledgeLedger, normalizeKnowledgeLedger, recordNpcKnowledge, updateNpcKnowledgeState, getNpcKnowledge, getNpcKnowledgeContext } from '../systems/npc-knowledge.js';
import { createEmptyDailyLife, normalizeDailyLife, upsertNpcSchedule, getNpcScheduleAt, recordNpcOccurrence, getNpcOccurrences } from '../systems/npc-daily-life.js';

export var GameState = {
  player: {
    name: 'Джон Риверс',
    reputation: 50,
  },

  currentCase: {
    id: 'case_001',
    clues: [],
    suspects: [],
    timeline: [],
  },

  flags: {},
  relationships: {},
  npcMemory: {},
  socialGraph: createEmptySocialGraph(),
  knowledgeLedger: createEmptyKnowledgeLedger(),
  npcDailyLife: createEmptyDailyLife(),
  notebook: [],

  settings: {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    textSpeed: 'normal',
  },

  init() {
    var saved = Storage.load('gameState');
    if (saved) {
      this.player = saved.player || this.player;
      this.currentCase = saved.currentCase || this.currentCase;
      this.flags = saved.flags || {};
      this.relationships = saved.relationships || {};
      this.npcMemory = saved.npcMemory || {};
      this.socialGraph = normalizeSocialGraph(saved.socialGraph);
      this.knowledgeLedger = normalizeKnowledgeLedger(saved.knowledgeLedger);
      this.npcDailyLife = normalizeDailyLife(saved.npcDailyLife);
      this.notebook = saved.notebook || [];
      this.settings = saved.settings || this.settings;
      console.log('[State] Состояние загружено');
      console.log('[State] - npcMemory: ' + Object.keys(this.npcMemory).length + ' NPC');
      console.log('[State] - clues: ' + this.currentCase.clues.length);
      console.log('[State] - notebook: ' + this.notebook.length);
    } else {
      console.log('[State] Новое состояние (без сохранения)');
    }
  },

  update(key, value) {
    var keys = key.split('.');
    var obj = this;
    for (var i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    Events.emit('state:changed', { key: key, value: value });
    this.save();
  },

  setFlag(flagName, value) {
    if (value === undefined) value = true;
    this.flags[flagName] = value;
    Events.emit('flag:set', { flag: flagName, value: value });
    this.save();
  },

  hasFlag(flagName) {
    return !!this.flags[flagName];
  },

  clearFlag(flagName) {
    delete this.flags[flagName];
    Events.emit('flag:cleared', { flag: flagName });
    this.save();
  },

  addClue(clue) {
    if (this.currentCase.clues.find(function(c) { return c.id === clue.id; })) {
      return;
    }
    this.currentCase.clues.push({
      id: clue.id,
      name: clue.name,
      category: clue.category,
      description: clue.description,
      source: clue.source || null,
      location: clue.location,
      day: clue.day,
      connections_to: Array.isArray(clue.connections_to) ? [...clue.connections_to] : [],
      foundAt: new Date().toISOString()
    });
    Events.emit('clue:added', clue);
    this.save();
  },

  addHypothesis(input) {
    if (!Array.isArray(this.currentCase.hypotheses)) this.currentCase.hypotheses = [];
    const hypothesis = createHypothesis({ ...input,
      id: 'hyp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    }, this.currentCase.clues);
    this.currentCase.hypotheses.push(hypothesis);
    this.save();
    Events.emit('hypothesis:created', hypothesis);
    return hypothesis;
  },

  reviseHypothesis(id, change) {
    const hypotheses = this.currentCase.hypotheses || [];
    const index = hypotheses.findIndex(item => item.id === id);
    if (index === -1) return null;
    const revised = reviseHypothesis(hypotheses[index], change, this.currentCase.clues);
    if (revised === hypotheses[index]) return revised;
    hypotheses[index] = revised;
    this.save();
    Events.emit('hypothesis:revised', revised);
    return revised;
  },

  hasClue(clueId) {
    return this.currentCase.clues.some(function(c) { return c.id === clueId; });
  },

  getClue(clueId) {
    return this.currentCase.clues.find(function(c) { return c.id === clueId; }) || null;
  },

  // Older saves omitted the source field even when it existed in the authored catalog.
  restoreClueSources(catalog = {}) {
    if (!this.currentCase || !Array.isArray(this.currentCase.clues)) return 0;
    let restored = 0;
    for (const clue of this.currentCase.clues) {
      if (!clue || clue.source || typeof clue.id !== 'string') continue;
      const source = Object.hasOwn(catalog, clue.id) ? catalog[clue.id]?.source : null;
      if (typeof source !== 'string' || !source.trim()) continue;
      clue.source = source;
      restored++;
    }
    if (restored) this.save();
    return restored;
  },

  recordSocialTie(input) {
    const tie = upsertSocialTie(this.socialGraph, input);
    if (!tie) return null;
    this.save();
    Events.emit('social:tie_updated', tie);
    return tie;
  },

  recordSocialEvent(input) {
    const event = appendSocialEvent(this.socialGraph, input);
    if (!event) return null;
    this.save();
    Events.emit('social:event_recorded', event);
    return event;
  },

  getSocialTies(npcId) { return getSocialTies(this.socialGraph, npcId); },

  getSocialContext(npcId) { return getSocialContext(this.socialGraph, npcId); },

  recordNpcKnowledge(input) {
    const entry = recordNpcKnowledge(this.knowledgeLedger, input);
    if (!entry) return null;
    this.save();
    Events.emit('npc:knowledge_recorded', entry);
    return entry;
  },

  updateNpcKnowledgeState(entryId, state, reason) {
    const entry = updateNpcKnowledgeState(this.knowledgeLedger, entryId, state, reason);
    if (!entry) return null;
    this.save();
    Events.emit('npc:knowledge_updated', entry);
    return entry;
  },

  getNpcKnowledge(npcId) { return getNpcKnowledge(this.knowledgeLedger, npcId); },

  getNpcKnowledgeContext(npcId) { return getNpcKnowledgeContext(this.knowledgeLedger, npcId); },

  setNpcSchedule(input) {
    const schedule = upsertNpcSchedule(this.npcDailyLife, input);
    if (!schedule) return null;
    this.save();
    Events.emit('npc:schedule_updated', schedule);
    return schedule;
  },

  getNpcScheduleAt(npcId, day, minute) {
    return getNpcScheduleAt(this.npcDailyLife, npcId, day, minute);
  },

  recordNpcOccurrence(input) {
    const occurrence = recordNpcOccurrence(this.npcDailyLife, input);
    if (!occurrence) return null;
    this.save();
    Events.emit('npc:occurrence_recorded', occurrence);
    return occurrence;
  },

  getNpcOccurrences(npcId) { return getNpcOccurrences(this.npcDailyLife, npcId); },

  updateRelationship(npcId, delta) {
    if (!this.relationships[npcId]) {
      this.relationships[npcId] = { trust: 50, met: false };
    }
    var oldTrust = this.relationships[npcId].trust;
    this.relationships[npcId].trust = Math.max(0, Math.min(100,
      this.relationships[npcId].trust + delta
    ));
    this.relationships[npcId].met = true;
    Events.emit('relationship:changed', {
      npcId: npcId,
      trust: this.relationships[npcId].trust,
      delta: delta,
      oldTrust: oldTrust
    });
    this.save();
  },

  getRelationship(npcId) {
    return this.relationships[npcId] || { trust: 50, met: false };
  },

  addSuspect(suspect) {
    if (this.currentCase.suspects.find(function(s) { return s.id === suspect.id; })) return;
    this.currentCase.suspects.push(suspect);
    Events.emit('suspect:added', suspect);
    this.save();
  },

  addTimelineEvent(event) {
    if (this.currentCase.timeline.find(function(e) { return e.id === event.id; })) return;
    this.currentCase.timeline.push({
      id: event.id,
      title: event.title,
      description: event.description,
      time: event.time,
      addedAt: new Date().toISOString()
    });
    Events.emit('timeline:updated', this.currentCase.timeline);
    this.save();
  },

  save() {
    Storage.save('gameState', {
      player: this.player,
      currentCase: this.currentCase,
      flags: this.flags,
      relationships: this.relationships,
      npcMemory: this.npcMemory,
      socialGraph: this.socialGraph,
      knowledgeLedger: this.knowledgeLedger,
      npcDailyLife: this.npcDailyLife,
      notebook: this.notebook,
      settings: this.settings,
    });
  },

  /**
   * ПОЛНЫЙ СБРОС
   */
  reset() {
    console.log('═══════════════════════════════');
    console.log('[State] ⚠️ ПОЛНЫЙ СБРОС');
    console.log('[State] До:');
    console.log('[State] - npcMemory: ' + Object.keys(this.npcMemory).length + ' NPC');
    console.log('[State] - relationships: ' + Object.keys(this.relationships).length);
    console.log('[State] - clues: ' + this.currentCase.clues.length);
    console.log('[State] - notebook: ' + this.notebook.length);
    console.log('[State] - flags: ' + Object.keys(this.flags).length);
    
    // Сбрасываем
    this.player = { name: 'Джон Риверс', reputation: 50 };
    this.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [] };
    this.flags = {};
    this.relationships = {};
    this.npcMemory = {};
    this.socialGraph = createEmptySocialGraph();
    this.knowledgeLedger = createEmptyKnowledgeLedger();
    this.npcDailyLife = createEmptyDailyLife();
    this.notebook = [];
    this.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };
    
    // Очищаем localStorage
    Storage.clearAll();
    
    // Сохраняем пустое
    this.save();
    
    Events.emit('state:reset');
    
    console.log('[State] После:');
    console.log('[State] - npcMemory: ' + Object.keys(this.npcMemory).length + ' NPC');
    console.log('[State] - relationships: ' + Object.keys(this.relationships).length);
    console.log('[State] - clues: ' + this.currentCase.clues.length);
    console.log('[State] - notebook: ' + this.notebook.length);
    console.log('[State] ✅ Сброс завершён');
    console.log('═══════════════════════════════');
  },

  hasSave() {
    return Storage.exists('gameState');
  },

  export() {
    return {
      player: Object.assign({}, this.player),
      currentCase: {
        id: this.currentCase.id,
        clues: this.currentCase.clues.slice(),
        suspects: this.currentCase.suspects.slice(),
        timeline: this.currentCase.timeline.slice()
      },
      flags: Object.assign({}, this.flags),
      relationships: Object.assign({}, this.relationships),
      npcMemory: JSON.parse(JSON.stringify(this.npcMemory)),
      socialGraph: JSON.parse(JSON.stringify(this.socialGraph)),
      knowledgeLedger: JSON.parse(JSON.stringify(this.knowledgeLedger)),
      npcDailyLife: JSON.parse(JSON.stringify(this.npcDailyLife)),
      notebook: this.notebook.slice(),
      settings: Object.assign({}, this.settings)
    };
  }
};
