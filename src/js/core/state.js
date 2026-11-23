import { Events } from './events.js';
import { Storage } from './storage.js';
import { createHypothesis, reviseHypothesis } from '../systems/hypotheses.js';
import { createEmptySocialGraph, normalizeSocialGraph, upsertSocialTie, appendSocialEvent, getSocialTies, getSocialContext } from '../systems/npc-social-graph.js';
import { createEmptyKnowledgeLedger, normalizeKnowledgeLedger, recordNpcKnowledge, transferNpcKnowledge, transferNpcRumor, challengeNpcKnowledge, updateNpcKnowledgeState, getNpcKnowledge, getNpcKnowledgeContext } from '../systems/npc-knowledge.js';
import { createEmptyDailyLife, normalizeDailyLife, upsertNpcSchedule, getNpcScheduleAt, recordNpcOccurrence, getNpcOccurrences } from '../systems/npc-daily-life.js';
import { createEmptyMiniGameProgress, normalizeMiniGameProgress, recordMiniGameResult } from '../systems/minigame-progress.js';
import { assessCampaignDay, assessFinalEvidence } from '../systems/campaign-progression.js';
import { migrateSave, CURRENT_SAVE_VERSION } from './save-migrations.js';

const INITIAL_CAMPAIGN = Object.freeze({
  caseId: 'case_001',
  day: 1,
  completed: false,
  ending: null
});

