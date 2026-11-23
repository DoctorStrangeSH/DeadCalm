import test from 'node:test';
import assert from 'node:assert/strict';
import { getCampaignDaySummary, getPendingCampaignDaySummary, dismissCampaignDaySummary } from '../src/js/systems/campaign-day-summary.js';
import { advanceCampaignWhenReady } from '../src/js/systems/campaign-progression.js';

function game(day, clues = [], flags = []) {
  const found = new Set(clues);
  const savedFlags = new Set(flags);
  return {
    campaign: { day, completed: false },
    hasClue: id => found.has(id),
    hasFlag: id => savedFlags.has(id),
    setFlag: (id, value = true) => value ? savedFlags.add(id) : savedFlags.delete(id),
    clearFlag: id => savedFlags.delete(id),
    advanceCampaignDay() { this.campaign.day += 1; return true; }
  };
}

test('days one to three reveal only facts backed by clues actually collected by the player', () => {
  const emptyDay1 = getCampaignDaySummary(1, game(1));
  assert.deepEqual(emptyDay1.established, []);
  assert.deepEqual(emptyDay1.refuted, []);
  assert.equal(emptyDay1.missingEvidence.length, 3);

  const day1 = getCampaignDaySummary(1, game(1, [
    'autopsy_report_01', 'court_switchboard_log'
  ]));
  assert.ok(day1.established.some(item => item.includes('белладонной')));
  assert.ok(day1.established.some(item => item.includes('не называет')));
  assert.ok(day1.refuted.some(item => item.includes('не устанавливает личность')));
  assert.ok(day1.unknown.some(item => item.includes('внутренним номером 17')));
  assert.ok(!day1.established.some(item => item.includes('встреча на 19:30')));

  const day2 = getCampaignDaySummary(2, game(2, ['matthews_letter']));
  assert.ok(day2.established.some(item => item.includes('ложное алиби')));
  assert.ok(day2.refuted.some(item => item.includes('не доказывает')));
  assert.ok(!day2.established.some(item => item.includes('Марта получила')));

  const day3 = getCampaignDaySummary(3, game(3, ['port_cargo_ledger']));
  assert.ok(day3.established.some(item => item.includes('копию грузовой книги')));
  assert.ok(day3.refuted.some(item => item.includes('не является доказательством убийства')));
});

test('day four summary adapts to film and radio evidence without describing absent material', () => {
  const film = getCampaignDaySummary(4, game(5, ['anna_markus_items', 'belladonna_invoice', 'restored_film_frame', 'port_cargo_ledger_archive']));
  assert.ok(film.established.some(item => item.includes('опровергает часть его алиби')));
  assert.ok(film.refuted.some(item => item.includes('не показывает момент убийства')));
  assert.ok(!film.refuted.some(item => item.includes('Радиозапись')));

  const radio = getCampaignDaySummary(4, game(5, ['anna_markus_items', 'belladonna_invoice', 'port_radio_fragment', 'port_cargo_ledger_archive']));
  assert.ok(radio.established.some(item => item.includes('временное окно')));
  assert.ok(radio.refuted.some(item => item.includes('Радиозапись')));
  assert.ok(!radio.refuted.some(item => item.includes('Кадр плёнки')));

  const noArchive = getCampaignDaySummary(4, game(5, ['anna_markus_items', 'belladonna_invoice', 'restored_film_frame']));
  assert.ok(noArchive.unknown.some(item => item.includes('не сверена')));
  assert.ok(!noArchive.established.some(item => item.includes('независимо подтверждает')));
  const both = getCampaignDaySummary(4, game(5, ['anna_markus_items', 'belladonna_invoice', 'restored_film_frame', 'port_radio_fragment', 'port_cargo_ledger_archive']));
  assert.ok(both.established.some(item => item.includes('кадр')));
  assert.ok(both.established.some(item => item.includes('радиосвязи')));
});

test('campaign advancement queues a persistent summary for the day that just ended', () => {
  const state = game(1, ['autopsy_report_01', 'court_switchboard_log', 'judge_appointment_card', 'old_case_details']);
  const result = advanceCampaignWhenReady(state);
  assert.equal(result.advanced, true);
  assert.equal(state.campaign.day, 2);
  assert.equal(state.hasFlag('campaign_day_summary_pending_1'), true);
  assert.equal(getPendingCampaignDaySummary(state).day, 1);
});

test('pending daily summary survives navigation and is dismissed exactly once', () => {
  const state = game(2, [], ['campaign_day_summary_pending_1']);
  assert.equal(getPendingCampaignDaySummary(state).day, 1);
  assert.equal(dismissCampaignDaySummary(state, 1), true);
  assert.equal(getPendingCampaignDaySummary(state), null);
  assert.equal(dismissCampaignDaySummary(state, 1), false);
});

test('multiple pending summaries are delivered in order instead of being lost after later day transitions', () => {
  const state = game(4, [], ['campaign_day_summary_pending_1', 'campaign_day_summary_pending_2']);
  assert.equal(getPendingCampaignDaySummary(state).day, 1);
  assert.equal(dismissCampaignDaySummary(state, 1), true);
  assert.equal(getPendingCampaignDaySummary(state).day, 2);
});

test('day five wrap-up distinguishes both endings and preserves unresolved details', () => {
  const open = getCampaignDaySummary(5, game(5), 'open_case');
  const silence = getCampaignDaySummary(5, game(5), 'price_of_silence');
  assert.ok(open.title.includes('Открытое дело'));
  assert.ok(silence.title.includes('Цена молчания'));
  assert.ok(open.established.some(item => item.includes('Маркус признал')));
  assert.ok(silence.unknown.some(item => item.includes('закрытой')));
  assert.ok(silence.established.some(item => item.includes('не признал причастности')));
  assert.ok(!silence.established.some(item => item.includes('Себастьян признал встречу')));
  assert.ok(open.refuted.some(item => item.includes('не подтверждает')));
});
