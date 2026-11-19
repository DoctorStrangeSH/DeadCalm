import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessOldCaseFollowUp, recordOldCaseFollowUp, OLD_CASE_FOLLOW_UPS } from '../src/js/systems/old-case-follow-up.js';

test('a valid prior action is necessary for either route', () => {
  assert.equal(assessOldCaseFollowUp(null, () => true), null);
  assert.equal(assessOldCaseFollowUp({ actionId: 'request_specialist', status: 'Установлен' }, () => true), null);
  assert.equal(assessOldCaseFollowUp({ actionId: 'accuse', status: 'Подписант не установлен' }, () => true), null);
});

test('specialist route provides only its own report', () => {
  const action = { actionId: 'request_specialist', status: 'Подписант не установлен' };
  const absent = assessOldCaseFollowUp(action, () => false);
  assert.equal(absent.clueId, 'old_case_specialist_memo');
  assert.equal(absent.found, false);
  assert.equal(recordOldCaseFollowUp(absent), null);
  const complete = assessOldCaseFollowUp(action, id => id === 'old_case_specialist_memo');
  assert.equal(complete.found, true);
  assert.match(complete.conclusion, /недостаточно/);
});

test('custody route provides a different source but rejoins at a neutral next step', () => {
  const specialist = assessOldCaseFollowUp({ actionId: 'request_specialist', status: 'Подписант не установлен' }, () => true);
  const custody = assessOldCaseFollowUp({ actionId: 'formal_inquiry', status: 'Подписант не установлен' }, () => true);
  assert.equal(custody.clueId, 'old_case_custody_extract');
  assert.notEqual(custody.conclusion, specialist.conclusion);
  assert.equal(custody.commonLimit, specialist.commonLimit);
  for (const route of [specialist, custody]) {
    const saved = recordOldCaseFollowUp(route);
    assert.equal(saved.sourceId, route.clueId);
    assert.match(saved.nextStep, /Подписант остаётся неизвестен/);
    assert.equal(recordOldCaseFollowUp(route, saved), null);
  }
  assert.equal(recordOldCaseFollowUp({ found: true, clueId: 'forged' }), null);
});

test('source catalog and precinct UI support the chosen route without awarding both', () => {
  const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
  const scene = readFileSync(new URL('../src/js/scenes/police-station.js', import.meta.url), 'utf8');
  const cache = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const route of Object.values(OLD_CASE_FOLLOW_UPS)) assert.ok(clues[route.clueId]?.source);
  assert.match(scene, /followUp\?\.clueId !== clueId/);
  assert.match(scene, /GameState\.setFlag\('court_old_case_follow_up', result\)/);
  assert.match(cache, /old-case-follow-up\.js/);
});
