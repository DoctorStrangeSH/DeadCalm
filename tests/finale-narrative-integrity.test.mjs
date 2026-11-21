import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const portScene = read('../src/js/scenes/port.js');
const dialogues = JSON.parse(read('../src/data/dialogues.json'));
const sebastian = dialogues.npc_sebastian_blackwood;

test('compromise finale does not invent a confession Sebastian never made', () => {
  assert.match(sebastian.sebastian_records_result.text, /не подтверждает ни время встречи/);
  assert.match(sebastian.sebastian_challenged_result.text, /не признаёт и не подтверждает обстоятельства убийства/);

  assert.match(portScene, /Себастьян не признаёт, что дал судье яд/);
  assert.doesNotMatch(portScene, /Себастьян признаёт, что встретился с Гаррисоном и дал ему яд/);
});

test('finale evidence briefing does not claim Sebastian corroborated the case in dialogue', () => {
  assert.match(portScene, /независимые свидетельства складываются в подозрение/);
  assert.match(portScene, /Сам Себастьян не признаёт убийство/);
  assert.doesNotMatch(portScene, /его слова совпадают в нескольких точках/);
});

test('both endings remain explicit player choices with evidence gates enforced by GameState', () => {
  assert.match(portScene, /ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ/);
  assert.match(portScene, /ЗАКЛЮЧИТЬ СДЕЛКУ/);
  assert.match(portScene, /GameState\.completeCampaign\('open_case'\)/);
  assert.match(portScene, /GameState\.completeCampaign\('price_of_silence'\)/);
});


test('open-case ending opens an investigation without declaring Sebastian the proven killer', () => {
  assert.match(portScene, /для независимого официального расследования/);
  assert.match(portScene, /не доказывают, кто передал яд Гаррисону/);
  assert.match(portScene, /помогает проверить старое алиби, а не устанавливает убийцу судьи/);
  assert.doesNotMatch(portScene, /дают основания для официального обвинения/);
  assert.doesNotMatch(portScene, /Себастьян убил Гаррисона/);
});
