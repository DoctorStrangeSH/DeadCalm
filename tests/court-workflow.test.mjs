import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COURT_STAGE_IDS, summarizeCourtStages } from '../src/js/systems/court-workflow.js';

test('court workflow separates actionable, completed and locked phases', () => {
  const states = [
    { unlocked: true, completed: false },
    { unlocked: true, completed: true },
    { unlocked: false, completed: false },
    { unlocked: false, completed: true }
  ];
  assert.deepEqual(summarizeCourtStages(states), { actionable: 1, completed: 1, locked: 2 });
  assert.equal(COURT_STAGE_IDS.length, 7);
  assert.equal(new Set(COURT_STAGE_IDS).size, COURT_STAGE_IDS.length);
});

test('court UI exposes completed phases on demand without bypassing story locks', () => {
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  const flow = readFileSync(new URL('../src/js/systems/court-workflow.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');
  for (const id of COURT_STAGE_IDS) assert.ok(scene.includes(`id="${id}"`));
  assert.ok(scene.includes('setupCourtWorkflow(container)'));
  assert.ok(scene.includes('refreshCourtWorkflow();'));
  assert.ok(scene.includes('id="court-show-completed"'));
  assert.ok(flow.includes('!node.hidden'), 'story-locked panels must not be counted as available');
  assert.ok(flow.includes('buttons.every(button => button.disabled)'), 'finished tasks must be detected from recorded results');
  assert.ok(css.includes('[hidden] { display:none !important; }'), 'locked panels must stay hidden');
  assert.ok(css.includes('.court-workflow-stages:not(.court-show-completed) .court-stage-complete'));
});
