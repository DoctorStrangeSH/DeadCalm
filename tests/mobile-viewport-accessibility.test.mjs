import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('mobile viewport preserves pinch zoom for accessibility', () => {
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i)?.[1];
  assert.ok(viewport, 'viewport metadata must be present');
  assert.match(viewport, /width=device-width/);
  assert.match(viewport, /initial-scale=1(?:\.0)?/);
  assert.match(viewport, /viewport-fit=cover/);
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(viewport, /maximum-scale\s*=\s*1(?:\.0)?/i);
});
