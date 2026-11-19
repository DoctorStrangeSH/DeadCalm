import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBoardClues } from '../src/js/systems/board-clue-filter.js';

const clues = [
  { id: 'letter', name: 'Письмо судьи', category: 'document', source: 'Архив суда', description: 'Странная печать' },
  { id: 'port', name: 'Журнал порта', category: 'document', source: 'Портовый пост' },
  { id: 'mark', name: 'След', category: 'observation', description: 'Печать на камне' }
];

test('поиск на доске учитывает название, источник, описание и категорию', () => {
  assert.deepEqual(filterBoardClues(clues, 'сУДьи'), ['letter']);
  assert.deepEqual(filterBoardClues(clues, 'портовый'), ['port']);
  assert.deepEqual(filterBoardClues(clues, 'печать'), ['letter', 'mark']);
  assert.deepEqual(filterBoardClues(clues, 'печать', 'document'), ['letter']);
  assert.deepEqual(filterBoardClues(clues, '', 'observation'), ['mark']);
});

test('поиск не меняет данные и игнорирует повреждённые элементы', () => {
  const snapshot = JSON.stringify(clues);
  assert.deepEqual(filterBoardClues([null, {}, ...clues], 'нет'), []);
  assert.deepEqual(filterBoardClues(clues), ['letter', 'port', 'mark']);
  assert.equal(JSON.stringify(clues), snapshot);
});
