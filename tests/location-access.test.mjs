import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocationUnlocked, countUnlockedLocations } from '../src/js/systems/location-access.js';

function stateWithFlags(flags = {}) {
  return { hasFlag: flag => Boolean(flags[flag]) };
}

test('authored unlocked locations remain accessible without campaign flags', () => {
  assert.equal(isLocationUnlocked({ id: 'office', unlocked: true }, stateWithFlags()), true);
});

test('conditional locations unlock only when their exact story flag exists', () => {
  const church = { id: 'church', unlocked: false, unlock_condition: 'day_2' };
  assert.equal(isLocationUnlocked(church, stateWithFlags()), false);
  assert.equal(isLocationUnlocked(church, stateWithFlags({ day_2: true })), true);
  assert.equal(isLocationUnlocked(church, stateWithFlags({ day_3: true })), false);
});

test('missing or malformed location conditions fail closed', () => {
  assert.equal(isLocationUnlocked(null, stateWithFlags()), false);
  assert.equal(isLocationUnlocked({ unlocked: false }, stateWithFlags()), false);
  assert.equal(isLocationUnlocked({ unlocked: false, unlock_condition: '' }, stateWithFlags()), false);
});

test('unlocked location count reflects authored access and story flags', () => {
  const locations = {
    office: { unlocked: true },
    church: { unlocked: false, unlock_condition: 'day_2' },
    port: { unlocked: false, unlock_condition: 'day_5' }
  };
  assert.equal(countUnlockedLocations(locations, stateWithFlags()), 1);
  assert.equal(countUnlockedLocations(locations, stateWithFlags({ day_2: true, day_5: true })), 3);
});
