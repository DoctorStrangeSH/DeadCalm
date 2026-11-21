import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { findContradictions } from '../src/js/systems/contradictions.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));

test('evidence → hypothesis → contradiction → revision survives save and reload without revealing missing evidence', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked'
  ];
  const previous = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const previousStorageSave = Storage.save;

  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
    GameState.player = { name: 'Джон Риверс', reputation: 50 };
    GameState.currentCase = {
      id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: []
    };
    GameState.campaign = { caseId: 'case_001', day: 3, completed: false, ending: null };
    GameState.flags = {};
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [];
    GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };

    const rule = rules.find(item => item.id === 'court_room_access_vs_call');
    assert.ok(rule);
    const [firstId, secondId] = rule.clueIds;
    assert.ok(clues[firstId] && clues[secondId]);

    GameState.addClue(clues[firstId]);
    let hypothesis = GameState.addHypothesis({
      title: 'Записи суда расходятся по времени',
      reasoning: 'Пока найден только один документ; вывод делать рано.',
      clueIds: [firstId, secondId]
    });
    assert.deepEqual(findContradictions(hypothesis, GameState.currentCase.clues, rules), [],
      'a catalog reference to an undiscovered clue must not unlock the contradiction');

    GameState.addClue(clues[secondId]);
    assert.deepEqual(findContradictions(hypothesis, GameState.currentCase.clues, rules).map(item => item.id), [rule.id],
      'both pieces must be discovered and attached to the same hypothesis');

    hypothesis = GameState.reviseHypothesis(hypothesis.id, {
      status: 'probable',
      reasoning: 'Обе записи доступны. Есть расхождение, но неизвестно, какая запись ошибочна.'
    });
    assert.equal(hypothesis.status, 'probable');
    assert.deepEqual(findContradictions(hypothesis, GameState.currentCase.clues, rules).map(item => item.id), [rule.id]);

    const saved = GameState.export();
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    assert.equal(GameState.importSave(saved), true);

    const restored = GameState.currentCase.hypotheses.find(item => item.id === hypothesis.id);
    assert.ok(restored);
    assert.equal(restored.status, 'probable');
    assert.equal(restored.history.length, 2);
    assert.deepEqual(restored.clueIds, [firstId, secondId]);
    assert.deepEqual(findContradictions(restored, GameState.currentCase.clues, rules).map(item => item.id), [rule.id]);

    const revised = GameState.reviseHypothesis(restored.id, {
      clueIds: [firstId],
      reasoning: 'После повторной проверки второй документ пока исключён из версии.'
    });
    assert.deepEqual(findContradictions(revised, GameState.currentCase.clues, rules), [],
      'removing one supporting clue from the hypothesis must close the contradiction follow-up');
    assert.equal(GameState.currentCase.clues.length, 2,
      'revising a hypothesis must not erase evidence already discovered by the player');
  } finally {
    Storage.save = previousStorageSave;
    Object.assign(GameState, previous);
  }
});
