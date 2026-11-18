import test from 'node:test';
import assert from 'node:assert/strict';
import { findContradictions } from '../src/js/systems/contradictions.js';

const rules = [{ id: 'timeline_conflict', clueIds: ['a', 'b'],
  summary: 'Факты требуют сверки времени', followUp: 'Перепроверьте показания.' }];
const discovered = [{ id: 'a' }, { id: 'b' }];

test('contradiction is shown only when both authored facts were discovered and attached', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, rules), [{
    ...rules[0], clueIds: ['a', 'b']
  }]);
  assert.deepEqual(findContradictions({ clueIds: ['a'] }, discovered, rules), []);
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered.slice(0, 1), rules), []);
});

test('empty and malformed rules cannot manufacture contradictions or leak undiscovered content', () => {
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, []), []);
  const malformed = [{ id: 'broken', clueIds: ['a'], summary: 'Fake' },
    { id: 'missing', clueIds: ['a', 'secret'], summary: 'Spoiler' },
    { id: 'blank', clueIds: ['a', 'b'], summary: '' }];
  assert.deepEqual(findContradictions({ clueIds: ['a', 'b'] }, discovered, malformed), []);
  assert.equal(findContradictions({ clueIds: ['a', 'b'] }, discovered, [rules[0], rules[0]]).length, 1);
});
