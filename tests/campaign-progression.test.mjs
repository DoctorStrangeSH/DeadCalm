import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCampaignDay, advanceCampaignWhenReady, assessFinalEvidence } from '../src/js/systems/campaign-progression.js';

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
  game.hasClue = id => id === 'port_cargo_ledger_archive';
  assert.equal(assessCampaignDay(game).canAdvance, false, 'archive verification alone does not replace Sebastian’s copy');
});

test('day four accepts either restored film or radio fragment as an independent source', () => {
  const game = state(4, ['anna_markus_items', 'belladonna_invoice', 'port_cargo_ledger_archive', 'port_radio_fragment']);
  assert.equal(assessCampaignDay(game).canAdvance, true);
  const withoutIndependentSource = state(4, ['anna_markus_items', 'belladonna_invoice', 'port_cargo_ledger_archive']);
  assert.equal(assessCampaignDay(withoutIndependentSource).canAdvance, false);
  withoutIndependentSource.hasClue = id => ['anna_markus_items', 'belladonna_invoice', 'port_cargo_ledger_archive', 'restored_film_frame'].includes(id);
  assert.equal(assessCampaignDay(withoutIndependentSource).canAdvance, true);
});

test('day four cannot advance on the suspect copy alone; independent archive comparison is mandatory', () => {
  const suspectCopyOnly = state(4, ['anna_markus_items', 'belladonna_invoice', 'port_cargo_ledger', 'port_radio_fragment']);
  assert.equal(assessCampaignDay(suspectCopyOnly).canAdvance, false);
  assert.ok(assessCampaignDay(suspectCopyOnly).missing.includes('Независимый архивный экземпляр грузовой книги'));

  const verified = state(4, ['anna_markus_items', 'belladonna_invoice', 'port_cargo_ledger', 'port_cargo_ledger_archive', 'port_radio_fragment']);
  assert.equal(assessCampaignDay(verified).canAdvance, true);
});

test('day five is finale-ready and cannot advance to a nonexistent sixth day', () => {
  const game = state(5);
  const status = assessCampaignDay(game);
  assert.equal(status.finaleReady, true);
  assert.equal(status.canAdvance, false);
  assert.equal(advanceCampaignWhenReady(game).advanced, false);
  assert.equal(game.campaign.day, 5);
});

test('final accusation requires independent medical, meeting, poison, archive and scene evidence', () => {
  const found = new Map([
    ['autopsy_report_01', {}],
    ['judge_appointment_card', {}],
    ['belladonna_invoice', {}],
    ['matthews_letter', {}],
    ['port_cargo_ledger', {}],
    ['port_cargo_ledger_archive', {}],
    ['port_radio_fragment', {}],
    ['restored_film_frame', { quality: 70 }]
  ]);
  const game = {
    hasClue: id => found.has(id),
    getClue: id => found.get(id) || null
  };
  let result = assessFinalEvidence(game);
  assert.equal(result.ready, true);
  assert.equal(result.publicReady, false, 'partial film cannot support the full public ending');
  found.set('restored_film_frame', { quality: 100 });
  result = assessFinalEvidence(game);
  assert.equal(result.ready, true);
  assert.equal(result.publicReady, true);
  found.delete('port_cargo_ledger_archive');
  result = assessFinalEvidence(game);
  assert.equal(result.ready, false, 'the suspect copy cannot replace independent archive verification');
  assert.ok(result.missing.includes('Независимый архивный экземпляр портовой книги'));
  found.set('port_cargo_ledger_archive', {});
  found.delete('belladonna_invoice');
  result = assessFinalEvidence(game);
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('Счёт за белладонну'));
});


test('Markus confession is not a substitute for independent final evidence', () => {
  const found = new Set(['markus_statement']);
  const game = { hasClue: id => found.has(id), getClue: () => null };
  const result = assessFinalEvidence(game);
  assert.equal(result.ready, false);
  assert.equal(result.publicReady, false);
  assert.equal(result.missing.length, 7,
    'the confession cannot replace six mandatory records and an independent film/radio source');
  found.add('restored_film_frame');
  const stillIncomplete = assessFinalEvidence(game);
  assert.equal(stillIncomplete.ready, false);
  assert.ok(stillIncomplete.missing.some(item => item.includes('Заключение Лидии')));
});
