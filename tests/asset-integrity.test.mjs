import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';

const root = process.cwd();

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test('local HTML entrypoint resources exist', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)\\s*=\\s*["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (/^(https?:|data:|#|mailto:)/i.test(value)) continue;
    const path = value.split(/[?#]/)[0].replace(/^\\//, '');
    assert.ok(existsSync(resolve(root, path)), `Missing local HTML resource: ${value}`);
  }
});

test('local CSS url() resources exist', () => {
  const stylesheets = walk(resolve(root, 'src/css')).filter(path => path.endsWith('.css'));
  for (const stylesheet of stylesheets) {
    const source = readFileSync(stylesheet, 'utf8');
    for (const match of source.matchAll(/url\\(\\s*["']?([^"')]+)["']?\\s*\\)/gi)) {
      const value = match[1].trim();
      if (/^(https?:|data:|#)/i.test(value)) continue;
      const path = value.split(/[?#]/)[0];
      assert.ok(existsSync(resolve(dirname(stylesheet), path)), `Missing CSS resource in ${stylesheet}: ${value}`);
    }
  }
});

test('authored scene backgrounds and dialogue portrait variants exist', () => {
  const scenes = walk(resolve(root, 'src/js/scenes')).filter(path => path.endsWith('.js'));
  for (const scene of scenes) {
    const source = readFileSync(scene, 'utf8');
    for (const match of source.matchAll(/background\\s*:\\s*["']([^"']+\\.webp)["']/g)) {
      assert.ok(existsSync(resolve(root, 'src/assets/backgrounds', match[1])), `Missing scene background in ${scene}: ${match[1]}`);
    }
  }
  const dialogue = readFileSync(resolve(root, 'src/js/components/dialog-box.js'), 'utf8');
  for (const match of dialogue.matchAll(/["']([^"']+\\.webp)["']/g)) {
    assert.ok(existsSync(resolve(root, 'src/assets/portraits', match[1])), `Missing dialogue portrait: ${match[1]}`);
  }
});
