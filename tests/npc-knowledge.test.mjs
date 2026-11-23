import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyKnowledgeLedger,
  getNpcKnowledge,
  getNpcKnowledgeContext,
  normalizeKnowledgeLedger,
  recordNpcKnowledge,
  updateNpcKnowledgeState
} from '../src/js/systems/npc-knowledge.js';

test('new and legacy saves produce an empty knowledge ledger', () => {
  assert.deepEqual(createEmptyKnowledgeLedger(), { entries: [] });
  assert.deepEqual(normalizeKnowledgeLedger(undefined), { entries: [] });
  assert.deepEqual(normalizeKnowledgeLedger({ oldMemory: {} }), { entries: [] });
});

test('NPC knowledge is attributed and does not establish claim truth', () => {
  const ledger = createEmptyKnowledgeLedger();
  const entry = recordNpcKnowledge(ledger, {
    npcId: 'npc_marta', claimRef: 'claim_court_lights', sourceType: 'rumor',
    provenance: 'Heard it from a bartender during the late shift.',
    sourceNpcId: 'npc_pavel', sourceRefs: ['bar_statement_02']
  });
  assert.ok(entry);
  assert.equal(entry.state, 'unverified');
  assert.equal(entry.sourceType, 'rumor');
  assert.equal(ledger.entries.length, 1);
});

test('invalid provenance, self-sourced claims and duplicate IDs are rejected', () => {
  const ledger = createEmptyKnowledgeLedger();
  assert.equal(recordNpcKnowledge(ledger, { npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'rumor' }), null);
  assert.equal(recordNpcKnowledge(ledger, { npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'rumor', provenance: 'A rumor.', sourceNpcId: 'npc_a' }), null);
  recordNpcKnowledge(ledger, { id: 'fixed', npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'interview', provenance: 'The witness said so.' });
  assert.equal(recordNpcKnowledge(ledger, { id: 'fixed', npcId: 'npc_b', claimRef: 'claim_2', sourceType: 'document', provenance: 'A report.' }), null);
  assert.equal(ledger.entries.length, 1);
});

test('knowledge status changes require a reason and preserve a history', () => {
  const ledger = createEmptyKnowledgeLedger();
  const entry = recordNpcKnowledge(ledger, { id: 'k1', npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'direct_observation', provenance: 'Saw the event personally.' });
  assert.equal(updateNpcKnowledgeState(ledger, 'k1', 'corroborated', ''), null);
  const updated = updateNpcKnowledgeState(ledger, 'k1', 'corroborated', 'A second independent witness confirms the detail.');
  assert.equal(updated.state, 'corroborated');
  assert.equal(updated.stateHistory.length, 1);
  assert.equal(updated.stateHistory[0].from, 'unverified');
  assert.equal(updated.stateHistory[0].to, 'corroborated');
  const disputed = updateNpcKnowledgeState(ledger, 'k1', 'disputed', 'A conflicting record challenges the account.');
  assert.equal(disputed.stateHistory[1].from, 'corroborated');
  assert.equal(disputed.stateHistory[1].to, 'disputed');
  assert.equal(updateNpcKnowledgeState(ledger, 'missing', 'disputed', 'No matching source.'), null);
});

test('knowledge queries isolate NPCs and return detached copies', () => {
  const ledger = createEmptyKnowledgeLedger();
  recordNpcKnowledge(ledger, { npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'rumor', provenance: 'A bar rumor.' });
  recordNpcKnowledge(ledger, { npcId: 'npc_a', claimRef: 'claim_2', sourceType: 'document', provenance: 'Read a signed log.' });
  recordNpcKnowledge(ledger, { npcId: 'npc_b', claimRef: 'claim_1', sourceType: 'interview', provenance: 'Heard from a witness.' });
  const entries = getNpcKnowledge(ledger, 'npc_a');
  entries[0].state = 'disputed';
  assert.equal(ledger.entries[0].state, 'unverified');
  const context = getNpcKnowledgeContext(ledger, 'npc_a');
  assert.equal(context.total, 2);
  assert.equal(context.hearsay, 1);
});

test('malformed legacy records are filtered and duplicate ids are collapsed', () => {
  const normalized = normalizeKnowledgeLedger({ entries: [
    { id: 'k1', npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'document', state: 'unverified', provenance: 'A signed record.' },
    { id: 'k1', npcId: 'npc_b', claimRef: 'claim_2', sourceType: 'rumor', state: 'unverified', provenance: 'A rumor.' },
    { id: 'blank', npcId: 'npc_a', claimRef: 'claim_3', sourceType: 'rumor', state: 'unverified', provenance: ' ' }
  ] });
  assert.equal(normalized.entries.length, 1);
  assert.equal(normalized.entries[0].npcId, 'npc_a');
  assert.deepEqual(normalized.entries[0].sourceRefs, []);
});


