import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { Events } from '../src/js/core/events.js';
import { challengeNpcKnowledge, getNpcKnowledge, normalizeKnowledgeLedger } from '../src/js/systems/npc-knowledge.js';

function ledgerFixture() {
  return { entries: [{
    id: 'belief-ray-caller',
    npcId: 'npc_ray_morgan',
    claimRef: 'claim_caller_was_clerk',
    sourceType: 'rumor',
    state: 'unverified',
    provenance: 'Ray heard that the caller was a court clerk.',
    sourceNpcId: 'npc_anna_holt',
    sourceRefs: ['rumor-anna-ray'],
    stateHistory: [],
    rumorTrail: [{
      fromNpcId: 'npc_anna_holt',
      toNpcId: 'npc_ray_morgan',
      sourceKnowledgeId: 'knowledge-anna-clerk',
      distortions: [],
      transmittedAt: '2026-11-22T08:00:00.000Z'
    }]
  }] };
}

const evidence = [
  { id: 'court_switchboard_log', name: 'Выписка из журнала звонков' },
  { id: 'court_extension_directory', name: 'Список внутренних номеров' }
];

test('evidence challenge disputes only the addressed NPC belief and keeps the exact evidence trail', () => {
  const ledger = ledgerFixture();
  const challenged = challengeNpcKnowledge(ledger, {
    entryId: 'belief-ray-caller',
    npcId: 'npc_ray_morgan',
    clueIds: ['court_switchboard_log', 'court_extension_directory'],
    reason: 'В журнале не указано имя звонившего, а номер принадлежал общей комнате.'
  }, evidence);

  assert.ok(challenged);
  assert.equal(challenged.state, 'disputed');
  assert.equal(challenged.claimRef, 'claim_caller_was_clerk');
  assert.deepEqual(challenged.challengeHistory[0].clueIds, [
    'court_switchboard_log', 'court_extension_directory'
  ]);
  assert.equal(challenged.stateHistory.length, 1);
  assert.equal(challenged.stateHistory[0].from, 'unverified');
  assert.equal(challenged.stateHistory[0].to, 'disputed');
  assert.equal(challenged.rumorTrail.length, 1);
  assert.equal(ledger.entries[0].state, 'disputed');
  assert.equal(challengeNpcKnowledge(ledger, {
    entryId: 'belief-ray-caller',
    npcId: 'npc_ray_morgan',
    clueIds: ['court_switchboard_log', 'court_extension_directory'],
    reason: 'The same evidence was presented again.'
  }, evidence), null, 'the same evidence set cannot be recorded twice');
});

test('evidence challenge rejects another NPC, undiscovered clues and empty reasons', () => {
  const ledger = ledgerFixture();
  const base = {
    entryId: 'belief-ray-caller',
    npcId: 'npc_ray_morgan',
    clueIds: ['court_switchboard_log'],
    reason: 'A documented call exists.'
  };
  assert.equal(challengeNpcKnowledge(ledger, { ...base, npcId: 'npc_anna_holt' }, evidence), null);
  assert.equal(challengeNpcKnowledge(ledger, { ...base, clueIds: ['not_discovered'] }, evidence), null);
  assert.equal(challengeNpcKnowledge(ledger, { ...base, reason: '  ' }, evidence), null);
  assert.equal(challengeNpcKnowledge(ledger, { ...base, clueIds: [] }, evidence), null);
  assert.equal(ledger.entries[0].state, 'unverified');
  assert.equal(ledger.entries[0].challengeHistory, undefined);
});

test('challenging a belief never proves the opposite or changes another NPC account', () => {
  const ledger = ledgerFixture();
  ledger.entries.push({
    id: 'belief-anna-caller',
    npcId: 'npc_anna_holt',
    claimRef: 'claim_caller_was_clerk',
    sourceType: 'interview',
    state: 'corroborated',
    provenance: 'Anna says she saw a clerk near the switchboard.',
    sourceNpcId: null,
    sourceRefs: [],
    stateHistory: []
  });
  challengeNpcKnowledge(ledger, {
    entryId: 'belief-ray-caller',
    npcId: 'npc_ray_morgan',
    clueIds: ['court_switchboard_log'],
    reason: 'The log contains no caller name.'
  }, evidence);
  assert.equal(ledger.entries[0].state, 'disputed');
  assert.equal(ledger.entries[1].state, 'corroborated');
  assert.equal(ledger.entries[0].claimRef, ledger.entries[1].claimRef);
});

test('normalized and read NPC belief histories are isolated copies', () => {
  const ledger = normalizeKnowledgeLedger(ledgerFixture());
  const read = getNpcKnowledge(ledger, 'npc_ray_morgan')[0];
  read.rumorTrail[0].fromNpcId = 'tampered';
  read.challengeHistory?.push({ id: 'tampered' });
  assert.equal(ledger.entries[0].rumorTrail[0].fromNpcId, 'npc_anna_holt');
  assert.equal(ledger.entries[0].challengeHistory, undefined);
});

test('GameState evidence challenge rolls back on save failure and emits only after success', () => {
  const previousLedger = GameState.knowledgeLedger;
  const previousSave = Storage.save;
  const previousBlocked = GameState.saveBlocked;
  const previousClues = GameState.currentCase.clues;
  const emitted = [];
  const off = [
    Events.on('npc:knowledge_challenged', entry => emitted.push(['challenged', entry])),
    Events.on('npc:knowledge_updated', entry => emitted.push(['updated', entry]))
  ];

  try {
    GameState.saveBlocked = false;
    GameState.knowledgeLedger = ledgerFixture();
    GameState.currentCase.clues = evidence;
    const entriesRef = GameState.knowledgeLedger.entries;
    const before = structuredClone(entriesRef);
    Storage.save = () => false;

    assert.equal(GameState.challengeNpcKnowledge({
      entryId: 'belief-ray-caller',
      npcId: 'npc_ray_morgan',
      clueIds: ['court_switchboard_log'],
      reason: 'The record does not name the caller.'
    }), null);
    assert.deepEqual(entriesRef, before);
    assert.equal(GameState.knowledgeLedger.entries, entriesRef);
    assert.deepEqual(emitted, []);

    Storage.save = () => true;
    const challenged = GameState.challengeNpcKnowledge({
      entryId: 'belief-ray-caller',
      npcId: 'npc_ray_morgan',
      clueIds: ['court_switchboard_log'],
      reason: 'The record does not name the caller.'
    });
    assert.equal(challenged.state, 'disputed');
    assert.deepEqual(emitted.map(item => item[0]), ['challenged', 'updated']);
  } finally {
    off.forEach(unsubscribe => unsubscribe());
    Storage.save = previousSave;
    GameState.knowledgeLedger = previousLedger;
    GameState.currentCase.clues = previousClues;
    GameState.saveBlocked = previousBlocked;
  }
});
