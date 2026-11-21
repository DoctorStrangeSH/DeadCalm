import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCampaignDay, advanceCampaignWhenReady, assessFinalEvidence, buildFinalEvidenceDossier, getCampaignCaseSummary } from '../src/js/systems/campaign-progression.js';

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

test('final disclosure dossier requires the authored case materials and a clear film restoration', () => {
  const found = new Map([
    ['autopsy_report_01', {}],
    ['judge_appointment_card', {}],
    ['belladonna_invoice', {}],
    ['matthews_letter', {}],
    ['port_cargo_ledger', {}],
    ['markus_statement', {}],
    ['port_radio_fragment', {}],
    ['restored_film_frame', { quality: 70 }]
  ]);
  const game = {
    hasClue: id => found.has(id),
    getClue: id => found.get(id) || null
  };
  let result = assessFinalEvidence(game);
  assert.equal(result.ready, true);
  assert.equal(result.fullDisclosureReady, false, 'partial film cannot support full public disclosure');
  assert.equal(result.publicReady, result.fullDisclosureReady, 'legacy alias must remain consistent');
  found.set('restored_film_frame', { quality: 100 });
  result = assessFinalEvidence(game);
  assert.equal(result.ready, true);
  assert.equal(result.fullDisclosureReady, true);
  assert.equal(result.publicReady, result.fullDisclosureReady, 'legacy alias must remain consistent');
  found.delete('markus_statement');
  result = assessFinalEvidence(game);
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('Признание Маркуса Холта'));
  found.set('markus_statement', {});
  found.delete('belladonna_invoice');
  result = assessFinalEvidence(game);
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('Счёт за белладонну'));
});


test('case summary reflects an active case before the finale', () => {
  assert.deepEqual(getCampaignCaseSummary({ campaign: { day: 3, completed: false, ending: null } }), {
    completed: false,
    activeCount: 1,
    completedCount: 0,
    endingLabel: null
  });
});

test('case summary reflects either saved finale using a player-facing label', async () => {
  assert.deepEqual(getCampaignCaseSummary({ campaign: { day: 5, completed: true, ending: 'open_case' } }), {
    completed: true,
    activeCount: 0,
    completedCount: 1,
    endingLabel: 'ОТКРЫТОЕ ДЕЛО'
  });
  assert.deepEqual(getCampaignCaseSummary({ campaign: { day: 5, completed: true, ending: 'price_of_silence' } }), {
    completed: true,
    activeCount: 0,
    completedCount: 1,
    endingLabel: 'ЦЕНА МОЛЧАНИЯ'
  });
});


test('final evidence dossier explains both findings and limits without overstating clues', () => {
  const found = new Map([
    ['restored_film_frame', { quality: 100 }],
    ['port_radio_fragment', { quality: 82 }],
    ['court_switchboard_log', {}]
  ]);
  const game = {
    hasClue: id => found.has(id),
    getClue: id => found.get(id) || null
  };
  const dossier = buildFinalEvidenceDossier(game);
  const film = dossier.find(item => item.title === 'Восстановленная плёнка');
  const radio = dossier.find(item => item.title === 'Радиофрагмент');
  const autopsy = dossier.find(item => item.title === 'Причина смерти');
  const poison = dossier.find(item => item.title === 'Источник белладонны');
  const timeline = dossier.find(item => item.title === 'Расхождение во времени');

  assert.match(film.finding, /Себастьян и Каллиопа/);
  assert.match(film.limit, /не показывает момент убийства/);
  assert.match(radio.limit, /Голос не идентифицирован/);
  assert.match(autopsy.limit, /не устанавливает, кто приобрёл яд/);
  assert.match(poison.limit, /Получатель препарата/);
  assert.match(timeline.limit, /не устанавливают личность убийцы/);
  assert.equal(dossier.length, 8);
});

test('partial film is described as unidentified and does not become proof of identity', () => {
  const game = {
    hasClue: id => id === 'restored_film_frame',
    getClue: () => ({ quality: 70 })
  };
  const film = buildFinalEvidenceDossier(game).find(item => item.title === 'Восстановленная плёнка');
  assert.match(film.finding, /две фигуры/);
  assert.match(film.limit, /нельзя считать установленными/);
});
