import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';

test('новые улики сохраняют происхождение, а старые восстанавливают его из каталога', () => {
  const previous = GameState.currentCase;
  const previousSave = GameState.save;
  let saves = 0;
  try {
    GameState.save = () => { saves++; };
    GameState.currentCase = { clues: [] };
    GameState.addClue({ id: 'new', name: 'Новая', source: 'Архивный реестр' });
    assert.equal(GameState.getClue('new').source, 'Архивный реестр');
    GameState.currentCase.clues.push({ id: 'old', name: 'Старая' });
    assert.equal(GameState.restoreClueSources({ old: { source: 'Официальная выписка' } }), 1);
    assert.equal(GameState.getClue('old').source, 'Официальная выписка');
    assert.equal(GameState.restoreClueSources({ old: { source: 'Подмена' } }), 0);
    assert.equal(GameState.getClue('old').source, 'Официальная выписка');
    assert.equal(saves, 2);
  } finally {
    GameState.currentCase = previous;
    GameState.save = previousSave;
  }
});

test('неизвестные источники не подставляются в сохранение', () => {
  const previous = GameState.currentCase;
  try {
    GameState.currentCase = { clues: [{ id: 'not_in_catalog' }] };
    assert.equal(GameState.restoreClueSources({}), 0);
    assert.equal(GameState.getClue('not_in_catalog').source, undefined);
  } finally {
    GameState.currentCase = previous;
  }
});
