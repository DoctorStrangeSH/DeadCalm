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
