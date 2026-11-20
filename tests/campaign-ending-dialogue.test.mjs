import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dialogues = JSON.parse(readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8'));
const sebastian = dialogues.npc_sebastian_blackwood;

test('each campaign ending has one persistent, acknowledgeable return reaction for Sebastian', () => {
  const expected = [
    ['case_001_open_case', 'case_001_open_case_result', 'case_001_open_case_seen'],
    ['case_001_price_of_silence', 'case_001_price_silence_result', 'case_001_price_silence_seen']
  ];
  for (const [requiresFlag, nodeId, seenFlag] of expected) {
    const reaction = sebastian.return_dialogues.find(item => item.requires_flag === requiresFlag);
    assert.ok(reaction, 'missing ending reaction for ' + requiresFlag);
    assert.equal(reaction.node, nodeId);
    assert.equal(reaction.seen_flag, seenFlag);
    assert.ok(sebastian[nodeId]?.text, 'missing authored response node ' + nodeId);
    assert.equal(sebastian[nodeId].end, true);
  }
});

test('ending return reactions do not reuse the pre-ending critical-choice responses', () => {
  const nodes = new Set(sebastian.return_dialogues.map(item => item.node));
  assert.ok(nodes.has('case_001_open_case_result'));
  assert.ok(nodes.has('case_001_price_silence_result'));
  assert.notEqual('case_001_open_case_result', 'sebastian_accused_return');
  assert.notEqual('case_001_price_silence_result', 'sebastian_process_return');
});
