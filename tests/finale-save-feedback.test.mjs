import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portScene = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');

test('both finale choices explain a failed save without showing a completed ending', () => {
  assert.match(portScene, /function showFinaleSaveError\(container\)/);
  assert.match(portScene, /message\.setAttribute\('role', 'alert'\)/);
  assert.match(portScene, /message\.setAttribute\('aria-live', 'assertive'\)/);
  assert.match(portScene, /Ваш выбор не потерян/);

  const openHandler = portScene.match(/querySelector\('#btn-ending-open'\)[\s\S]*?addEventListener\('click', \(\) => \{([\s\S]*?)\n  \}\);/);
  const silenceHandler = portScene.match(/querySelector\('#btn-ending-silence'\)[\s\S]*?addEventListener\('click', \(\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(openHandler, 'open-case button must have a click handler');
  assert.ok(silenceHandler, 'compromise button must have a click handler');
  assert.match(openHandler[1], /else showFinaleSaveError\(container\)/);
  assert.match(silenceHandler[1], /else showFinaleSaveError\(container\)/);
});
