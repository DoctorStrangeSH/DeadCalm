import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceCategoryLabel, resolveEvidenceLinks, selectEvidence } from '../src/js/systems/evidence-archive.js';

const clues = [
  { id: 'first', name: 'Письмо', category: 'document', description: 'Из порта', location: 'Кабинет', foundAt: '2026-01-01T10:00:00Z' },
  { id: 'second', name: 'Флакон', category: 'object', description: 'След яда', location: 'Морг', foundAt: '2026-01-02T10:00:00Z' },
  { id: 'third', name: 'Свидетельство', category: 'document', description: 'Тайна судьи', location: 'Архив', foundAt: '2026-01-03T10:00:00Z' }
];

test('evidence archive filters categories and searchable text', () => {
  assert.deepEqual(selectEvidence(clues, { category: 'document' }).map(c => c.id), ['third', 'first']);
  assert.deepEqual(selectEvidence(clues, { query: 'мОрГ' }).map(c => c.id), ['second']);
  assert.deepEqual(selectEvidence(clues, { query: 'дОкументы' }).map(c => c.id), ['third', 'first']);
  assert.equal(evidenceCategoryLabel('unknown'), 'Прочее');
});

test('evidence archive sorts in both directions without mutating saved clues', () => {
  assert.deepEqual(selectEvidence(clues).map(c => c.id), ['third', 'second', 'first']);
  assert.deepEqual(selectEvidence(clues, { sort: 'oldest' }).map(c => c.id), ['first', 'second', 'third']);
  assert.deepEqual(clues.map(c => c.id), ['first', 'second', 'third']);
});

test('related clues show discovered names but hide undiscovered identities', () => {
  const catalog = {
    first: { id: 'first', connections_to: ['second', 'third', 'second'] },
    second: { id: 'second', connections_to: ['first'] },
    third: { id: 'third', name: 'Секретная улика', connections_to: [] }
  };
  assert.deepEqual(resolveEvidenceLinks(clues[0], clues.slice(0, 2), catalog), [
    { id: 'second', found: true, name: 'Флакон' },
    { id: 'third', found: false, name: null }
  ]);
});

test('old saves recover reverse relations from catalog and new clues fall back to saved links', () => {
  const catalog = {
    first: { id: 'first', connections_to: [] },
    second: { id: 'second', connections_to: ['first'] }
  };
  assert.deepEqual(resolveEvidenceLinks(clues[0], clues, catalog), [
    { id: 'second', found: true, name: 'Флакон' }
  ]);
  assert.deepEqual(resolveEvidenceLinks({ id: 'custom', connections_to: ['first'] }, clues, {}), [
    { id: 'first', found: true, name: 'Письмо' }
  ]);
});
