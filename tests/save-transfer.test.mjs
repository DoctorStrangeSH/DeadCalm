import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createSaveFile, parseSaveFile } from '../src/js/core/save-transfer.js';
import { CURRENT_SAVE_VERSION } from '../src/js/core/save-migrations.js';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
}

const sampleSave = () => ({
  schemaVersion: CURRENT_SAVE_VERSION,
  player: { name: 'Джон Риверс', reputation: 73 },
  currentCase: {
    id: 'case_001',
    clues: [{ id: 'clue_01', quality: 94 }],
    suspects: [{ id: 'suspect_anna' }],
    timeline: [{ id: 'event_01' }],
    hypotheses: [{ id: 'hypothesis_01', history: [{ status: 'possible' }] }]
  },
  campaign: { caseId: 'case_001', day: 4, completed: false, ending: null },
  flags: { day_4: true },
  relationships: { anna_holt: { trust: 68 } },
  npcMemory: { anna_holt: { promises: [{ id: 'promise_01', status: 'kept' }] } },
  socialGraph: { ties: [], events: [] },
  knowledgeLedger: { entries: [] },
  npcDailyLife: { schedules: [], occurrences: [] },
  miniGameProgress: { radio: { bestScore: 94 } },
  notebook: [{ id: 'note_01', text: 'Звонок был раньше.' }],
  settings: { musicVolume: 0.4, sfxVolume: 0.6, textSpeed: 'fast' }
});

test('save file export/import round-trip preserves the complete campaign payload', async () => {
  const payload = sampleSave();
  const file = await createSaveFile(payload, '2026-11-21T12:00:00.000Z');
  const parsed = await parseSaveFile(JSON.stringify(file));

  assert.equal(file.format, 'dead-calm-save');
  assert.equal(file.formatVersion, 1);
  assert.equal(file.gameSaveVersion, CURRENT_SAVE_VERSION);
  assert.equal(parsed.status, 'ok');
  assert.deepEqual(parsed.data, payload);
  assert.equal(parsed.exportedAt, '2026-11-21T12:00:00.000Z');
});

test('tampered payload is rejected by checksum without returning import data', async () => {
  const file = await createSaveFile(sampleSave());
  file.payload.campaign.day = 99;
  const parsed = await parseSaveFile(file);
  assert.equal(parsed.status, 'invalid');
  assert.equal(parsed.reason, 'checksum-mismatch');
  assert.equal('data' in parsed, false);
});

test('malformed JSON, wrong format, and missing checksum are rejected', async () => {
  assert.equal((await parseSaveFile('{broken')).reason, 'invalid-json');
  assert.equal((await parseSaveFile({ format: 'other', payload: sampleSave() })).reason, 'unknown-format');
  assert.equal((await parseSaveFile({ format: 'dead-calm-save', formatVersion: 1, payload: sampleSave() })).reason, 'missing-checksum');
});

test('future save schema and future transfer format are rejected without downgrade', async () => {
  const futurePayload = { ...sampleSave(), schemaVersion: CURRENT_SAVE_VERSION + 1 };
  const futureFile = await createSaveFile(sampleSave());
  futureFile.formatVersion = 2;
  assert.equal((await parseSaveFile(futureFile)).status, 'unsupported');

  const currentFile = await createSaveFile(sampleSave());
  currentFile.payload = futurePayload;
  const { createHash } = await import('node:crypto');
  const canonical = value => {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  };
  currentFile.checksum = createHash('sha256').update(canonical(futurePayload)).digest('hex');
  assert.equal((await parseSaveFile(currentFile)).status, 'unsupported');
});

test('legacy payload is migrated during import and retains unknown fields', async () => {
  const legacy = { player: { name: 'John' }, currentCase: { id: 'case_001', legacyNote: 'retain me' } };
  const file = await createSaveFile(legacy);
  const parsed = await parseSaveFile(file);
  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.migrated, true);
  assert.equal(parsed.data.schemaVersion, CURRENT_SAVE_VERSION);
  assert.equal(parsed.data.currentCase.legacyNote, 'retain me');
});