const DEFAULT_SETTINGS = Object.freeze({ musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' });
const TEXT_SPEEDS = new Set(['slow', 'normal', 'fast']);

function normalizeSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const volume = (value, fallback) => Number.isFinite(Number(value))
    ? Math.max(0, Math.min(1, Number(value)))
    : fallback;
  return {
    musicVolume: volume(source.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volume(source.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    textSpeed: TEXT_SPEEDS.has(source.textSpeed) ? source.textSpeed : DEFAULT_SETTINGS.textSpeed
  };
}

function normalizeCampaignState(savedCampaign, flags = {}) {
  const inferredDay = [5, 4, 3, 2].find(day => flags?.['day_' + day]) || 1;
  const day = Number.isInteger(savedCampaign?.day)
    ? Math.max(1, Math.min(5, savedCampaign.day))
    : inferredDay;
  const ending = ['open_case', 'price_of_silence'].includes(savedCampaign?.ending)
    ? savedCampaign.ending
    : null;
  return { caseId: 'case_001', day, completed: Boolean(savedCampaign?.completed && ending), ending };
}

/** Persist a mutation of an NPC world-state collection atomically. */
function persistNpcCollectionMutation(state, property, mutate) {
  const collection = state[property];
  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) return null;

  let snapshot;
  try {
    snapshot = JSON.parse(JSON.stringify(collection));
  } catch (error) {
    console.error('[State] Не удалось подготовить откат NPC-данных:', error);
    return null;
  }
  const arrayRefs = Object.fromEntries(
    Object.entries(collection).filter(([, value]) => Array.isArray(value))
  );

  let result;
  try {
    result = mutate(collection);
  } catch (error) {
    console.error('[State] Ошибка изменения NPC-данных:', error);
    return null;
  }
  if (!result) return null;

  let saved = false;
  try {
    saved = state.save();
  } catch (error) {
    console.error('[State] Не удалось сохранить NPC-данные:', error);
  }
  if (saved !== false) return result;

  for (const key of Object.keys(collection)) {
    if (!Object.hasOwn(snapshot, key)) delete collection[key];
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (Array.isArray(arrayRefs[key]) && Array.isArray(value)) {
      arrayRefs[key].splice(0, arrayRefs[key].length, ...value);
      collection[key] = arrayRefs[key];
    } else if (value && typeof value === 'object') {
      collection[key] = JSON.parse(JSON.stringify(value));
    } else {
      collection[key] = value;
    }
  }
  console.warn('[State] NPC-изменение отменено: сохранение не подтверждено.');
  return null;
}
function findNpcMeetingRefs(socialGraph, dailyLife, sourceNpcId, recipientNpcId) {
  const socialEvent = socialGraph?.events?.find(event =>
    ((event.fromNpcId === sourceNpcId && event.toNpcId === recipientNpcId) ||
     (event.fromNpcId === recipientNpcId && event.toNpcId === sourceNpcId)) &&
    event.sourceType === 'direct_observation' && event.certainty === 'corroborated'
  );
  if (!socialEvent) return null;
  const sourceOccurrences = (dailyLife?.occurrences || []).filter(item => item.npcId === sourceNpcId);
  const recipientOccurrences = (dailyLife?.occurrences || []).filter(item => item.npcId === recipientNpcId);
  const sharedWindow = sourceOccurrences.flatMap(source => recipientOccurrences
    .filter(recipient => recipient.day === source.day &&
      recipient.locationId === source.locationId &&
      Math.abs(recipient.minute - source.minute) <= 15)
    .map(recipient => ({ source, recipient })))
    .sort((a, b) => Math.abs(a.source.minute - a.recipient.minute) -
      Math.abs(b.source.minute - b.recipient.minute))[0];
  return sharedWindow
    ? [socialEvent.id, sharedWindow.source.id, sharedWindow.recipient.id]
    : null;
}

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

  campaign: { ...INITIAL_CAMPAIGN },

  flags: {},
  relationships: {},
  npcMemory: {},
  socialGraph: createEmptySocialGraph(),
  knowledgeLedger: createEmptyKnowledgeLedger(),
  npcDailyLife: createEmptyDailyLife(),
  miniGameProgress: createEmptyMiniGameProgress(),
  notebook: [],
  saveBlocked: false,
  saveStatus: 'missing',

  settings: {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    textSpeed: 'normal',
  },

  init() {
    const inspection = typeof Storage.inspect === 'function' ? Storage.inspect('gameState') : null;
    const loadedSave = Storage.load('gameState');
    var rawSaved = loadedSave || (inspection?.status === 'valid' ? inspection.data : null);
    this.saveStatus = rawSaved ? 'valid' : (inspection?.status || 'missing');
    this.saveBlocked = false;
    if (!rawSaved && (inspection
      ? ['corrupt', 'unavailable'].includes(inspection.status) || Storage.hasAnyRecord('gameState')
      : Storage.hasAnyRecord('gameState'))) {
      this.saveBlocked = true;
      Events.emit('save:invalid', { reason: 'no-valid-recovery-copy' });
      console.error('[State] Все копии сохранения повреждены. Исходные данные оставлены нетронутыми; запись заблокирована.');
      return false;
    }
    const migration = rawSaved ? migrateSave(rawSaved) : null;
    if (migration && migration.status === 'unsupported') {
      this.saveBlocked = true;
      Events.emit('save:unsupported_version', { found: migration.fromVersion, supported: CURRENT_SAVE_VERSION });
      console.error('[State] Сохранение создано более новой версией игры. Запись заблокирована для защиты данных.');
      return false;
    }
    if (migration && migration.status === 'invalid') {
      this.saveBlocked = true;
      Events.emit('save:invalid', { reason: migration.reason });
      console.error('[State] Формат сохранения неизвестен. Запись заблокирована для защиты данных.');
      return false;
    }
    var saved = migration ? migration.data : null;
    if (saved) {
      this.player = saved.player || this.player;
      this.currentCase = saved.currentCase || this.currentCase;
      this.flags = saved.flags || {};
      this.campaign = normalizeCampaignState(saved.campaign, this.flags);
      this._syncCampaignFlags();
      this.relationships = saved.relationships || {};
      this.npcMemory = saved.npcMemory || {};
      this.socialGraph = normalizeSocialGraph(saved.socialGraph);
      this.knowledgeLedger = normalizeKnowledgeLedger(saved.knowledgeLedger);
      this.npcDailyLife = normalizeDailyLife(saved.npcDailyLife);
      this.miniGameProgress = normalizeMiniGameProgress(saved.miniGameProgress);
      this.notebook = saved.notebook || [];
      this.settings = normalizeSettings(saved.settings);
      this.saveStatus = 'valid';
      if (migration.migrated) {
        console.log('[State] Сохранение обновлено со схемы ' + migration.fromVersion + ' до ' + migration.toVersion);
        this.save();
      }
      console.log('[State] Состояние загружено');
      console.log('[State] - npcMemory: ' + Object.keys(this.npcMemory).length + ' NPC');
      console.log('[State] - clues: ' + this.currentCase.clues.length);
      console.log('[State] - notebook: ' + this.notebook.length);
    } else {
      this.campaign = { ...INITIAL_CAMPAIGN };
      this.settings = normalizeSettings(null);
      this.saveStatus = 'missing';
      console.log('[State] Новое состояние (без сохранения)');
    }
    return true;
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

  _syncCampaignFlags() {
    for (let day = 2; day <= 5; day++) {
      if (this.campaign.day >= day) this.flags['day_' + day] = true;
      else delete this.flags['day_' + day];
    }
  },

  setCampaignDay(day) {
    if (!Number.isInteger(day) || day < 1 || day > 5) return false;
    if (this.campaign.completed || day < this.campaign.day || day > this.campaign.day + 1) return false;
    if (day > this.campaign.day && !assessCampaignDay(this).canAdvance) return false;
    const previousDay = this.campaign.day;
    const previousFlags = { ...this.flags };
    this.campaign.day = day;
    this._syncCampaignFlags();
    let saved;
    try {
      saved = this.save();
    } catch (error) {
      console.error('[State] Не удалось сохранить переход дня кампании:', error);
      saved = false;
    }
    if (saved === false) {
      this.campaign.day = previousDay;
      for (const key of Object.keys(this.flags)) delete this.flags[key];
      Object.assign(this.flags, previousFlags);
      return false;
    }
    Events.emit('campaign:day_changed', { previousDay, day });
    return true;
  },

  advanceCampaignDay() {
    if (this.campaign.completed || this.campaign.day >= 5) return false;
    return this.setCampaignDay(this.campaign.day + 1);
  },

  completeCampaign(ending) {
    if (this.campaign.completed || this.campaign.day !== 5) return false;
    if (!['open_case', 'price_of_silence'].includes(ending)) return false;
    const evidence = assessFinalEvidence(this);
    if (ending === 'open_case' ? !evidence.fullDisclosureReady : !evidence.ready) return false;
    // The compromise ending is only valid after the sealed written confession
    // is recorded as a case exhibit; UI-only creation is not a state boundary.
    if (ending === 'price_of_silence' && !this.hasClue('sebastian_sealed_confession')) return false;
    const previousCompleted = this.campaign.completed;
    const previousEnding = this.campaign.ending;
    this.campaign.completed = true;
    this.campaign.ending = ending;
    let saved = false;
    try {
      saved = this.save() === true;
    } catch (error) {
      console.error('[State] Не удалось сохранить завершение кампании:', error);
    }
    if (!saved) {
      this.campaign.completed = previousCompleted;
      this.campaign.ending = previousEnding;
      return false;
    }
    Events.emit('campaign:completed', { caseId: this.campaign.caseId, ending });
    return true;
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
    if (!clue || typeof clue.id !== 'string' || !clue.id) return false;
    if (this.currentCase.clues.find(function(c) { return c.id === clue.id; })) {
      return false;
    }
    const record = {
      id: clue.id,
      name: clue.name,
      category: clue.category,
      description: clue.description,
      source: clue.source || null,
      location: clue.location,
      day: clue.day,
      connections_to: Array.isArray(clue.connections_to) ? [...clue.connections_to] : [],
      ...(Number.isFinite(clue.quality) ? { quality: clue.quality } : {}),
      foundAt: new Date().toISOString()
    };
    this.currentCase.clues.push(record);
    let saved;
    try {
      saved = this.save();
    } catch (error) {
      console.error('[State] Не удалось сохранить найденную улику:', error);
      saved = false;
    }
    if (saved === false) {
      this.currentCase.clues.pop();
      return false;
    }
    Events.emit('clue:added', clue);
    return true;
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
    const tie = persistNpcCollectionMutation(this, 'socialGraph', graph => upsertSocialTie(graph, input));
    if (!tie) return null;
    Events.emit('social:tie_updated', tie);
    return tie;
  },

  recordSocialEvent(input) {
    const event = persistNpcCollectionMutation(this, 'socialGraph', graph => appendSocialEvent(graph, input));
    if (!event) return null;
    Events.emit('social:event_recorded', event);
    return event;
  },

  getSocialTies(npcId) { return getSocialTies(this.socialGraph, npcId); },

  getSocialContext(npcId) { return getSocialContext(this.socialGraph, npcId); },

  recordNpcKnowledge(input) {
    const entry = persistNpcCollectionMutation(this, 'knowledgeLedger', ledger => recordNpcKnowledge(ledger, input));
    if (!entry) return null;
    Events.emit('npc:knowledge_recorded', entry);
    return entry;
  },

  transferNpcKnowledge(input) {
    if (!input || typeof input.fromNpcId !== 'string' || typeof input.toNpcId !== 'string') return null;
    const meetingRefs = findNpcMeetingRefs(this.socialGraph, this.npcDailyLife, input.fromNpcId, input.toNpcId);
    if (!meetingRefs) return null;
    const entry = persistNpcCollectionMutation(this, 'knowledgeLedger', ledger =>
      transferNpcKnowledge(ledger, { ...input, meetingRefs }));
    if (!entry) return null;
    Events.emit('npc:knowledge_transferred', entry);
    Events.emit('npc:knowledge_recorded', entry);
    return entry;
  },

  transferNpcRumor(input) {
    if (!input || typeof input.fromNpcId !== 'string' || typeof input.toNpcId !== 'string') return null;
    const meetingRefs = findNpcMeetingRefs(this.socialGraph, this.npcDailyLife, input.fromNpcId, input.toNpcId);
    if (!meetingRefs) return null;
    const entry = persistNpcCollectionMutation(this, 'knowledgeLedger', ledger =>
      transferNpcRumor(ledger, { ...input, meetingRefs }));
    if (!entry) return null;
    Events.emit('npc:rumor_transferred', entry);
    Events.emit('npc:knowledge_recorded', entry);
    return entry;
  },

  challengeNpcKnowledge(input) {
    const entry = persistNpcCollectionMutation(this, 'knowledgeLedger', ledger =>
      challengeNpcKnowledge(ledger, input, this.currentCase?.clues || []));
    if (!entry) return null;
    Events.emit('npc:knowledge_challenged', entry);
    Events.emit('npc:knowledge_updated', entry);
    return entry;
  },

  updateNpcKnowledgeState(entryId, state, reason) {
    const entry = persistNpcCollectionMutation(this, 'knowledgeLedger', ledger =>
      updateNpcKnowledgeState(ledger, entryId, state, reason));
    if (!entry) return null;
    Events.emit('npc:knowledge_updated', entry);
    return entry;
  },

  getNpcKnowledge(npcId) { return getNpcKnowledge(this.knowledgeLedger, npcId); },

  getNpcKnowledgeContext(npcId) { return getNpcKnowledgeContext(this.knowledgeLedger, npcId); },

  setNpcSchedule(input) {
    const schedule = persistNpcCollectionMutation(this, 'npcDailyLife', life => upsertNpcSchedule(life, input));
    if (!schedule) return null;
    Events.emit('npc:schedule_updated', schedule);
    return schedule;
  },

  getNpcScheduleAt(npcId, day, minute) {
    return getNpcScheduleAt(this.npcDailyLife, npcId, day, minute);
  },

  recordNpcOccurrence(input) {
    const occurrence = persistNpcCollectionMutation(this, 'npcDailyLife', life => recordNpcOccurrence(life, input));
    if (!occurrence) return null;
    Events.emit('npc:occurrence_recorded', occurrence);
    return occurrence;
  },

  getNpcOccurrences(npcId) { return getNpcOccurrences(this.npcDailyLife, npcId); },

  recordMiniGameResult(input) {
    const result = recordMiniGameResult(this.miniGameProgress, input);
    if (!result) return null;
    this.save();
    Events.emit('minigame:result_recorded', result);
    return result;
  },

  ensureRelationship(npcId, initialTrust = 50) {
    if (!this.relationships[npcId]) {
      const trust = Number.isFinite(initialTrust)
        ? Math.max(0, Math.min(100, initialTrust))
        : 50;
      this.relationships[npcId] = { trust, met: false };
      let saved = false;
      try {
        saved = this.save();
      } catch (error) {
        console.error('[State] Не удалось сохранить начальные отношения NPC:', error);
      }
      if (saved === false) {
        delete this.relationships[npcId];
        return null;
      }
    }
    return this.relationships[npcId];
  },

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
    if (this.saveBlocked) {
      console.warn('[State] Сохранение заблокировано: исходные данные требуют более новой версии игры или проверки.');
      return false;
    }
    const saved = Storage.save('gameState', {
      player: this.player,
      currentCase: this.currentCase,
      campaign: this.campaign,
      flags: this.flags,
      relationships: this.relationships,
      npcMemory: this.npcMemory,
      socialGraph: this.socialGraph,
      knowledgeLedger: this.knowledgeLedger,
      npcDailyLife: this.npcDailyLife,
      miniGameProgress: this.miniGameProgress,
      notebook: this.notebook,
      settings: this.settings,
      schemaVersion: CURRENT_SAVE_VERSION
    });
    this.saveStatus = saved ? 'valid' : 'unavailable';
    return saved;
  },

  /**
   * ПОЛНЫЙ СБРОС
   */
  reset() {
    const preservedSettings = normalizeSettings(this.settings);
    console.log('═══════════════════════════════');
    console.log('[State] ⚠️ ПОЛНЫЙ СБРОС');

    const previousState = {
      player: this.player,
      currentCase: this.currentCase,
      campaign: this.campaign,
      flags: this.flags,
      relationships: this.relationships,
      npcMemory: this.npcMemory,
      socialGraph: this.socialGraph,
      knowledgeLedger: this.knowledgeLedger,
      npcDailyLife: this.npcDailyLife,
      miniGameProgress: this.miniGameProgress,
      notebook: this.notebook,
      settings: this.settings,
      saveBlocked: this.saveBlocked
    };

    // An explicit reset may replace an incompatible save, but the old state
    // remains available until the complete fresh state is safely staged.
    this.saveBlocked = false;
    this.player = { name: 'Джон Риверс', reputation: 50 };
    this.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    this.campaign = { ...INITIAL_CAMPAIGN };
    this.flags = {};
    this.relationships = {};
    this.npcMemory = {};
    this.socialGraph = createEmptySocialGraph();
    this.knowledgeLedger = createEmptyKnowledgeLedger();
    this.npcDailyLife = createEmptyDailyLife();
    this.miniGameProgress = createEmptyMiniGameProgress();
    this.notebook = [];
    this.settings = preservedSettings;
    this.saveStatus = 'missing';

    if (!this.save()) {
      Object.assign(this, previousState);
      console.error('[State] Сброс отменён: новое сохранение не удалось безопасно записать.');
      return false;
    }

    // A deliberate new game must not fall back to the previous campaign if
    // the new primary record is damaged later.
    Storage.removeBackup('gameState');
    Events.emit('state:reset');

    console.log('[State] ✅ Новая кампания сохранена');
    console.log('═══════════════════════════════');
    return true;
  },

  hasSave() {
    const inspection = typeof Storage.inspect === 'function' ? Storage.inspect('gameState') : null;
    if (inspection) {
      this.saveStatus = inspection.status;
      return inspection.status === 'valid';
    }
    return Storage.hasAnyRecord('gameState');
  },

  export() {
    return JSON.parse(JSON.stringify({
      player: this.player,
      currentCase: this.currentCase,
      campaign: this.campaign,
      flags: this.flags,
      relationships: this.relationships,
      npcMemory: this.npcMemory,
      socialGraph: this.socialGraph,
      knowledgeLedger: this.knowledgeLedger,
      npcDailyLife: this.npcDailyLife,
      miniGameProgress: this.miniGameProgress,
      notebook: this.notebook,
      settings: this.settings,
      schemaVersion: CURRENT_SAVE_VERSION
    }));
  },

  importSave(payload) {
    const migration = migrateSave(payload);
    if (migration.status !== 'ok') return false;
    const data = migration.data;
    const campaign = normalizeCampaignState(data.campaign, data.flags);
    const flags = { ...(data.flags || {}) };
    const currentCase = data.currentCase
      ? { ...data.currentCase }
      : { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };

    // A save-file checksum detects accidental corruption; it is not proof that
    // a hypothesis was independently verified by the game. Never import a
    // player-editable "confirmed" label as an established finding.
    currentCase.hypotheses = (Array.isArray(currentCase.hypotheses) ? currentCase.hypotheses : [])
      .map(hypothesis => {
        if (!hypothesis || hypothesis.status !== 'confirmed') return hypothesis;
        const clueIds = Array.isArray(hypothesis.clueIds) ? [...hypothesis.clueIds] : [];
        const history = Array.isArray(hypothesis.history) ? [...hypothesis.history] : [];
        history.push({
          at: new Date().toISOString(),
          type: 'revised',
          status: 'probable',
          clueIds,
          reasoning: typeof hypothesis.reasoning === 'string' ? hypothesis.reasoning : '',
          title: typeof hypothesis.title === 'string' ? hypothesis.title : ''
        });
        return { ...hypothesis, status: 'probable', history, importReviewRequired: true };
      });

    for (let day = 2; day <= 5; day++) {
      if (campaign.day >= day) flags['day_' + day] = true;
      else delete flags['day_' + day];
    }
    const savePayload = {
      ...data,
      currentCase,
      campaign,
      flags,
      schemaVersion: CURRENT_SAVE_VERSION
    };

    // Commit the canonical campaign and matching day flags before changing live state.
    if (!Storage.save('gameState', savePayload)) return false;

    this.saveBlocked = false;
    this.player = data.player || { name: 'Джон Риверс', reputation: 50 };
    this.currentCase = currentCase;
    this.flags = flags;
    this.campaign = campaign;
    this.relationships = data.relationships || {};
    this.npcMemory = data.npcMemory || {};
    this.socialGraph = normalizeSocialGraph(data.socialGraph);
    this.knowledgeLedger = normalizeKnowledgeLedger(data.knowledgeLedger);
    this.npcDailyLife = normalizeDailyLife(data.npcDailyLife);
    this.miniGameProgress = normalizeMiniGameProgress(data.miniGameProgress);
    this.notebook = data.notebook || [];
    this.settings = normalizeSettings(data.settings);
    Events.emit('state:imported', { campaign: this.campaign });
    return true;
  }};
