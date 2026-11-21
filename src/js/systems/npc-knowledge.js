const SOURCE_TYPES = new Set(['direct_observation','document','interview','rumor','inference']);
const KNOWLEDGE_STATES = new Set(['unverified','corroborated','disputed']);

export function createEmptyKnowledgeLedger() {
  return { entries: [] };
}

function cleanRefs(refs) {
  return Array.isArray(refs)
    ? [...new Set(refs.filter(ref => typeof ref === 'string' && ref.trim()))]
    : [];
}

function cloneEntry(entry) {
  return {
    ...entry,
    sourceRefs: [...(entry.sourceRefs || [])],
    stateHistory: Array.isArray(entry.stateHistory)
      ? entry.stateHistory.map(item => ({ ...item }))
      : []
  };
}

function normalizeStateHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter(item =>
    item && KNOWLEDGE_STATES.has(item.from) && KNOWLEDGE_STATES.has(item.to) &&
    item.from !== item.to && typeof item.reason === 'string' && !!item.reason.trim()
  ).map(item => ({
    from: item.from,
    to: item.to,
    reason: item.reason.trim(),
    changedAt: typeof item.changedAt === 'string' ? item.changedAt : null
  }));
}

function isValidEntry(entry) {
  return !!entry && typeof entry.id === 'string' && !!entry.id.trim() &&
    typeof entry.npcId === 'string' && !!entry.npcId.trim() &&
    typeof entry.claimRef === 'string' && !!entry.claimRef.trim() &&
    SOURCE_TYPES.has(entry.sourceType) && KNOWLEDGE_STATES.has(entry.state) &&
    typeof entry.provenance === 'string' && !!entry.provenance.trim() &&
    (entry.sourceNpcId == null || (typeof entry.sourceNpcId === 'string' && !!entry.sourceNpcId.trim()));
}

export function normalizeKnowledgeLedger(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.entries)) {
    return createEmptyKnowledgeLedger();
  }
  const entries = value.entries.filter(isValidEntry);
  const seen = new Set();
  return {
    entries: entries.filter(entry => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).map(entry => ({
      ...entry,
      sourceRefs: cleanRefs(entry.sourceRefs),
      stateHistory: normalizeStateHistory(entry.stateHistory)
    }))
  };
}

/**
 * Record what an NPC believes or knows about a claim.
 * This records attributed knowledge, never the truth of the claim itself.
 */
export function recordNpcKnowledge(ledger, input) {
  if (!ledger || !Array.isArray(ledger.entries) || !input || typeof input !== 'object') return null;
  const { npcId, claimRef, sourceType, provenance, state = 'unverified', sourceNpcId = null } = input;
  if (typeof npcId !== 'string' || !npcId.trim() ||
      typeof claimRef !== 'string' || !claimRef.trim() ||
      !SOURCE_TYPES.has(sourceType) || !KNOWLEDGE_STATES.has(state) ||
      typeof provenance !== 'string' || !provenance.trim() ||
      (sourceNpcId !== null && (typeof sourceNpcId !== 'string' || !sourceNpcId.trim())) ||
      sourceNpcId === npcId) return null;

  const id = typeof input.id === 'string' && input.id.trim()
    ? input.id.trim()
    : 'knowledge-' + (ledger.entries.length + 1);
  if (ledger.entries.some(entry => entry.id === id)) return null;

  const entry = {
    id, npcId, claimRef, sourceType, state, provenance: provenance.trim(),
    sourceNpcId,
    sourceRefs: cleanRefs(input.sourceRefs),
    stateHistory: [],
    recordedAt: typeof input.recordedAt === 'string' ? input.recordedAt : new Date().toISOString()
  };
  ledger.entries.push(entry);
  return cloneEntry(entry);
}

export function updateNpcKnowledgeState(ledger, entryId, state, reason) {
  if (!ledger || !Array.isArray(ledger.entries) || !KNOWLEDGE_STATES.has(state) ||
      typeof reason !== 'string' || !reason.trim()) return null;
  const entry = ledger.entries.find(item => item.id === entryId);
  if (!entry || entry.state === state) return null;
  const previousState = entry.state;
  entry.state = state;
  entry.stateHistory = normalizeStateHistory(entry.stateHistory);
  entry.stateHistory.push({
    from: previousState,
    to: state,
    reason: reason.trim(),
    changedAt: new Date().toISOString()
  });
  return cloneEntry(entry);
}

export function getNpcKnowledge(ledger, npcId) {
  if (!ledger || !Array.isArray(ledger.entries) || typeof npcId !== 'string') return [];
  return ledger.entries.filter(entry => entry.npcId === npcId).map(entry => ({
    ...entry,
    sourceRefs: [...entry.sourceRefs],
    stateHistory: Array.isArray(entry.stateHistory) ? entry.stateHistory.map(item => ({ ...item })) : []
  }));
}

export function getNpcKnowledgeContext(ledger, npcId) {
  const entries = getNpcKnowledge(ledger, npcId);
  return {
    total: entries.length,
    unverified: entries.filter(entry => entry.state === 'unverified').length,
    corroborated: entries.filter(entry => entry.state === 'corroborated').length,
    disputed: entries.filter(entry => entry.state === 'disputed').length,
    hearsay: entries.filter(entry => entry.sourceType === 'rumor').length,
    entries
  };
}
