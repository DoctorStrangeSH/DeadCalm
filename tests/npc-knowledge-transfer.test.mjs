import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { Events } from '../src/js/core/events.js';
import { transferNpcKnowledge } from '../src/js/systems/npc-knowledge.js';

function setupMeeting() {
  GameState.socialGraph = {
    ties: [],
    events: [{
      id: 'social-event-ray-anna-meeting',
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      description: 'Ray and Anna spoke in the archive.',
      sourceType: 'direct_observation',
      certainty: 'corroborated',
      sourceRefs: ['player-witnessed-meeting']
    }]
  };
  GameState.npcDailyLife = {
    schedules: [],
    occurrences: [
      { id: 'occurrence-ray-archive', npcId: 'npc_ray_morgan', day: 2, minute: 610, locationId: 'archive' },
      { id: 'occurrence-anna-archive', npcId: 'npc_anna_holt', day: 2, minute: 618, locationId: 'archive' }
    ]
  };
}

function setupLedger() {
  return {
    entries: [{
      id: 'knowledge-ray-calls',
      npcId: 'npc_ray_morgan',
      claimRef: 'claim_court_switchboard_call',
      sourceType: 'document',
      state: 'corroborated',
      provenance: 'Ray reviewed the signed court switchboard register.',
      sourceNpcId: null,
      sourceRefs: ['clue_switchboard_register'],
      stateHistory: [],
      recordedAt: '2026-11-22T08:00:00.000Z'
    }]
  };
}

test('NPC knowledge relay requires an existing source account and never promotes truth', () => {
  const ledger = setupLedger();

  assert.equal(transferNpcKnowledge(ledger, {
    fromNpcId: 'npc_marta_hayes',
    toNpcId: 'npc_anna_holt',
    sourceKnowledgeId: 'knowledge-ray-calls',
    sourceType: 'rumor',
    provenance: 'Marta heard the account from Ray.'
  }), null);
  assert.equal(ledger.entries.length, 1);

  const received = transferNpcKnowledge(ledger, {
    fromNpcId: 'npc_ray_morgan',
    toNpcId: 'npc_anna_holt',
    sourceKnowledgeId: 'knowledge-ray-calls',
    sourceType: 'rumor',
    provenance: 'Ray told Anna what he found in the register.'
  });

  assert.ok(received);
  assert.equal(received.npcId, 'npc_anna_holt');
  assert.equal(received.sourceNpcId, 'npc_ray_morgan');
  assert.equal(received.claimRef, 'claim_court_switchboard_call');
  assert.equal(received.sourceType, 'rumor');
  assert.equal(received.state, 'unverified');
  assert.deepEqual(received.sourceRefs, ['knowledge-ray-calls']);
  assert.equal(ledger.entries.find(item => item.id === 'knowledge-ray-calls').state, 'corroborated');

  assert.equal(transferNpcKnowledge(ledger, {
    fromNpcId: 'npc_ray_morgan',
    toNpcId: 'npc_anna_holt',
    sourceKnowledgeId: 'knowledge-ray-calls',
    sourceType: 'rumor',
    provenance: 'Ray repeated the same account.'
  }), null, 'the same source account cannot be delivered twice to the same NPC');
  assert.equal(ledger.entries.length, 2);
});

test('NPC knowledge relay rejects self-transfer, missing provenance and unsupported channels', () => {
  const ledger = setupLedger();
  const base = {
    fromNpcId: 'npc_ray_morgan',
    toNpcId: 'npc_anna_holt',
    sourceKnowledgeId: 'knowledge-ray-calls',
    sourceType: 'rumor',
    provenance: 'Ray told Anna.'
  };

  assert.equal(transferNpcKnowledge(ledger, { ...base, toNpcId: 'npc_ray_morgan' }), null);
  assert.equal(transferNpcKnowledge(ledger, { ...base, provenance: '  ' }), null);
  assert.equal(transferNpcKnowledge(ledger, { ...base, sourceType: 'direct_observation' }), null);
  assert.equal(transferNpcKnowledge(ledger, { ...base, sourceKnowledgeId: 'missing' }), null);
  assert.equal(ledger.entries.length, 1);
});

test('GameState persists a knowledge relay atomically and emits only after success', () => {
  const previousLedger = GameState.knowledgeLedger;
  const previousSocialGraph = GameState.socialGraph;
  const previousDailyLife = GameState.npcDailyLife;
  const previousSave = Storage.save;
  const previousBlocked = GameState.saveBlocked;
  const emitted = [];
  const off = [
    Events.on('npc:knowledge_transferred', entry => emitted.push(['transferred', entry])),
    Events.on('npc:knowledge_recorded', entry => emitted.push(['recorded', entry]))
  ];

  try {
    GameState.saveBlocked = false;
    GameState.knowledgeLedger = setupLedger();
    setupMeeting();
    const entriesRef = GameState.knowledgeLedger.entries;
    const snapshot = structuredClone(entriesRef);
    Storage.save = () => false;

    assert.equal(GameState.transferNpcKnowledge({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_marta_hayes',
      sourceKnowledgeId: 'knowledge-ray-calls',
      sourceType: 'rumor',
      provenance: 'Ray told Marta.'
    }), null, 'knowledge cannot spread to an NPC without a witnessed meeting');
    assert.equal(GameState.transferNpcKnowledge({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      sourceKnowledgeId: 'knowledge-ray-calls',
      sourceType: 'rumor',
      provenance: 'Ray told Anna what he found in the register.'
    }), null);
    assert.deepEqual(entriesRef, snapshot);
    assert.equal(GameState.knowledgeLedger.entries, entriesRef);
    assert.deepEqual(emitted, []);

    Storage.save = () => true;
    const transferred = GameState.transferNpcKnowledge({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      sourceKnowledgeId: 'knowledge-ray-calls',
      sourceType: 'rumor',
      provenance: 'Ray told Anna what he found in the register.'
    });
    assert.equal(transferred.state, 'unverified');
    assert.deepEqual(emitted.map(item => item[0]), ['transferred', 'recorded']);
  } finally {
    off.forEach(unsubscribe => unsubscribe());
    Storage.save = previousSave;
    GameState.knowledgeLedger = previousLedger;
    GameState.socialGraph = previousSocialGraph;
    GameState.npcDailyLife = previousDailyLife;
    GameState.saveBlocked = previousBlocked;
  }
});


test('participant testimony alone cannot authorize knowledge transfer without a witnessed meeting', () => {
  const previousLedger = GameState.knowledgeLedger;
  const previousSocialGraph = GameState.socialGraph;
  const previousDailyLife = GameState.npcDailyLife;
  const previousSave = Storage.save;
  const previousBlocked = GameState.saveBlocked;
  try {
    GameState.saveBlocked = false;
    GameState.knowledgeLedger = setupLedger();
    setupMeeting();
    GameState.socialGraph.events[0].sourceType = 'interview';
    GameState.socialGraph.events[0].certainty = 'unverified';
    Storage.save = () => true;
    assert.equal(GameState.transferNpcKnowledge({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      sourceKnowledgeId: 'knowledge-ray-calls',
      sourceType: 'rumor',
      provenance: 'Ray told Anna what he found.'
    }), null, 'a reported account is not a witnessed meeting');
    assert.equal(GameState.knowledgeLedger.entries.length, 1);
  } finally {
    Storage.save = previousSave;
    GameState.knowledgeLedger = previousLedger;
    GameState.socialGraph = previousSocialGraph;
    GameState.npcDailyLife = previousDailyLife;
    GameState.saveBlocked = previousBlocked;
  }
});
