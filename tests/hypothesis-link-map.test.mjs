import test from 'node:test';
import assert from 'node:assert/strict';
import { getHypothesisLinkMap } from '../src/js/systems/hypothesis-link-map.js';

const clues = ['a', 'b', 'c', 'd'].map(id => ({ id }));
const found = [{ clue1: 'a', clue2: 'b' }, { clue1: 'b', clue2: 'c' }, { clue1: 'c', clue2: 'd' }];

test('only found links between attached accessible clues count as a theory chain', () => {
  const map = getHypothesisLinkMap(['a', 'b', 'd', 'hidden'], clues, found);
  assert.deepEqual(map.ids, ['a', 'b', 'd']);
  assert.deepEqual(map.links, [{ clue1: 'a', clue2: 'b' }]);
  assert.deepEqual(map.isolated, ['d']);
  assert.deepEqual(map.groups, [['a', 'b'], ['d']]);
  assert.equal(map.missing, 1);
});

test('catalog knowledge and undiscovered links never count as opened connections', () => {
  const map = getHypothesisLinkMap(['a', 'b', 'a'], clues, []);
  assert.deepEqual(map.links, []);
  assert.deepEqual(map.groups, [['a'], ['b']]);
  assert.deepEqual(map.isolated, ['a', 'b']);
  assert.equal(map.missing, 0);
});

test('visible connection chains are reversible read-only summaries', () => {
  const original = structuredClone(found);
  const map = getHypothesisLinkMap(['a', 'b', 'c', 'd'], clues, found);
  assert.equal(map.links.length, 3);
  assert.equal(map.groups.length, 1);
  assert.deepEqual(map.isolated, []);
  assert.deepEqual(found, original);
});
