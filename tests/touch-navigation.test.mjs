import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldNavigateBackFromTouch } from '../src/js/systems/touch-navigation.js';

function targetFor(selector = '') {
  return {
    closest(query) {
      return selector && query.includes(selector) ? this : null;
    }
  };
}

test('right swipe on a passive scene area returns to the office', () => {
  assert.equal(shouldNavigateBackFromTouch({
    startTarget: targetFor(),
    distance: 140,
    currentScene: 'film-restoration'
  }), true);
});

test('short swipes and the main menu never trigger back navigation', () => {
  assert.equal(shouldNavigateBackFromTouch({ startTarget: targetFor(), distance: 100, currentScene: 'office' }), false);
  assert.equal(shouldNavigateBackFromTouch({ startTarget: targetFor(), distance: 160, currentScene: 'main-menu' }), false);
});

test('swipes beginning on radio and film controls remain owned by the controls', () => {
  for (const selector of ['.radio-range', '.film-range', 'button', 'input', 'select']) {
    assert.equal(shouldNavigateBackFromTouch({
      startTarget: targetFor(selector),
      distance: 220,
      currentScene: 'radio-tuning'
    }), false, selector + ' must not trigger scene navigation');
  }
});

test('links, map pins and explicitly protected horizontal surfaces do not navigate back', () => {
  for (const selector of ['a', '.map-location', '[data-no-swipe-back]', '[data-horizontal-scroll]']) {
    assert.equal(shouldNavigateBackFromTouch({
      startTarget: targetFor(selector),
      distance: 180,
      currentScene: 'city-map'
    }), false, selector + ' must keep the gesture');
  }
});
