import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { Events } from '../src/js/core/events.js';
import { getNpcKnowledge, normalizeKnowledgeLedger, transferNpcRumor } from '../src/js/systems/npc-knowledge.js';

function sourceLedger() {
  return { entries: [{
    id: 'knowledge-ray-report',
    npcId: 'npc_ray_morgan',
    claimRef: 'claim_court_switchboard_call',
    sourceType: 'interview',
    state: 'corroborated',
    provenance: 'Ray read the signed switchboard register.',
    sourceNpcId: null,
    sourceRefs: ['clue_switchboard_register'],
    stateHistory: [],
    recordedAt: '2026-11-22T08:00:00.000Z'
  }] };
}

function setupMeeting(fromNpcId, toNpcId, suffix) {
  GameState.socialGraph = {
    ties: [],
    events: [{ id: 'social-' + suffix, fromNpcId, toNpcId, description: 'A witnessed conversation.', sourceType: 'direct_observation', certainty: 'corroborated', sourceRefs: ['player-witnessed-' + suffix] }]
  };
  GameState.npcDailyLife = {
    schedules: [],
    occurrences: [
      { id: 'occ-' + suffix + '-a', npcId: fromNpcId, day: 2, minute: 610, locationId: 'archive' },
      { id: 'occ-' + suffix + '-b', npcId: toNpcId, day: 2, minute: 620, locationId: 'archive' }
    ]
  };
}

test('rumor transmission preserves its chain and records intentional and accidental distortion separately', () => {
  const ledger = sourceLedger();
  const first = transferNpcRumor(ledger, {
    fromNpcId: 'npc_ray_morgan',
    toNpcId: 'npc_anna_holt',
    sourceKnowledgeId: 'knowledge-ray-report',
    provenance: 'Ray told Anna what the register showed.',
    distortions: [{
      detail: 'caller_identity',
      from: 'unknown',
      to: 'a court clerk',
      intentional: false,
      reason: 'Anna filled the gap with an assumption.'
    }]
  });
  assert.ok(first);
  assert.equal(first.state, 'unverified');
  assert.equal(first.sourceType, 'rumor');
  assert.equal(first.rumorTrail.length, 1);
  assert.equal(first.rumorTrail[0].distortions[0].intentional, false);

  const second = transferNpcRumor(ledger, {
    fromNpcId: 'npc_anna_holt',
    toNpcId: 'npc_marta_hayes',
    sourceKnowledgeId: first.id,
    provenance: 'Anna repeated her version to Marta.',
    distortions: [{
      detail: 'caller_identity',
      from: 'a court clerk',
      to: 'the judge',
      intentional: true,
      reason: 'Anna wanted the story to sound more certain.'
    }]
  });
  assert.ok(second);
  assert.equal(second.state, 'unverified');
  assert.equal(second.rumorTrail.length, 2);
  const readCopy = getNpcKnowledge(ledger, 'npc_marta_hayes')[0];
  readCopy.rumorTrail[0].distortions[0].to = 'corrupted by caller';
  assert.equal(ledger.entries.find(item => item.id === second.id).rumorTrail[0].distortions[0].to,
    'a court clerk', 'reading rumor history must not expose mutable save data');
  assert.deepEqual(second.rumorTrail.map(hop => [hop.fromNpcId, hop.toNpcId]), [
    ['npc_ray_morgan', 'npc_anna_holt'],
    ['npc_anna_holt', 'npc_marta_hayes']
  ]);
  assert.deepEqual(second.rumorTrail.map(hop => hop.distortions[0].intentional), [false, true]);
  assert.deepEqual(second.sourceRefs.slice(0, 1), [first.id]);
  assert.equal(ledger.entries[0].state, 'corroborated', 'rumor transmission never changes the original account');
});

test('rumor distortion rejects unsupported, unchanged or unattributed detail changes', () => {
  const invalid = [
    { detail: 'caller', from: 'unknown', to: 'clerk', intentional: false, reason: '' },
    { detail: 'caller', from: 'unknown', to: 'unknown', intentional: true, reason: 'A deliberate lie.' },
    { detail: 'caller', from: { name: 'unknown' }, to: 'clerk', intentional: true, reason: 'A deliberate lie.' },
    { detail: 'caller', from: 'unknown', to: 'clerk', intentional: 'yes', reason: 'A deliberate lie.' }
  ];
  for (const distortion of invalid) {
    const ledger = sourceLedger();
    assert.equal(transferNpcRumor(ledger, {
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      sourceKnowledgeId: 'knowledge-ray-report',
      provenance: 'Ray told Anna.',
      distortions: [distortion]
    }), null);
    assert.equal(ledger.entries.length, 1);
  }
});

