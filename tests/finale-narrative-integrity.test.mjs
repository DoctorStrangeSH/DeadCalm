import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const portScene = read('../src/js/scenes/port.js');
const dialogues = JSON.parse(read('../src/data/dialogues.json'));
const sebastian = dialogues.npc_sebastian_blackwood;

test('compromise ending records Sebastian’s sealed confession without publishing it', () => {
  assert.match(portScene, /Запечатанное признание Себастьяна/);
  assert.match(portScene, /сам передал ему белладонну/);
  assert.match(portScene, /Признание запечатано и передано следствию/);
  assert.match(portScene, /не публикуется/);
  assert.match(portScene, /GameState\.addClue\(/);
  assert.match(portScene, /GameState\.completeCampaign\('price_of_silence'\)/);
});

test('finale distinguishes Sebastian’s admission of delivery from an admission of murder', () => {
  assert.match(portScene, /даёт основания предъявить официальное обвинение/);
  assert.match(portScene, /Сам Себастьян не признаёт убийство/);
  assert.match(dialogues.npc_sebastian_blackwood.topics.about_judge.responses.find(item => item.id === 'sebastian_delivery_statement').answer, /передал Гаррисону запечатанный флакон/);
  assert.doesNotMatch(portScene, /его слова совпадают в нескольких точках/);
});

test('both endings remain explicit player choices with evidence gates enforced by GameState', () => {
  assert.match(portScene, /ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ/);
  assert.match(portScene, /ЗАКЛЮЧИТЬ СДЕЛКУ/);
  assert.match(portScene, /GameState\.completeCampaign\('open_case'\)/);
  assert.match(portScene, /GameState\.completeCampaign\('price_of_silence'\)/);
});


test('open-case ending files a formal accusation without presenting it as a conviction', () => {
  assert.match(portScene, /передаёте материалы властям/);
  assert.match(portScene, /даёт основания для официального обвинения Себастьяна/);
  assert.match(portScene, /Это процессуальное обвинение, а не судебный приговор/);
  assert.match(portScene, /Фальсификация Маркуса раскрыта/);
  assert.match(portScene, /Лидия — основания добиваться пересмотра дела Габриэля/);
  assert.doesNotMatch(portScene, /Себастьян убил Гаррисона/);
});


test('full public disclosure gate is not described as proof that Sebastian administered the poison', () => {
  assert.match(portScene, /fullDisclosureReady/);
  assert.match(portScene, /не судебный приговор/);
  assert.doesNotMatch(portScene, /Для публичного обвинения нужен/);
  assert.match(portScene, /ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ/);
});


test('finale directs the player back to Sebastian when the delivery statement is missing', () => {
  assert.match(portScene, /Показание Себастьяна о передаче флакона/);
  assert.match(portScene, /btn-return-sebastian/);
  assert.match(portScene, /scene: 'blackwood-mansion'/);
});
