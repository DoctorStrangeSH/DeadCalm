import test from 'node:test';
import assert from 'node:assert/strict';
import { getNPCDossier } from '../src/js/systems/npc-dossiers.js';

test('Orlov dossier separates observed motive, cooperation opening, boundary and unknowns', () => {
  const profile = getNPCDossier('npc_pavel_orlov');
  assert.equal(profile.name, 'Павел Орлов');
  assert.match(profile.observedMotive, /нарушение инструкции/);
  assert.match(profile.cooperationOpening, /Спокойно/);
  assert.match(profile.boundary, /адвоката/);
  assert.match(profile.unknown, /неизвестно/);
  assert.match(profile.basis, /не подтверждённый факт/);
});

test('Klimov dossier does not infer who received the key', () => {
  const profile = getNPCDossier('npc_nikolay_klimov');
  assert.match(profile.observedMotive, /табельный номер/);
  assert.match(profile.boundary, /адвоката/);
  assert.match(profile.unknown, /не утверждает, что знает/);
});

test('unknown NPCs have no fabricated dossier and returned copies are isolated', () => {
  assert.equal(getNPCDossier('npc_unknown'), null);
  const profile = getNPCDossier('npc_pavel_orlov');
  profile.name = 'Изменённое имя';
  assert.equal(getNPCDossier('npc_pavel_orlov').name, 'Павел Орлов');
});
