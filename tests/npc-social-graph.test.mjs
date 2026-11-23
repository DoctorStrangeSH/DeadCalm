import test from 'node:test';
import assert from 'node:assert/strict';
import { appendSocialEvent, createEmptySocialGraph, getSocialContext, getSocialTies, normalizeSocialGraph, upsertSocialTie } from '../src/js/systems/npc-social-graph.js';

test('new and legacy saves normalize to an empty social graph', () => {
  assert.deepEqual(createEmptySocialGraph(), { ties: [], events: [] });
  assert.deepEqual(normalizeSocialGraph(undefined), { ties: [], events: [] });
  assert.deepEqual(normalizeSocialGraph({ oldField: true }), { ties: [], events: [] });
});
test('a grounded tie is stored once and updated without duplicates', () => {
  const graph = createEmptySocialGraph();
  const first = upsertSocialTie(graph, { fromNpcId:'npc_a',toNpcId:'npc_b',type:'colleague',status:'strained',basis:'They worked the same night shift.',sourceRefs:['shift-record','shift-record'],updatedAt:'2026-11-20T10:00:00Z' });
  const update = upsertSocialTie(graph, { fromNpcId:'npc_a',toNpcId:'npc_b',type:'colleague',status:'active',basis:'A later record shows they reconciled.',sourceRefs:['staff-note'],updatedAt:'2026-11-21T10:00:00Z' });
  assert.equal(first.id, update.id); assert.equal(graph.ties.length, 1);
  assert.equal(graph.ties[0].status, 'active'); assert.deepEqual(graph.ties[0].sourceRefs, ['staff-note']);
});
test('unfounded, self-referential, and invalid ties are rejected', () => {
  const graph = createEmptySocialGraph();
  assert.equal(upsertSocialTie(graph,{fromNpcId:'npc_a',toNpcId:'npc_b',type:'rival',status:'active'}),null);
  assert.equal(upsertSocialTie(graph,{fromNpcId:'npc_a',toNpcId:'npc_a',type:'friend',status:'active',basis:'x'}),null);
  assert.equal(upsertSocialTie(graph,{fromNpcId:'npc_a',toNpcId:'npc_b',type:'invented',status:'active',basis:'x'}),null);
  assert.equal(graph.ties.length,0);
});
test('events retain provenance and do not silently mutate tie status', () => {
  const graph=createEmptySocialGraph();
  upsertSocialTie(graph,{fromNpcId:'npc_a',toNpcId:'npc_b',type:'rival',status:'uncertain',basis:'An unverified allegation.',sourceRefs:['rumour-1']});
  const event=appendSocialEvent(graph,{fromNpcId:'npc_a',toNpcId:'npc_b',description:'They argued outside the archive.',sourceRefs:['guard-statement']});
  assert.ok(event);
  assert.equal(appendSocialEvent(graph,{id:event.id,fromNpcId:'npc_a',toNpcId:'npc_b',description:'Duplicate'}),null);
  assert.equal(graph.ties[0].status,'uncertain');
  assert.deepEqual(getSocialContext(graph,'npc_a').events[0].sourceRefs,['guard-statement']);
});
test('queries return detached copies and isolate NPC context', () => {
  const graph=createEmptySocialGraph();
  upsertSocialTie(graph,{fromNpcId:'npc_a',toNpcId:'npc_b',type:'protective',status:'strained',basis:'A documented intervention.',sourceRefs:['incident-2']});
  upsertSocialTie(graph,{fromNpcId:'npc_c',toNpcId:'npc_b',type:'debt',status:'broken',basis:'A signed debt record.',sourceRefs:['ledger-8']});
  const ties=getSocialTies(graph,'npc_a'); ties[0].status='broken';
  assert.equal(graph.ties[0].status,'strained');
  const context=getSocialContext(graph,'npc_b');
  assert.equal(context.connectionCount,2); assert.equal(context.strainedConnections,1); assert.equal(context.brokenConnections,1);
});

test('legacy and malformed save records are safely filtered during migration', () => {
  const normalized = normalizeSocialGraph({
    ties: [
      { id: 'valid', fromNpcId: 'npc_a', toNpcId: 'npc_b', type: 'colleague', status: 'active', basis: 'A signed staff record.' },
      { id: 'blank-basis', fromNpcId: 'npc_a', toNpcId: 'npc_c', type: 'friend', status: 'active', basis: '   ' },
      { id: 'self-link', fromNpcId: 'npc_a', toNpcId: 'npc_a', type: 'family', status: 'active', basis: 'A record.' }
    ],
    events: [
      { id: 'valid-event', fromNpcId: 'npc_a', toNpcId: 'npc_b', description: 'A documented meeting.' },
      { id: 'blank-event', fromNpcId: 'npc_a', toNpcId: 'npc_b', description: '   ' }
    ]
  });
  assert.deepEqual(normalized.ties.map(tie => tie.id), ['valid']);
  assert.deepEqual(normalized.events.map(event => event.id), ['valid-event']);
  assert.deepEqual(normalized.ties[0].sourceRefs, []);
  assert.deepEqual(normalized.events[0].sourceRefs, []);
});

test('the same undirected relationship cannot be duplicated by reversing its endpoints', () => {
  const graph = createEmptySocialGraph();
  const first = upsertSocialTie(graph, {
    fromNpcId: 'npc_a', toNpcId: 'npc_b', type: 'family',
    status: 'active', basis: 'They identify each other as siblings.'
  });
  const reversed = upsertSocialTie(graph, {
    fromNpcId: 'npc_b', toNpcId: 'npc_a', type: 'family',
    status: 'strained', basis: 'A later account records distance between them.'
  });
  assert.equal(graph.ties.length, 1);
  assert.equal(reversed.id, first.id);
  assert.equal(graph.ties[0].fromNpcId, 'npc_b');
  assert.equal(graph.ties[0].toNpcId, 'npc_a');
  assert.equal(graph.ties[0].status, 'strained');
});
