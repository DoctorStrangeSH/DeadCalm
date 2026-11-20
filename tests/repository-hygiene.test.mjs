import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test('all production JavaScript files pass Node syntax validation', () => {
  const files = [...walk(resolve(root, 'src/js')).filter(path => path.endsWith('.js')), resolve(root, 'sw.js')];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `Syntax error in ${file}:\n${result.stderr || result.stdout}`);
  }
});

test('all local static JavaScript imports resolve to existing files', () => {
  const files = walk(resolve(root, 'src/js')).filter(path => path.endsWith('.js'));
  const importPattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      const target = resolve(dirname(file), specifier);
      const candidates = extname(target) ? [target] : [target, target + '.js', target + '.json'];
      assert.ok(candidates.some(existsSync), `Broken import in ${file}: ${specifier}`);
    }
  }
});

test('all tracked application JSON data and the PWA manifest are valid JSON', () => {
  const files = [...walk(resolve(root, 'src/data')).filter(path => path.endsWith('.json')), resolve(root, 'manifest.json')];
  for (const file of files) {
    assert.doesNotThrow(() => JSON.parse(readFileSync(file, 'utf8')), `Invalid JSON: ${file}`);
  }
});
