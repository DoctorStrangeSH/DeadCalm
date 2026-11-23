import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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


test('sealed-agreement finale cannot proceed when its confession clue fails to persist', () => {
  const source = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');
  assert.match(source, /const confessionSaved = GameState\.addClue\(\{/);
  assert.match(source, /if \(!confessionSaved && !GameState\.hasClue\('sebastian_sealed_confession'\)\)\s*\{\s*showFinaleSaveError\(container\);\s*return;/);
  assert.ok(source.indexOf('showFinaleSaveError(container);\n        return;') <
    source.indexOf("GameState.completeCampaign('price_of_silence')"),
    'the finale must stop before completion when the confession is not persisted');
});

test('every port evidence reward uses the persistence-aware action helper', () => {
  const source = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');
  for (const clueId of [
    'port_cargo_ledger',
    'port_cargo_ledger_archive',
    'belladonna_invoice'
  ]) {
    assert.match(source, new RegExp(`addPortClue\\(\\{\\s*id: '${clueId}'`),
      clueId + ' must be committed through addPortClue');
  }
  assert.match(source, /addPortClue\(markusStatement, meet,/,
    'Markus testimony must be saved before the confrontation is recorded');
  assert.equal((source.match(/GameState\.addClue\(/g) || []).length, 2,
    'the helper and explicit sealed-agreement outcome are the only clue writers');
});


test('archive cross-check appears immediately after saving the ledger without a scene reload', () => {
  const source = readFileSync(new URL('../src/js/scenes/port.js', import.meta.url), 'utf8');
  assert.match(source, /const showArchiveAction = \(\) => \{/);
  assert.match(source, /if \(GameState\.hasClue\('port_cargo_ledger'\) && !GameState\.hasClue\('port_cargo_ledger_archive'\)\)/);
  assert.match(source, /if \(actions\.querySelector\('#btn-port-archive-ledger'\)\) return;/);
  assert.match(source, /const ledgerSaved = addPortClue\(\{/);
  assert.match(source, /\}, ledger, 'ГРУЗОВАЯ КНИГА ДОБАВЛЕНА'\);\s*if \(ledgerSaved\) showArchiveAction\(\);/);
  assert.match(source, /\n  showArchiveAction\(\);\n/);
});
