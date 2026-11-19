import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDailyLife, getNpcOccurrences, getNpcScheduleAt, normalizeDailyLife, recordNpcOccurrence, upsertNpcSchedule } from '../src/js/systems/npc-daily-life.js';

const schedule = {
  id: 'schedule_marta_bar_evening', npcId: 'npc_marta_hayes', activity: 'work',
  startMinute: 1080, endMinute: 1380, days: [1,2,3,4,5,6,7],
  locationId: 'bar_rusty_anchor', basis: 'Explicitly authored shift in the character dossier.',
  sourceRefs: ['character_dossier_marta']
};

test('legacy saves normalize to an empty daily-life ledger', () => {
  assert.deepEqual(createEmptyDailyLife(), { schedules: [], occurrences: [] });
  assert.deepEqual(normalizeDailyLife(undefined), { schedules: [], occurrences: [] });
});

test('authored schedule resolves by in-game weekday and minute', () => {
  const life = createEmptyDailyLife();
  assert.ok(upsertNpcSchedule(life, schedule));
  assert.equal(getNpcScheduleAt(life, 'npc_marta_hayes', 2, 1080).locationId, 'bar_rusty_anchor');
  assert.equal(getNpcScheduleAt(life, 'npc_marta_hayes', 2, 1379).activity, 'work');
  assert.equal(getNpcScheduleAt(life, 'npc_marta_hayes', 2, 1380), null);
  assert.equal(getNpcScheduleAt(life, 'npc_unknown', 2, 1200), null);
});

test('invalid or unsupported schedule claims are rejected', () => {
  const life = createEmptyDailyLife();
  assert.equal(upsertNpcSchedule(life, { ...schedule, basis: ' ' }), null);
  assert.equal(upsertNpcSchedule(life, { ...schedule, startMinute: 1440 }), null);
  assert.equal(upsertNpcSchedule(life, { ...schedule, days: [8] }), null);
  assert.equal(life.schedules.length, 0);
});

test('occurrences require a matching authored schedule and exact time/location', () => {
  const life = createEmptyDailyLife();
  upsertNpcSchedule(life, schedule);
  const input = { id: 'occ_1', npcId: 'npc_marta_hayes', scheduleId: schedule.id, day: 1,
    minute: 1200, locationId: 'bar_rusty_anchor', description: 'A customer saw Marta close the front shutters.',
    basis: 'Player discovered the event through the bar ledger.', sourceRefs: ['bar_ledger_1'] };
  assert.ok(recordNpcOccurrence(life, input));
  assert.equal(recordNpcOccurrence(life, input), null);
  assert.equal(recordNpcOccurrence(life, { ...input, id: 'wrong-place', locationId: 'police_station' }), null);
  assert.equal(recordNpcOccurrence(life, { ...input, id: 'wrong-time', minute: 1400 }), null);
  assert.equal(getNpcOccurrences(life, 'npc_marta_hayes').length, 1);
});

test('normalization removes malformed and duplicate records', () => {
  const normalized = normalizeDailyLife({ schedules: [schedule, schedule, { ...schedule, id: 'bad', basis: '' }], occurrences: [] });
  assert.equal(normalized.schedules.length, 1);
  normalized.schedules[0].days.push(8);
  assert.deepEqual(schedule.days, [1,2,3,4,5,6,7]);
});

test('normalization drops orphaned occurrences and occurrences outside schedule windows', () => {
  const valid = { id: 'occ_ok', npcId: 'npc_marta_hayes', scheduleId: schedule.id, day: 1,
    minute: 1200, locationId: 'bar_rusty_anchor', description: 'A documented closing shift.',
    basis: 'A signed shift log.' };
  const normalized = normalizeDailyLife({
    schedules: [schedule],
    occurrences: [
      valid,
      { ...valid, id: 'orphan', scheduleId: 'missing_schedule' },
      { ...valid, id: 'late', minute: 1400 }
    ]
  });
  assert.deepEqual(normalized.occurrences.map(item => item.id), ['occ_ok']);
});
