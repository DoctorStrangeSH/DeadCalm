const INTERACTIVE_TOUCH_TARGETS = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[role="button"]',
  '[contenteditable="true"]',
  '.radio-range',
  '.film-range',
  '.map-location',
  '[data-no-swipe-back]',
  '[data-horizontal-scroll]'
].join(', ');

/**
 * Decide whether a rightward touch gesture should navigate back to the office.
 * Gestures that begin on controls or horizontally interactive surfaces must
 * remain owned by that control instead of triggering scene navigation.
 */
export function shouldNavigateBackFromTouch({ startTarget, distance, currentScene }) {
  if (!Number.isFinite(distance) || distance <= 100) return false;
  if (!currentScene || currentScene === 'main-menu') return false;

  if (startTarget && typeof startTarget.closest === 'function') {
    if (startTarget.closest(INTERACTIVE_TOUCH_TARGETS)) return false;
  }

  return true;
}
