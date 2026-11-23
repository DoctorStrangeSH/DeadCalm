import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';

test('explicit NPC-to-NPC evidence, knowledge provenance and social history survive save/load without automatic rumor propagation', () => {
  const keys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked', 'save'
  ];
  const previous = Object.fromEntries(keys.map(key => [key, GameState[key]]));
  const previousStorageSave = Storage.save;

  try {
    Storage.save = () => true;
    GameState.saveBlocked = false;
    GameState.player = { name: 'Джон Риверс', reputation: 50 };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
    GameState.flags = {};
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    GameState.miniGameProgress = {};
    GameState.notebook = [];
    GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };

    const tie = GameState.recordSocialTie({
      id: 'anna-markus-family',
      fromNpcId: 'npc_anna_holt',
      toNpcId: 'npc_markus_holt',
      type: 'family',
      status: 'strained',
      basis: 'The authored character record identifies Anna as Markus Holt’s adoptive daughter.',
      sourceRefs: ['character-canon-anna-markus']
    });
    assert.ok(tie);

    const knowledge = GameState.recordNpcKnowledge({
      id: 'marta-hears-anna-boundary',
      npcId: 'npc_marta_hayes',
      claimRef: 'anna_refused_box_transfer',
      sourceType: 'interview',
      state: 'unverified',
      provenance: 'Marta was explicitly told about Anna’s refusal during a recorded interview.',
      sourceNpcId: 'npc_anna_holt',
      sourceRefs: ['interview-marta-anna-01']
    });
    assert.ok(knowledge);
    assert.equal(GameState.getNpcKnowledge('npc_anna_holt').length, 0,
      'the source NPC must not receive a copy of the recipient’s knowledge');
    assert.equal(GameState.getNpcKnowledge('npc_sebastian_blackwood').length, 0,
      'unrelated NPCs must not inherit another character’s information');

    const updated = GameState.updateNpcKnowledgeState(
      'marta-hears-anna-boundary',
      'corroborated',
      'A second independent interview record confirms that Marta was told.'
    );
    assert.equal(updated.stateHistory.length, 1);

    const snapshot = GameState.export();
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    assert.equal(GameState.importSave(snapshot), true);

    const annaContext = GameState.getSocialContext('npc_anna_holt');
    assert.equal(annaContext.connectionCount, 1);
    assert.equal(annaContext.ties[0].status, 'strained');
    assert.deepEqual(annaContext.ties[0].sourceRefs, ['character-canon-anna-markus']);

    const martaKnowledge = GameState.getNpcKnowledge('npc_marta_hayes');
    assert.equal(martaKnowledge.length, 1);
    assert.equal(martaKnowledge[0].sourceNpcId, 'npc_anna_holt');
    assert.equal(martaKnowledge[0].sourceType, 'interview');
    assert.equal(martaKnowledge[0].state, 'corroborated');
    assert.equal(martaKnowledge[0].stateHistory.length, 1);
    assert.equal(GameState.getNpcKnowledge('npc_anna_holt').length, 0);
    assert.equal(GameState.getNpcKnowledge('npc_sebastian_blackwood').length, 0);
  } finally {
    Storage.save = previousStorageSave;
    Object.assign(GameState, previous);
  }
});