test('returned knowledge snapshots cannot mutate the saved state-transition history', () => {
  const ledger = createEmptyKnowledgeLedger();
  const created = recordNpcKnowledge(ledger, {
    id: 'isolated-history',
    npcId: 'npc_a',
    claimRef: 'claim_17',
    sourceType: 'document',
    provenance: 'A signed register entry.'
  });
  assert.deepEqual(created.stateHistory, []);

  const updated = updateNpcKnowledgeState(
    ledger, 'isolated-history', 'corroborated', 'A second independent register confirms the entry.'
  );
  assert.equal(updated.stateHistory.length, 1);
  updated.stateHistory[0].reason = 'tampered through returned snapshot';
  updated.stateHistory.push({ from: 'corroborated', to: 'disputed', reason: 'forged' });
  assert.equal(ledger.entries[0].stateHistory.length, 1);
  assert.equal(ledger.entries[0].stateHistory[0].reason,
    'A second independent register confirms the entry.');

  const queried = getNpcKnowledge(ledger, 'npc_a');
  queried[0].stateHistory[0].reason = 'tampered through query';
  assert.equal(ledger.entries[0].stateHistory[0].reason,
    'A second independent register confirms the entry.');
});

test('legacy knowledge history drops malformed transitions but retains valid provenance', () => {
  const normalized = normalizeKnowledgeLedger({ entries: [{
    id: 'legacy-history',
    npcId: 'npc_a',
    claimRef: 'claim_18',
    sourceType: 'interview',
    state: 'disputed',
    provenance: 'A witness gave a conflicting account.',
    sourceRefs: ['statement-18'],
    stateHistory: [
      { from: 'unverified', to: 'corroborated', reason: 'Second source found.', changedAt: '2026-11-20T10:00:00Z' },
      { from: 'corroborated', to: 'unknown', reason: 'Invalid state.' },
      { from: 'disputed', to: 'disputed', reason: 'No transition.' },
      { from: 'disputed', to: 'unverified', reason: '   ' }
    ]
  }] });
  assert.equal(normalized.entries.length, 1);
  assert.equal(normalized.entries[0].state, 'disputed');
  assert.equal(normalized.entries[0].stateHistory.length, 1);
  assert.equal(normalized.entries[0].stateHistory[0].from, 'unverified');
  assert.equal(normalized.entries[0].stateHistory[0].to, 'corroborated');
});


test('knowledge attributed to another NPC requires a traceable source reference', () => {
  const ledger = createEmptyKnowledgeLedger();
  assert.equal(recordNpcKnowledge(ledger, {
    id: 'untraceable-transfer',
    npcId: 'npc_marta',
    claimRef: 'claim_anna_refusal',
    sourceType: 'interview',
    provenance: 'Marta was told by Anna.',
    sourceNpcId: 'npc_anna'
  }), null);
  const valid = recordNpcKnowledge(ledger, {
    id: 'traceable-transfer',
    npcId: 'npc_marta',
    claimRef: 'claim_anna_refusal',
    sourceType: 'interview',
    provenance: 'Marta was told by Anna during a recorded interview.',
    sourceNpcId: 'npc_anna',
    sourceRefs: ['interview-marta-anna-01']
  });
  assert.ok(valid);
  assert.equal(valid.sourceNpcId, 'npc_anna');
  assert.deepEqual(valid.sourceRefs, ['interview-marta-anna-01']);
});

test('legacy knowledge rejects self-sourced and untraceable cross-NPC entries', () => {
  const normalized = normalizeKnowledgeLedger({ entries: [
    {
      id: 'self-source',
      npcId: 'npc_a',
      claimRef: 'claim_1',
      sourceType: 'direct_observation',
      state: 'unverified',
      provenance: 'Self-sourced legacy claim.',
      sourceNpcId: 'npc_a',
      sourceRefs: ['record-1']
    },
    {
      id: 'untraceable-transfer',
      npcId: 'npc_b',
      claimRef: 'claim_2',
      sourceType: 'interview',
      state: 'unverified',
      provenance: 'Someone said it.',
      sourceNpcId: 'npc_a',
      sourceRefs: []
    },
    {
      id: 'valid-transfer',
      npcId: 'npc_b',
      claimRef: 'claim_3',
      sourceType: 'interview',
      state: 'unverified',
      provenance: 'An attributed interview.',
      sourceNpcId: 'npc_a',
      sourceRefs: ['interview-3']
    }
  ] });
  assert.deepEqual(normalized.entries.map(entry => entry.id), ['valid-transfer']);
});
