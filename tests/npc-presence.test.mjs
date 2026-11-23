import test from 'node:test';
import assert from 'node:assert/strict';
import { getNpcPresenceAtLocation } from '../src/js/systems/npc-presence.js';

function state(day, flags = {}) {
  return { campaign: { day }, hasFlag: flag => Boolean(flags[flag]) };
}

const anna = { id: 'npc_anna_holt', name: 'Анна Холт', location: 'holt_house', first_appearance: 'day_1' };
const annaHouse = { id: 'holt_house', unlocked: false, unlock_condition: 'day_4' };

test('NPC presence requires the canonical location to be unlocked', () => {
  const result = getNpcPresenceAtLocation(anna, annaHouse, state(1));
  assert.equal(result.status, 'location_locked');
  assert.equal(result.available, false);
});

test('NPC becomes available when both authored first appearance and location gate are satisfied', () => {
  const result = getNpcPresenceAtLocation(anna, annaHouse, state(4, { day_4: true }));
  assert.equal(result.status, 'available');
  assert.equal(result.available, true);
  assert.equal(result.firstDay, 1);
});

test('NPC first appearance day is respected independently of an unlocked location', () => {
  const sebastian = {
    id: 'npc_sebastian_blackwood', name: 'Себастьян Блэквуд',
    location: 'blackwood_mansion', first_appearance: 'day_3'
  };
  const mansion = { id: 'blackwood_mansion', unlocked: false, unlock_condition: 'day_3' };
  const result = getNpcPresenceAtLocation(sebastian, mansion, state(2, { day_3: true }));
  assert.equal(result.status, 'not_yet_introduced');
  assert.equal(result.available, false);
  assert.equal(result.firstDay, 3);
});

test('NPC is not shown as present at a location outside the character dossier', () => {
  const result = getNpcPresenceAtLocation(anna, { id: 'church', unlocked: true }, state(5));
  assert.equal(result.status, 'not_here');
  assert.equal(result.available, false);
});

test('missing or malformed first-appearance canon fails closed', () => {
  const result = getNpcPresenceAtLocation(
    { ...anna, first_appearance: 'whenever' },
    { id: 'holt_house', unlocked: true },
    state(5)
  );
  assert.equal(result.status, 'unknown');
  assert.equal(result.available, false);
});

test('presence resolution does not invent schedules or occurrences', () => {
  const dailyLife = { schedules: [], occurrences: [] };
  const result = getNpcPresenceAtLocation(anna, { ...annaHouse, unlocked: true }, state(4));
  assert.equal(result.available, true);
  assert.deepEqual(dailyLife, { schedules: [], occurrences: [] });
});
