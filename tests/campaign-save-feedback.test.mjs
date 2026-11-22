import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const office = readFileSync(new URL('../src/js/scenes/office.js', import.meta.url), 'utf8');

test('office explains a failed day save instead of silently leaving the advance button inert', () => {
  assert.match(office, /const result = advanceCampaignWhenReady\(GameState\)/);
  assert.match(office, /if \(result\.advanced\) \{/);
  assert.match(office, /if \(result\.status\?\.canAdvance\) \{/);
  assert.match(office, /data-campaign-save-error/);
  assert.match(office, /setAttribute\('role', 'alert'\)/);
  assert.match(office, /setAttribute\('aria-live', 'assertive'\)/);
  assert.match(office, /Прогресс не изменён/);
});
