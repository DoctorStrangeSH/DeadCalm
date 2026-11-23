import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const characters = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url), 'utf8'));
const locations = JSON.parse(readFileSync(new URL('../src/data/locations.json', import.meta.url), 'utf8'));

test('every authored NPC has exactly one canonical atlas location', () => {
  const assigned = Object.entries(locations).filter(([, location]) => location.npc);
  const npcIds = assigned.map(([, location]) => location.npc);
  assert.equal(new Set(npcIds).size, npcIds.length, 'an NPC must not be duplicated across canonical atlas locations');
  for (const [npcId, character] of Object.entries(characters)) {
    assert.ok(character.id === npcId, npcId + ' must use its stable dossier ID');
    assert.ok(character.location, npcId + ' must define its canonical location');
    const matches = assigned.filter(([, location]) => location.npc === npcId);
    assert.equal(matches.length, 1, npcId + ' must be attached to exactly one atlas location');
    assert.equal(matches[0][0], character.location, npcId + ' atlas location must match the character dossier');
  }
});

test('every atlas NPC reference resolves to a real character dossier', () => {
  for (const [locationId, location] of Object.entries(locations)) {
    if (!location.npc) continue;
    assert.ok(characters[location.npc], locationId + ' references an unknown NPC');
  }
});

test('Sebastian is attached to Blackwood Mansion and remains gated by his day-three introduction', () => {
  assert.equal(locations.blackwood_mansion.npc, 'npc_sebastian_blackwood');
  assert.equal(characters.npc_sebastian_blackwood.location, 'blackwood_mansion');
  assert.equal(characters.npc_sebastian_blackwood.first_appearance, 'day_3');
});


import { getNpcPresenceAtLocation } from '../src/js/systems/npc-presence.js';

function campaignState(day) {
  const flags = Object.fromEntries(
    Array.from({ length: day }, (_, index) => ['day_' + (index + 1), true])
  );
  return {
    campaign: { day },
    hasFlag: flag => Boolean(flags[flag])
  };
}

test('all six NPCs become directly encounterable only after both canon gates are satisfied', () => {
  for (const [npcId, character] of Object.entries(characters)) {
    const location = locations[character.location];
    assert.ok(location, npcId + ' canonical location exists');

    for (let day = 1; day <= 5; day++) {
      const result = getNpcPresenceAtLocation(character, location, campaignState(day));
      const firstAppearanceDay = Number(character.first_appearance?.match(/^day_([1-5])$/)?.[1] || 99);
      const locationDay = location.unlock_condition
        ? Number(location.unlock_condition.match(/^day_([1-5])$/)?.[1] || 99)
        : 1;
      const expectedAvailable = day >= Math.max(firstAppearanceDay, locationDay);

      assert.equal(
        result.available,
        expectedAvailable,
        npcId + ' availability on campaign day ' + day + ' must respect first appearance and location unlock'
      );
      if (!expectedAvailable) {
        assert.ok(
          ['location_locked', 'not_yet_introduced'].includes(result.status),
          npcId + ' must fail closed before both canon gates are satisfied'
        );
      }
    }
  }
});
