import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dialogBox = readFileSync(new URL('../src/js/components/dialog-box.js', import.meta.url), 'utf8');

test('dialogue displays an accessible warning when a clue could not be saved', () => {
  assert.match(dialogBox, /if \(node\.saveError\)/);
  assert.match(dialogBox, /dialog-save-warning/);
  assert.match(dialogBox, /setAttribute\('role', 'alert'\)/);
  assert.match(dialogBox, /setAttribute\('aria-live', 'assertive'\)/);
  assert.match(dialogBox, /Вопрос останется доступен/);
});
