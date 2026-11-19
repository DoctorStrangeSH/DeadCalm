import test from 'node:test';
import assert from 'node:assert/strict';
import { filterHypotheses } from '../src/js/systems/hypothesis-filter.js';

const clues = [{ id: 'letter', name: 'Письмо из порта' }, { id: 'ledger', name: 'Судебный реестр' }];
const theories = [
  { id: 'a', title: 'Судья', reasoning: 'Важная запись', clueIds: ['ledger'], status: 'unchecked' },
  { id: 'b', title: 'Ночной визит', reasoning: 'Свидетель видел корабль', clueIds: ['letter'], status: 'probable' },
  { id: 'c', title: 'Архив', reasoning: 'Другая версия', clueIds: [], status: 'rejected' }
];

test('hypothesis search matches title, reasoning and accessible attached clue names', () => {
  assert.deepEqual(filterHypotheses(theories, clues, '  СУДЬЯ ').map(item => item.id), ['a']);
  assert.deepEqual(filterHypotheses(theories, clues, 'корабль').map(item => item.id), ['b']);
  assert.deepEqual(filterHypotheses(theories, clues, 'письмо').map(item => item.id), ['b']);
  assert.deepEqual(filterHypotheses(theories, clues, 'несуществующее'), []);
});

test('status, new-lead review and text filters can combine without changing theories', () => {
  const snapshot = structuredClone(theories);
  assert.deepEqual(filterHypotheses(theories, clues, '', 'probable').map(item => item.id), ['b']);
  assert.deepEqual(filterHypotheses(theories, clues, '', 'review', new Set(['a', 'c'])).map(item => item.id), ['a', 'c']);
  assert.deepEqual(filterHypotheses(theories, clues, 'архив', 'review', new Set(['a', 'c'])).map(item => item.id), ['c']);
  assert.deepEqual(filterHypotheses(theories, clues), theories);
  assert.deepEqual(theories, snapshot);
});

test('search does not expose unavailable clue names', () => {
  const hidden = [{ id: 'h', title: 'Версия', reasoning: 'Наблюдение', clueIds: ['secret'], status: 'unchecked' }];
  assert.deepEqual(filterHypotheses(hidden, clues, 'секрет'), []);
});
