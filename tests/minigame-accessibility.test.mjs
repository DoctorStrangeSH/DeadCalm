import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const repair = readFileSync(new URL('../src/js/scenes/mechanical-repair.js', import.meta.url), 'utf8');
const radio = readFileSync(new URL('../src/js/scenes/radio-tuning.js', import.meta.url), 'utf8');
const film = readFileSync(new URL('../src/js/scenes/film-restoration.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/css/main.css', import.meta.url), 'utf8');

test('mechanical repair restores keyboard focus to the next available action after rerender', () => {
  assert.match(repair, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(repair, /paint\(feedback\);\s*container\.querySelector\('\[data-action\]'\)\?\.focus\(\);/);
});

test('radio tuning exposes changing frequency and filter values to assistive technology', () => {
  assert.match(radio, /aria-valuetext="\$\{session\.frequency\.toFixed\(1\)\} мегагерц"/);
  assert.match(radio, /aria-valuetext="\$\{session\.filter\} процентов"/);
  assert.match(radio, /frequency\.setAttribute\('aria-valuetext', session\.frequency\.toFixed\(1\) \+ ' мегагерц'\)/);
  assert.match(radio, /filter\.setAttribute\('aria-valuetext', session\.filter \+ ' процентов'\)/);
  assert.match(radio, /id="radio-feedback" role="status" aria-live="polite" aria-atomic="true"/);
});

test('film restoration exposes changing transport and tool values to assistive technology', () => {
  assert.match(film, /tension\.setAttribute\('aria-valuetext', session\.tension \+ ' процентов'\)/);
  assert.match(film, /speed\.setAttribute\('aria-valuetext', session\.speed \+ ' раза'\)/);
  assert.match(film, /tool\.setAttribute\('aria-valuetext', String\(value\)\)/);
  assert.match(film, /id="film-feedback" role="status" aria-live="polite" aria-atomic="true"/);
});

test('radio and film range controls provide larger touch targets and visible keyboard focus', () => {
  assert.match(styles, /\.radio-range,\s*\.film-range \{\s*min-height: 44px;/);
  assert.match(styles, /\.radio-range::-webkit-slider-thumb,\s*\.film-range::-webkit-slider-thumb \{\s*width: 28px;\s*height: 28px;/);
  assert.match(styles, /\.radio-range::-moz-range-thumb,\s*\.film-range::-moz-range-thumb \{\s*width: 28px;\s*height: 28px;/);
  assert.match(styles, /\.radio-range:focus-visible/);
  assert.match(styles, /\.film-range:focus-visible/);
});
