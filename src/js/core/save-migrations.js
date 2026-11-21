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

  if (version === 0) {
    data = {
      ...data,
      schemaVersion: 1,
      player: isRecord(data.player) ? data.player : { name: 'Джон Риверс', reputation: 50 },
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
      campaign: isRecord(data.campaign) ? data.campaign : { caseId: 'case_001', day: 1, completed: false, ending: null },
      flags: isRecord(data.flags) ? data.flags : {},
      relationships: isRecord(data.relationships) ? data.relationships : {},
      npcMemory: isRecord(data.npcMemory) ? data.npcMemory : {},
      socialGraph: isRecord(data.socialGraph) ? data.socialGraph : { ties: [], events: [] },
      knowledgeLedger: isRecord(data.knowledgeLedger) ? data.knowledgeLedger : { entries: [] },
      npcDailyLife: isRecord(data.npcDailyLife) ? data.npcDailyLife : { schedules: [], occurrences: [] },
      miniGameProgress: isRecord(data.miniGameProgress) ? data.miniGameProgress : {},
      notebook: Array.isArray(data.notebook) ? data.notebook : [],
      settings: isRecord(data.settings) ? data.settings : { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' }
    };
  }

  return {
    status: 'ok',
    data,
    migrated: fromVersion !== CURRENT_SAVE_VERSION,
    fromVersion,
    toVersion: CURRENT_SAVE_VERSION
  };
}
