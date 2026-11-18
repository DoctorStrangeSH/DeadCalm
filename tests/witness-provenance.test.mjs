import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessIndependentAccounts, canTraceSecretary, canConfrontOrlov, resolveOrlovConfrontation } from '../src/js/systems/witness-provenance.js';
import { findContradictions } from '../src/js/systems/contradictions.js';

const clues = JSON.parse(readFileSync(new URL('../src/data/clues.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/data/contradictions.json', import.meta.url), 'utf8'));

test('secretary source check requires a real saved contradiction', () => {
  const hypothesis = { clueIds: ['court_visitor_log', 'secretary_access_testimony'] };
  const both = [clues.court_visitor_log, clues.secretary_access_testimony];
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [] }, rules), false);
  assert.equal(canTraceSecretary({ clues: both.slice(0, 1), hypotheses: [hypothesis] }, rules), false);
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [hypothesis] }, []), false);
  assert.equal(canTraceSecretary({ clues: both, hypotheses: [hypothesis] }, rules), true);
});

test('dependent accounts sharing one source cannot be counted as corroboration', () => {
  assert.deepEqual(assessIndependentAccounts([
    { id: 'bell', origin: 'bell' },
    { id: 'savelyeva', origin: 'bell' },
    { id: 'pass', origin: 'court-register' }
  ]), { independentSources: 2, dependentAccounts: ['savelyeva'] });
  assert.deepEqual(assessIndependentAccounts([{}, { id: 'unknown' }]),
    { independentSources: 0, dependentAccounts: [] });
  assert.match(clues.secretary_source_statement.description, /Орлов|Белл/);
  assert.match(clues.pass_041_counterfoil.description, /№ 041/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /canTraceSecretary\(GameState\.currentCase, rules\)/);
  assert.match(scene, /GameState\.addClue\(catalog\[clueId\]\)/);
});

test('Orlov has a falsifiable badge discrepancy without conflating two different passes', () => {
  const statement = clues.orlov_evening_statement;
  const scan = clues.orlov_badge_scan;
  const rule = rules.find(item => item.id === 'orlov_departure_vs_badge');
  assert.deepEqual(rule.clueIds, [statement.id, scan.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [statement, scan], rules).map(r => r.id), [rule.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [statement], rules), []);
  assert.match(scan.description, /карточк/);
  assert.match(scan.description, /не исключено/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="orlov-inquiry"[^>]*hasClue\('secretary_source_statement'\) && GameState\.hasClue\('pass_041_counterfoil'\)/);
  assert.match(scene, /function inspectOrlov/);
  assert.match(scene, /'orlov_evening_statement'/);
  assert.match(scene, /'orlov_badge_scan'/);
});

test('Orlov confrontation requires discovered contradiction and both tones preserve evidence', () => {
  const hypothesis = { clueIds: ['orlov_evening_statement', 'orlov_badge_scan'] };
  const evidence = [clues.orlov_evening_statement, clues.orlov_badge_scan];
  assert.equal(canConfrontOrlov({ clues: evidence, hypotheses: [] }, rules), false);
  assert.equal(canConfrontOrlov({ clues: evidence.slice(0, 1), hypotheses: [hypothesis] }, rules), false);
  assert.equal(canConfrontOrlov({ clues: evidence, hypotheses: [hypothesis] }, []), false);
  assert.equal(canConfrontOrlov({ clues: evidence, hypotheses: [hypothesis] }, rules), true);
  assert.ok(resolveOrlovConfrontation('patient').trustDelta > 0);
  assert.ok(resolveOrlovConfrontation('pressure').trustDelta < 0);
  assert.equal(resolveOrlovConfrontation('invalid'), null);
  assert.match(clues.orlov_badge_handover.description, /не удостоверяет/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /canConfrontOrlov\(GameState\.currentCase, rules\)/);
  assert.match(scene, /GameState\.addClue\(catalog\.orlov_badge_handover\)/);
  assert.match(scene, /GameState\.setFlag\('court_orlov_interview_tone', tone\)/);
});

test('N. K. initials yield two candidates and an assignment, not an identified caller', () => {
  const catalog = clues;
  assert.ok(catalog.court_nk_staff_index);
  assert.ok(catalog.reader_service_ticket);
  assert.match(catalog.court_nk_staff_index.description, /Николай Климов/);
  assert.match(catalog.court_nk_staff_index.description, /Надежда Костина/);
  assert.match(catalog.reader_service_ticket.description, /не подтверждает/);
  assert.ok(catalog.orlov_badge_handover.connections_to.includes('reader_service_ticket'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="nk-identity"[^>]*hasClue\('orlov_badge_handover'\)/);
  assert.match(scene, /'court_nk_staff_index'[^;]*'orlov_badge_handover'/s);
  assert.match(scene, /'reader_service_ticket'[^;]*'orlov_badge_handover'/s);
});

test('reader maintenance requires both prior records and does not assert the technician was present', () => {
  assert.match(clues.reader_maintenance_access_log.description, /не доказывает отсутствие Климова/);
  assert.match(clues.reader_service_signoff.description, /не доказывает, кто подписал/);
  assert.match(clues.reader_service_signoff.description, /20:52/);
  assert.ok(clues.reader_service_ticket.connections_to.includes('reader_service_signoff'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-verification"[^>]*hasClue\('court_nk_staff_index'\) && GameState\.hasClue\('reader_service_ticket'\)/);
  assert.match(scene, /function inspectReaderRecord/);
  assert.match(scene, /'reader_maintenance_access_log'/);
  assert.match(scene, /'reader_service_signoff'/);
});
