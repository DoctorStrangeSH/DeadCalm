import { CURRENT_SAVE_VERSION, migrateSave } from './save-migrations.js';

export const SAVE_FILE_FORMAT = 'dead-calm-save';
export const SAVE_FILE_FORMAT_VERSION = 1;

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonicalJson(value[key])
    ).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Криптографическая проверка недоступна в этом браузере.');
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createSaveFile(payload, exportedAt = new Date().toISOString()) {
  const migrated = migrateSave(payload);
  if (migrated.status !== 'ok') {
    throw new Error('Нельзя экспортировать некорректное или несовместимое сохранение.');
  }
  const data = migrated.data;
  const checksum = await sha256(canonicalJson(data));
  return {
    format: SAVE_FILE_FORMAT,
    formatVersion: SAVE_FILE_FORMAT_VERSION,
    gameSaveVersion: CURRENT_SAVE_VERSION,
    exportedAt,
    checksum,
    payload: data
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validatePayload(data) {
  if (!isRecord(data.player) || typeof data.player.name !== 'string' ||
      !isRecord(data.currentCase) || typeof data.currentCase.id !== 'string' ||
      !Array.isArray(data.currentCase.clues) ||
      !Array.isArray(data.currentCase.suspects) ||
      !Array.isArray(data.currentCase.timeline) ||
      !Array.isArray(data.currentCase.hypotheses) ||
      !isRecord(data.campaign) || !Number.isInteger(data.campaign.day) ||
      !isRecord(data.flags) || !isRecord(data.relationships) ||
      !isRecord(data.npcMemory) || !isRecord(data.socialGraph) ||
      !Array.isArray(data.socialGraph.ties) || !Array.isArray(data.socialGraph.events) ||
      !isRecord(data.knowledgeLedger) || !Array.isArray(data.knowledgeLedger.entries) ||
      !isRecord(data.npcDailyLife) || !Array.isArray(data.npcDailyLife.schedules) ||
      !Array.isArray(data.npcDailyLife.occurrences) ||
      !isRecord(data.miniGameProgress) || !Array.isArray(data.notebook) ||
      !isRecord(data.settings)) {
    return { valid: false, reason: 'invalid-payload-shape' };
  }

  const { musicVolume, sfxVolume, textSpeed } = data.settings;
  if (typeof musicVolume !== 'number' || !Number.isFinite(musicVolume) ||
      typeof sfxVolume !== 'number' || !Number.isFinite(sfxVolume) ||
      !['slow', 'normal', 'fast', 'instant'].includes(textSpeed)) {
    return { valid: false, reason: 'invalid-settings' };
  }

  if (data.campaign.day < 1 ||
      typeof data.campaign.completed !== 'boolean' ||
      !(data.campaign.ending === null || typeof data.campaign.ending === 'string')) {
    return { valid: false, reason: 'invalid-campaign' };
  }

  return { valid: true };
}

export async function parseSaveFile(input) {
  let file;
  try {
    file = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return { status: 'invalid', reason: 'invalid-json' };
  }

  if (!file || typeof file !== 'object' || Array.isArray(file)) {
    return { status: 'invalid', reason: 'invalid-envelope' };
  }
  if (file.format !== SAVE_FILE_FORMAT) {
    return { status: 'invalid', reason: 'unknown-format' };
  }
  if (file.formatVersion !== SAVE_FILE_FORMAT_VERSION) {
    return { status: 'unsupported', reason: 'unsupported-file-format', found: file.formatVersion };
  }
  if (typeof file.checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(file.checksum)) {
    return { status: 'invalid', reason: 'missing-checksum' };
  }

  const migration = migrateSave(file.payload);
  if (migration.status !== 'ok') {
    return migration;
  }

  const shape = validatePayload(migration.data);
  if (!shape.valid) return { status: 'invalid', reason: shape.reason };

  const actualChecksum = await sha256(canonicalJson(file.payload));
  if (actualChecksum !== file.checksum.toLowerCase()) {
    return { status: 'invalid', reason: 'checksum-mismatch' };
  }

  return {
    status: 'ok',
    data: migration.data,
    migrated: migration.migrated,
    fromVersion: migration.fromVersion,
    toVersion: migration.toVersion,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null
  };
}
