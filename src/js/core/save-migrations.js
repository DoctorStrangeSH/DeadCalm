export const CURRENT_SAVE_VERSION = 1;

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Upgrade legacy save payloads without dropping fields unknown to this build.
 * Unversioned saves are version 0. A future version is never downgraded.
 */
export function migrateSave(rawSave) {
  if (!isRecord(rawSave)) {
    return { status: 'invalid', reason: 'save-not-object', data: null };
  }

  const version = rawSave.schemaVersion === undefined ? 0 : rawSave.schemaVersion;
  if (!Number.isInteger(version) || version < 0) {
    return { status: 'invalid', reason: 'invalid-schema-version', data: null };
  }
  if (version > CURRENT_SAVE_VERSION) {
    return {
      status: 'unsupported',
      reason: 'future-schema-version',
      fromVersion: version,
      toVersion: CURRENT_SAVE_VERSION,
      data: null
    };
  }

  let data = clone(rawSave);
  const fromVersion = version;
  let normalized = false;

  if (version === CURRENT_SAVE_VERSION && isRecord(data.currentCase) && !Array.isArray(data.currentCase.hypotheses)) {
    // Early schema-v1 saves created from a fresh/reset campaign omitted this
    // optional collection. Backfill it without discarding any player data.
    data.currentCase.hypotheses = [];
    normalized = true;
  }

  if (version === 0) {
    data = {
      ...data,
      schemaVersion: 1,
      player: { name: 'Джон Риверс', reputation: 50, ...(isRecord(data.player) ? data.player : {}) },
      currentCase: isRecord(data.currentCase)
        ? {
            ...data.currentCase,
            id: data.currentCase.id || 'case_001',
            clues: Array.isArray(data.currentCase.clues) ? data.currentCase.clues : [],
            suspects: Array.isArray(data.currentCase.suspects) ? data.currentCase.suspects : [],
            timeline: Array.isArray(data.currentCase.timeline) ? data.currentCase.timeline : [],
            hypotheses: Array.isArray(data.currentCase.hypotheses) ? data.currentCase.hypotheses : []
          }
        : { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] },
      campaign: { caseId: 'case_001', day: 1, completed: false, ending: null, ...(isRecord(data.campaign) ? data.campaign : {}) },
      flags: isRecord(data.flags) ? data.flags : {},
      relationships: isRecord(data.relationships) ? data.relationships : {},
      npcMemory: isRecord(data.npcMemory) ? data.npcMemory : {},
      socialGraph: { ties: [], events: [], ...(isRecord(data.socialGraph) ? data.socialGraph : {}) },
      knowledgeLedger: { entries: [], ...(isRecord(data.knowledgeLedger) ? data.knowledgeLedger : {}) },
      npcDailyLife: { schedules: [], occurrences: [], ...(isRecord(data.npcDailyLife) ? data.npcDailyLife : {}) },
      miniGameProgress: isRecord(data.miniGameProgress) ? data.miniGameProgress : {},
      notebook: Array.isArray(data.notebook) ? data.notebook : [],
      settings: { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal', ...(isRecord(data.settings) ? data.settings : {}) }
    };
  }

  return {
    status: 'ok',
    data,
    migrated: fromVersion !== CURRENT_SAVE_VERSION || normalized,
    fromVersion,
    toVersion: CURRENT_SAVE_VERSION
  };
}
