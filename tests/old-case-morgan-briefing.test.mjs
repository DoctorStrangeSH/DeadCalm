import test from 'node:test';
import assert from 'node:assert/strict';
import { planMorganBriefing, recordMorganBriefing } from '../src/js/systems/old-case-morgan-briefing.js';

const evidence = new Set(['old_case_port_visitor_log', 'old_case_port_waybill']);
const has = id => evidence.has(id);
const reading = { correct: true, choice: 'unmatched_trip' };
const careful = { approachId: 'careful_request' };
const accused = { approachId: 'unsupported_accusation' };

test('новый разговор невозможен до обоих документов и осторожного вывода', () => {
  assert.equal(planMorganBriefing(() => false, reading, careful), null);
  assert.equal(planMorganBriefing(has, { choice: 'unmatched_trip' }, careful), null);
  assert.equal(planMorganBriefing(has, reading, null), null);
  assert.ok(planMorganBriefing(has, reading, careful));
});

test('Морган помнит прежнее обвинение и текущее доверие', () => {
  const plan = planMorganBriefing(has, reading, careful);
  const trusted = recordMorganBriefing('share_limits', plan, careful, 2);
  const strained = recordMorganBriefing('share_limits', plan, accused, 2);
  const distrustful = recordMorganBriefing('share_limits', plan, careful, -2);
  assert.notEqual(trusted.response, strained.response);
  assert.equal(strained.response, distrustful.response);
  assert.equal(trusted.trustDelta, 1);
  assert.equal(recordMorganBriefing('press_for_name', plan, accused, -3).trustDelta, -1);
  assert.match(trusted.nextStep, /пропусков/);
});

test('повторный выбор не меняет уже принятого решения', () => {
  const plan = planMorganBriefing(has, reading, careful);
  const saved = recordMorganBriefing('share_limits', plan, careful, 0);
  assert.equal(recordMorganBriefing('press_for_name', plan, careful, 0, saved), null);
  assert.equal(recordMorganBriefing('share_limits', planMorganBriefing(has, reading, careful, saved), careful, 0), null);
  assert.equal(recordMorganBriefing('unknown', plan, careful, 0), null);
});
