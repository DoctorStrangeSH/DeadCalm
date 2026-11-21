import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Investigation } from '../src/js/systems/investigation.js';
import { Notebook } from '../src/js/systems/notebook.js';

test('evidence-to-hypothesis chain survives board reconstruction and appears in the journal export', () => {
  const previous = {
    currentCase: GameState.currentCase,
    flags: GameState.flags,
    save: GameState.save,
    cluesData: Investigation._cluesData,
    connections: Investigation._connections,
    rules: Investigation._contradictionRules,
    initialized: Investigation._initialized,
    notebook: GameState.notebook
  };

  try {
    GameState.save = () => true;
    GameState.flags = {};
    GameState.notebook = [];
    GameState.currentCase = { id: 'case_001', clues: [], hypotheses: [] };
    Investigation._cluesData = {
      autopsy: { id: 'autopsy', connections_to: ['pharmacy'], source: 'Протокол вскрытия' },
      pharmacy: { id: 'pharmacy', connections_to: ['autopsy'], source: 'Реестр аптеки' }
    };
    Investigation._connections = [];
    Investigation._initialized = true;

    GameState.addClue({
      id: 'autopsy', name: 'Отчёт о вскрытии', category: 'document',
      description: 'Обнаружен след белладонны.', source: 'Протокол вскрытия',
      location: 'Морг', day: 1, connections_to: ['pharmacy']
    });
    GameState.addClue({
      id: 'pharmacy', name: 'Запись аптеки', category: 'document',
      description: 'Зафиксирована продажа препарата.', source: 'Реестр аптеки',
      location: 'Портовая аптека', day: 2, connections_to: ['autopsy']
    });

    assert.equal(GameState.currentCase.clues.length, 2);
    const connection = Investigation.checkConnection('autopsy', 'pharmacy');
    assert.ok(connection);
    assert.equal(Investigation.saveConnection(connection), true);

    // Simulate reload: only GameState's saved flags and discovered clues remain.
    Investigation._connections = [];
    assert.deepEqual(Investigation.getConnections().map(item => item.id), [connection.id]);

    const hypothesis = GameState.addHypothesis({
      title: 'Яд был приобретён в портовой аптеке',
      reasoning: 'Отчёт о вскрытии и запись аптеки указывают на один препарат.',
      clueIds: ['autopsy', 'pharmacy']
    });
    assert.deepEqual(hypothesis.clueIds, ['autopsy', 'pharmacy']);
    const revised = GameState.reviseHypothesis(hypothesis.id, {
      status: 'probable',
      reasoning: 'Два документа согласуются, но личность покупателя ещё не установлена.'
    });
    assert.equal(revised.status, 'probable');
    assert.equal(revised.history.length, 2);

    const exported = Notebook.exportToText();
    for (const value of [
      'ОБНАРУЖЕННЫЕ УЛИКИ (2)', 'Отчёт о вскрытии', 'Запись аптеки',
      'Протокол вскрытия', 'Реестр аптеки', 'Морг', 'Портовая аптека',
      'Яд был приобретён в портовой аптеке'
    ]) {
      if (value === 'Яд был приобретён в портовой аптеке') continue;
      assert.ok(exported.includes(value), 'export should include ' + value);
    }
    assert.equal(GameState.currentCase.hypotheses[0].status, 'probable');
  } finally {
    GameState.currentCase = previous.currentCase;
    GameState.flags = previous.flags;
    GameState.save = previous.save;
    GameState.notebook = previous.notebook;
    Investigation._cluesData = previous.cluesData;
    Investigation._connections = previous.connections;
    Investigation._contradictionRules = previous.rules;
    Investigation._initialized = previous.initialized;
  }
});
