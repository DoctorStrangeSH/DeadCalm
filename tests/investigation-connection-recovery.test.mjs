import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Investigation } from '../src/js/systems/investigation.js';

test('board connections are rebuilt from saved flags after a fresh module session', () => {
  const previous = {
    currentCase: GameState.currentCase,
    flags: GameState.flags,
    save: GameState.save,
    cluesData: Investigation._cluesData,
    connections: Investigation._connections,
    rules: Investigation._contradictionRules,
    initialized: Investigation._initialized
  };

  try {
    GameState.save = () => true;
    GameState.currentCase = {
      id: 'case_001',
      clues: [
        { id: 'autopsy_report_01', name: 'Отчёт о вскрытии' },
        { id: 'poison_vial_info', name: 'Информация о яде' },
        { id: 'letter_k_mark', name: 'Буква К' }
      ],
      hypotheses: []
    };
    GameState.flags = {};
    Investigation._cluesData = {
      autopsy_report_01: {
        id: 'autopsy_report_01',
        connections_to: ['poison_vial_info', 'letter_k_mark']
      },
      poison_vial_info: {
        id: 'poison_vial_info',
        connections_to: ['autopsy_report_01']
      },
      letter_k_mark: {
        id: 'letter_k_mark',
        connections_to: ['autopsy_report_01']
      }
    };
    Investigation._connections = [];

    const connection = Investigation.checkConnection('autopsy_report_01', 'poison_vial_info');
    assert.ok(connection);
    assert.equal(Investigation.saveConnection(connection), true);
    assert.equal(GameState.hasFlag('connection_' + connection.id), true);

    // Simulate a full page reload: in-memory board connections disappear,
    // but the persisted case flags and clue catalog remain.
    Investigation._connections = [];
    const restored = Investigation.getConnections();
    assert.deepEqual(restored.map(item => item.id), [connection.id]);
    assert.equal(Investigation.getProgress().connections, 1);
    assert.equal(Investigation.saveConnection(connection), false,
      'restoring and re-saving an existing connection must not duplicate it');
  } finally {
    GameState.currentCase = previous.currentCase;
    GameState.flags = previous.flags;
    GameState.save = previous.save;
    Investigation._cluesData = previous.cluesData;
    Investigation._connections = previous.connections;
    Investigation._contradictionRules = previous.rules;
    Investigation._initialized = previous.initialized;
  }
});

test('connection restoration never exposes links to clues the player has not found', () => {
  const previous = {
    currentCase: GameState.currentCase,
    flags: GameState.flags,
    cluesData: Investigation._cluesData,
    connections: Investigation._connections
  };

  try {
    GameState.currentCase = {
      id: 'case_001',
      clues: [{ id: 'autopsy_report_01', name: 'Отчёт о вскрытии' }],
      hypotheses: []
    };
    GameState.flags = {
      connection_conn_autopsy_report_01_poison_vial_info: true
    };
    Investigation._cluesData = {
      autopsy_report_01: { id: 'autopsy_report_01', connections_to: ['poison_vial_info'] },
      poison_vial_info: { id: 'poison_vial_info', name: 'Скрытая улика', connections_to: ['autopsy_report_01'] }
    };
    Investigation._connections = [];

    assert.deepEqual(Investigation.getConnections(), []);
  } finally {
    GameState.currentCase = previous.currentCase;
    GameState.flags = previous.flags;
    Investigation._cluesData = previous.cluesData;
    Investigation._connections = previous.connections;
  }
});
