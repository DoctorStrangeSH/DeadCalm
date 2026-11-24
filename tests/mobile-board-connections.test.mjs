import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const board = readFileSync(new URL('../src/js/components/investigation-board.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');

test('mobile clue cards expose discovered connection names when SVG lines are hidden', () => {
  assert.match(board, /self\.connections\s*\.filter\(connection => connection\.clue1 === clue\.id \|\| connection\.clue2 === clue\.id\)/);
  assert.match(board, /const linkedId = connection\.clue1 === clue\.id \? connection\.clue2 : connection\.clue1/);
  assert.match(board, /clue-card-connections/);
  assert.match(board, /Связано:/);
  assert.match(styles, /\.investigation-board \.clue-card-connections \{ display:none; \}/);
  assert.match(styles, /@media\(max-width:900px\) \{\s*\.investigation-board \.clue-card-connections \{ display:block;/);
});

test('desktop evidence connection lines remain unchanged', () => {
  assert.match(styles, /\.investigation-board \.connection-line \{ stroke:/);
  assert.match(styles, /\.investigation-board \.board-lines \{ display:none; \}/);
});

test('mobile touch reordering persists clue order and cancels when save fails', () => {
  const source = readFileSync(new URL('../src/js/components/investigation-board.js', import.meta.url), 'utf8');
  assert.match(source, /_setupTouchReordering\(\)/);
  assert.match(source, /event\.pointerType === 'mouse'/);
  assert.match(source, /GameState\.currentCase\.boardOrder = ids/);
  assert.match(source, /GameState\.save\(\) === false/);
  assert.match(source, /delete GameState\.currentCase\.boardOrder/);
  assert.match(source, /card\.dataset\.touchDragged = 'true'/);
  assert.match(source, /this\.render\(\)/);
});

test('saved board order is restored when the investigation board renders', () => {
  const source = readFileSync(new URL('../src/js/components/investigation-board.js', import.meta.url), 'utf8');
  assert.match(source, /const savedBoardOrder = Array\.isArray\(GameState\.currentCase\.boardOrder\)/);
  assert.match(source, /clues\.sort\(\(a, b\) =>/);
});
