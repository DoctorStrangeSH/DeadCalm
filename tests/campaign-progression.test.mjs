import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCampaignDay, advanceCampaignWhenReady } from '../src/js/systems/campaign-progression.js';

function state(day, clues = []) {
  const found = new Set(clues);
  return {
    campaign: { day, completed: false },
    hasClue: id => found.has(id),
    advanceCampaignDay() { this.campaign.day++; return true; }
  };
}

test('day one requires medical finding, court call record and old case link', () => {
  const game = state(1);
  assert.equal(assessCampaignDay(game).canAdvance, false);
  game.hasClue = id => ['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details'].includes(id);
  assert.equal(assessCampaignDay(game).canAdvance, true);
  assert.equal(advanceCampaignWhenReady(game).advanced, true);
  assert.equal(game.campaign.day, 2);
});

test('day two requires both journalist source and Matthews letter', () => {
  const game = state(2, ['marta_source_envelope']);
  assert.equal(assessCampaignDay(game).canAdvance, false);
  game.hasClue = id => ['marta_source_envelope', 'matthews_letter'].includes(id);
  assert.equal(assessCampaignDay(game).canAdvance, true);
});

test('day three requires a port ledger source, not only a conversation', () => {
  const game = state(3);
  assert.equal(assessCampaignDay(game).canAdvance, false);
  game.hasClue = id => id === 'port_cargo_ledger';
  assert.equal(assessCampaignDay(game).canAdvance, true);
});

test('day four accepts either restored film or radio fragment as an independent source', () => {
  const game = state(4, ['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment']);
  assert.equal(assessCampaignDay(game).canAdvance, true);
  const withoutIndependentSource = state(4, ['anna_markus_items', 'belladonna_invoice']);
  assert.equal(assessCampaignDay(withoutIndependentSource).canAdvance, false);
  withoutIndependentSource.hasClue = id => ['anna_markus_items', 'belladonna_invoice', 'restored_film_frame'].includes(id);
  assert.equal(assessCampaignDay(withoutIndependentSource).canAdvance, true);
});

test('day five is finale-ready and cannot advance to a nonexistent sixth day', () => {
  const game = state(5);
  const status = assessCampaignDay(game);
  assert.equal(status.finaleReady, true);
  assert.equal(status.canAdvance, false);
  assert.equal(advanceCampaignWhenReady(game).advanced, false);
  assert.equal(game.campaign.day, 5);
});
