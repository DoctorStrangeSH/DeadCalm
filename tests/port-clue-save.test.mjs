import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { addPortClue } from '../src/js/scenes/port.js';

test('port evidence action remains retryable when persistence fails, then confirms only after a successful save', () => {
  const previousCase = GameState.currentCase;
  const previousSave = GameState.save;
  const clue = {
    id: 'port_save_retry_test',
    name: 'Тестовая архивная запись',
    category: 'document',
    description: 'Проверка безопасного поведения кнопки при ошибке сохранения.',
    location: 'port',
    day: 4,
    source: 'Тест',
    connections_to: []
  };
  const title = { textContent: 'ПРОВЕРИТЬ ДОКУМЕНТ' };
  const button = {
    disabled: false,
    querySelector: selector => selector === '.card-title' ? title : null
  };

  try {
    GameState.currentCase = { clues: [] };
    GameState.save = () => false;

    assert.equal(addPortClue(clue, button, 'ДОКУМЕНТ ДОБАВЛЕН'), false);
    assert.equal(GameState.hasClue(clue.id), false, 'failed persistence must roll the clue back');
    assert.equal(button.disabled, false, 'failed action must remain available for retry');
    assert.equal(title.textContent, 'НЕ УДАЛОСЬ СОХРАНИТЬ — ПОВТОРИТЬ');

    GameState.save = () => true;
    assert.equal(addPortClue(clue, button, 'ДОКУМЕНТ ДОБАВЛЕН'), true);
    assert.equal(GameState.hasClue(clue.id), true, 'successful persistence must add the clue');
    assert.equal(button.disabled, true, 'successful action must not be applied twice');
    assert.equal(title.textContent, 'ДОКУМЕНТ ДОБАВЛЕН');
  } finally {
    GameState.currentCase = previousCase;
    GameState.save = previousSave;
  }
});
