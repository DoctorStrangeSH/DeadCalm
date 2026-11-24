import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/js/components/notebook-ui.js', import.meta.url), 'utf8');

test('evidence cards navigate by stable clue id rather than potentially duplicate names', () => {
  assert.match(source, /data-clue-id="\$\{escapeHtml\(note\.id \|\| ''\)\}"/);
  assert.match(source, /self\._showClueDetail\(this\.getAttribute\('data-clue-id'\) \|\| title\)/);
});

test('journal controls are scoped to their own container', () => {
  assert.match(source, /this\.container\.querySelector\('#notebook-search-input'\)/);
  assert.match(source, /this\.container\.querySelector\('#btn-export-notes'\)/);
});

test('journal cards safely render incomplete legacy records', () => {
  assert.match(source, /String\(note\.text \|\| ''\)\.substring\(0, 180\)/);
  assert.match(source, /note\.category \|\| 'Общее'/);
  assert.match(source, /note\.title \|\| 'Без названия'/);
});

test('long journal entries use a dedicated responsive detail layout', () => {
  assert.match(source, /class="notebook-note-detail" role="dialog"/);
  assert.match(source, /class="notebook-note-detail-text"/);
  assert.match(source, /class="notebook-note-detail-meta"/);
  const styles = readFileSync(new URL('../src/css/art-direction.css', import.meta.url), 'utf8');
  assert.match(styles, /\.notebook-note-detail-text \{ margin:18px 0 22px;[^}]*white-space:pre-wrap/);
  assert.match(styles, /@media\(max-width:600px\) \{\s*\.notebook-note-detail \{/);
});


test('journal note cards and detail actions use stable ids with legacy fallback', () => {
  assert.match(source, /data-note-id="\$\{escapeHtml\(note\.id\)\}"/);
  assert.match(source, /self\._showNoteDetail\(this\.getAttribute\('data-note-id'\) \|\| title\)/);
  assert.match(source, /n\.id === identifier \|\| \(!n\.id && n\.title === identifier\)/);
  assert.match(source, /Notebook\.togglePin\(note\.id \|\| note\.title\)/);
  assert.match(source, /Notebook\.removeNote\(note\.id \|\| note\.title\)/);
});
