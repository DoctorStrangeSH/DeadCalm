import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const menu = readFileSync(new URL('../src/js/scenes/main-menu.js', import.meta.url), 'utf8');

test('continue screen summarizes the saved campaign day and next actionable step', () => {
  assert.match(menu, /import \{ assessCampaignDay \} from '\.\.\/systems\/campaign-progression\.js'/);
  assert.match(menu, /var campaignStatus = assessCampaignDay\(GameState\)/);
  assert.match(menu, /День ' \+ day \+ ' из 5/);
  assert.match(menu, /Расследование завершено/);
  assert.match(menu, /Финальная встреча ждёт вас/);
  assert.match(menu, /Можно завершить текущий день/);
  assert.match(menu, /Осталось обязательных доказательств: ' \+ campaignStatus\.missing\.length/);
});

test('save summary remains hidden for blocked or absent saves', () => {
  assert.match(menu, /if \(hasSave && !saveBlocked\)/);
  assert.match(menu, /else if \(saveBlocked\)/);
  assert.match(menu, /Сохранение повреждено или создано более новой версией/);
  assert.match(menu, /Нет сохранений/);
});

test('continue still restores the saved state before navigating to the office', () => {
  const continueHandler = menu.slice(menu.indexOf("document.getElementById('btn-continue')"), menu.indexOf('// === ЭКСПОРТ / ИМПОРТ СОХРАНЕНИЯ ==='));
  assert.ok(continueHandler.indexOf('GameState.init()') >= 0);
  assert.ok(continueHandler.indexOf("Events.emit('navigate', { scene: 'office' })") > continueHandler.indexOf('GameState.init()'));
  assert.match(continueHandler, /if \(GameState\.init\(\) === false\)/);
});
