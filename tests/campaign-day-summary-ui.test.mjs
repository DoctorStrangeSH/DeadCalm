import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const office = readFileSync(new URL('../src/js/scenes/office.js', import.meta.url), 'utf8');
const summary = readFileSync(new URL('../src/js/systems/campaign-day-summary.js', import.meta.url), 'utf8');

test('detective office renders a pending daily recap on entry and after restoring a save', () => {
  assert.match(office, /getPendingCampaignDaySummary, dismissCampaignDaySummary/);
  assert.match(office, /renderPendingDaySummary\(container\)/);
  assert.match(office, /^  renderPendingDaySummary\(container\);$/m);
  assert.match(office, /dataset\.campaignDaySummary/);
  assert.match(office, /aria-modal/);
});

test('daily recap presents established, refuted, unknown and missing evidence separately', () => {
  assert.match(office, /УСТАНОВЛЕНО/);
  assert.match(office, /ОПРОВЕРГНУТО \/ ОГРАНИЧЕНИЯ/);
  assert.match(office, /ПОКА НЕИЗВЕСТНО/);
  assert.match(office, /ЕЩЁ НЕ ПОЛУЧЕНЫ/);
  assert.match(office, /textContent = '— ' \+ item/);
});

test('recap is dismissed only after storage confirms the flag was cleared', () => {
  assert.match(office, /if \(!dismissCampaignDaySummary\(GameState, summary\.day\)\)/);
  assert.match(office, /overlay\.remove\(\)/);
  assert.match(summary, /return gameState\.clearFlag\(flag\) !== false/);
});