test('knowledge-ledger normalization keeps valid rumor lineage and discards malformed hops', () => {
  const ledger = normalizeKnowledgeLedger({
    entries: [{
      ...sourceLedger().entries[0],
      id: 'rumor-valid',
      npcId: 'npc_anna_holt',
      sourceType: 'rumor',
      sourceNpcId: 'npc_ray_morgan',
      sourceRefs: ['knowledge-ray-report'],
      rumorTrail: [{
        fromNpcId: 'npc_ray_morgan',
        toNpcId: 'npc_anna_holt',
        sourceKnowledgeId: 'knowledge-ray-report',
        distortions: [],
        transmittedAt: '2026-11-22T08:30:00.000Z'
      }, {
        fromNpcId: 'npc_anna_holt',
        toNpcId: 'npc_marta_hayes',
        sourceKnowledgeId: 'missing',
        distortions: [{ detail: 'bad' }]
      }]
    }]
  });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].rumorTrail.length, 1);
});

test('GameState rumor transfer requires a witnessed meeting and persists atomically', () => {
  const previousLedger = GameState.knowledgeLedger;
  const previousSocialGraph = GameState.socialGraph;
  const previousDailyLife = GameState.npcDailyLife;
  const previousSave = Storage.save;
  const previousBlocked = GameState.saveBlocked;
  const emitted = [];
  const off = [
    Events.on('npc:rumor_transferred', entry => emitted.push(entry)),
    Events.on('npc:knowledge_recorded', entry => emitted.push(entry))
  ];

  try {
    GameState.saveBlocked = false;
    GameState.knowledgeLedger = sourceLedger();
    setupMeeting('npc_ray_morgan', 'npc_anna_holt', 'ray-anna');
    const before = structuredClone(GameState.knowledgeLedger);
    Storage.save = () => false;
    const input = {
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_anna_holt',
      sourceKnowledgeId: 'knowledge-ray-report',
      provenance: 'Ray told Anna what the register showed.',
      distortions: []
    };
    assert.equal(GameState.transferNpcRumor(input), null);
    assert.deepEqual(GameState.knowledgeLedger, before);
    assert.deepEqual(emitted, []);

    Storage.save = () => true;
    const received = GameState.transferNpcRumor(input);
    assert.ok(received);
    assert.equal(received.state, 'unverified');
    assert.equal(emitted.length, 2);

    setupMeeting('npc_anna_holt', 'npc_marta_hayes', 'anna-marta');
    const second = GameState.transferNpcRumor({
      fromNpcId: 'npc_anna_holt',
      toNpcId: 'npc_marta_hayes',
      sourceKnowledgeId: received.id,
      provenance: 'Anna repeated the rumor to Marta.',
      distortions: []
    });
    assert.equal(second.rumorTrail.length, 2);

    setupMeeting('npc_ray_morgan', 'npc_marta_hayes', 'ray-marta');
    const directBranch = GameState.transferNpcRumor({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_marta_hayes',
      sourceKnowledgeId: 'knowledge-ray-report',
      provenance: 'Ray bypassed the chain and told Marta.',
      distortions: []
    });
    assert.ok(directBranch, 'a witnessed direct conversation may create a separate branch');
    assert.equal(directBranch.rumorTrail.length, 1);
    assert.equal(directBranch.sourceNpcId, 'npc_ray_morgan');
    assert.equal(GameState.transferNpcRumor({
      fromNpcId: 'npc_ray_morgan',
      toNpcId: 'npc_marta_hayes',
      sourceKnowledgeId: 'knowledge-ray-report',
      provenance: 'Ray repeats the same account.'
    }), null, 'the same source-to-recipient branch cannot be duplicated');
  } finally {
    off.forEach(unsubscribe => unsubscribe());
    Storage.save = previousSave;
    GameState.knowledgeLedger = previousLedger;
    GameState.socialGraph = previousSocialGraph;
    GameState.npcDailyLife = previousDailyLife;
    GameState.saveBlocked = previousBlocked;
  }
});
