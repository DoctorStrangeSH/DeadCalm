import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planMorganRevisit, recordMorganRevisit } from '../src/js/systems/old-case-morgan-revisit.js';

test('revisit requires recorded earlier meeting and cannot repeat', () => {
  assert.equal(planMorganRevisit(null), null);
  assert.equal(planMorganRevisit({ approachId: 'unknown', sourceId: 'old_case_custody_extract' }), null);
  assert.equal(planMorganRevisit({ approachId: 'careful_request', sourceId: 'invented' }), null);
  const approach = { approachId: 'careful_request', sourceId: 'old_case_custody_extract' };
  assert.equal(planMorganRevisit(approach, { route: 'voluntary_assistance' }), null);
});

test('careful request and accusation produce different routes to same document', () => {
  const a = planMorganRevisit({ approachId: 'careful_request', sourceId: 'old_case_specialist_memo' });
  const b = planMorganRevisit({ approachId: 'unsupported_accusation', sourceId: 'old_case_specialist_memo' });
  assert.equal(a.clueId, 'old_case_transfer_card');
  assert.equal(b.clueId, a.clueId);
  assert.notEqual(a.route, b.route);
  assert.notEqual(a.response, b.response);
  assert.match(a.limit, /не личность/);
});

test('revisit is only recorded after actual discovery', () => {
  const plan = planMorganRevisit({ approachId: 'unsupported_accusation', sourceId: 'old_case_custody_extract' });
  assert.equal(recordMorganRevisit(plan, () => false), null);
  const stored = recordMorganRevisit(plan, id => id === 'old_case_transfer_card');
  assert.equal(stored.route, 'formal_registry');
  assert.equal(recordMorganRevisit(plan, () => true, stored), null);
  assert.equal(recordMorganRevisit({ ...plan, clueId: 'fake' }, () => true), null);
});

test('precinct persists revisit and offers same archival clue through either path', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(catalog.old_case_transfer_card.source);
  assert.match(scene, /id="precinct-morgan-revisit"/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_morgan_revisit', saved\)/);
  assert.match(cache, /old-case-morgan-revisit\.js/);
});
