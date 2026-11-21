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
