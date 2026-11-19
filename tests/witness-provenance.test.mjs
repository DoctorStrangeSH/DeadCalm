import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessIndependentAccounts, canTraceSecretary, canConfrontOrlov, resolveOrlovConfrontation, canConfrontKlimov, resolveKlimovConfrontation } from '../src/js/systems/witness-provenance.js';
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

test('Klimov and Kostina interviews unlock after independent maintenance records', () => {
  assert.match(clues.klimov_evening_account.description, /не брал универсальный ключ/);
  assert.match(clues.klimov_evening_account.description, /подпись ещё нужно проверять/);
  assert.match(clues.kostina_evening_account.description, /не видя человека/);
  assert.match(clues.kostina_evening_account.description, /только собственными словами/);
  assert.ok(clues.reader_service_signoff.connections_to.includes('klimov_evening_account'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="reader-interviews"[^>]*hasClue\('reader_maintenance_access_log'\) && GameState\.hasClue\('reader_service_signoff'\)/);
  assert.match(scene, /function inspectReaderWitness/);
  assert.match(scene, /'klimov_evening_account'/);
  assert.match(scene, /'kostina_evening_account'/);
});

test('independent duty records expose a bounded discrepancy without proving who took the key', () => {
  const keyLog = clues.maintenance_tool_issue_ledger;
  const witness = clues.klimov_evening_account;
  const rule = rules.find(item => item.id === 'klimov_key_denial_vs_issue');
  assert.deepEqual(rule.clueIds, [witness.id, keyLog.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [witness, keyLog], rules).map(item => item.id), [rule.id]);
  assert.deepEqual(findContradictions({ clueIds: rule.clueIds }, [witness], rules), []);
  assert.deepEqual(findContradictions({ clueIds: [witness.id] }, [witness, keyLog], rules), []);
  assert.match(keyLog.description, /не позволяет установить, кто фактически/);
  assert.match(clues.archive_room_register.description, /не доказывают/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="witness-corroboration"[^>]*hasClue\('klimov_evening_account'\) && GameState\.hasClue\('kostina_evening_account'\)/);
  assert.match(scene, /function inspectWitnessRecord/);
  assert.match(scene, /'maintenance_tool_issue_ledger'/);
  assert.match(scene, /'archive_room_register'/);
});

test('Klimov follow-up requires a saved contradiction; either tone yields the same independent note', () => {
  const hypothesis = { clueIds: ['klimov_evening_account', 'maintenance_tool_issue_ledger'] };
  const evidence = [clues.klimov_evening_account, clues.maintenance_tool_issue_ledger];
  assert.equal(canConfrontKlimov({ clues: evidence, hypotheses: [] }, rules), false);
  assert.equal(canConfrontKlimov({ clues: evidence.slice(0, 1), hypotheses: [hypothesis] }, rules), false);
  assert.equal(canConfrontKlimov({ clues: evidence, hypotheses: [hypothesis] }, []), false);
  assert.equal(canConfrontKlimov({ clues: evidence, hypotheses: [hypothesis] }, rules), true);
  assert.ok(resolveKlimovConfrontation('patient').trustDelta > 0);
  assert.ok(resolveKlimovConfrontation('pressure').trustDelta < 0);
  assert.equal(resolveKlimovConfrontation('unknown'), null);
  assert.match(clues.key_issue_clerk_note.description, /не видел, кто затем забрал ключ/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /canConfrontKlimov\(GameState\.currentCase, rules\)/);
  assert.match(scene, /GameState\.addClue\(catalog\.key_issue_clerk_note\)/);
  assert.match(scene, /GameState\.setFlag\('court_klimov_interview_tone', tone\)/);
});

test('clerk note opens paper and desk investigations without assigning a suspect', () => {
  assert.match(clues.key_note_paper_trace.description, /не на автора/);
  assert.match(clues.supply_desk_shift_register.description, /не устанавливает, кто заходил/);
  assert.ok(clues.key_issue_clerk_note.connections_to.includes('key_note_paper_trace'));
  assert.ok(clues.key_issue_clerk_note.connections_to.includes('supply_desk_shift_register'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="key-note-trace"[^>]*hasClue\('key_issue_clerk_note'\)/);
  assert.match(scene, /'key_note_paper_trace'[^;]*'key_issue_clerk_note'/s);
  assert.match(scene, /'supply_desk_shift_register'[^;]*'key_issue_clerk_note'/s);
  assert.match(scene, /container\.querySelector\('#key-note-trace'\)\.hidden = false/);
});

test('note authorship review distinguishes authorized access from observed presence', () => {
  assert.match(clues.supply_counter_access_roster.description, /не устанавливает, кто находился/);
  assert.match(clues.supply_counter_access_roster.description, /Надежда Костина/);
  assert.match(clues.key_note_impression_report.description, /17 \/ вечер/);
  assert.match(clues.key_note_impression_report.description, /не доказывает, что обе записи связаны/);
  assert.ok(clues.key_note_impression_report.connections_to.includes('court_extension_directory'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="note-authorship"[^>]*hasClue\('key_note_paper_trace'\) && GameState\.hasClue\('supply_desk_shift_register'\)/);
  assert.match(scene, /function inspectNoteOrigin/);
  assert.match(scene, /'supply_counter_access_roster'/);
  assert.match(scene, /'key_note_impression_report'/);
});

test('seventeen on a service note has a documented alternate meaning, not a proven telephone link', () => {
  assert.match(clues.supply_evening_request_codes.description, /вечернего набора № 17/);
  assert.match(clues.switchboard_call_detail.description, /нет имени говорившего/);
  assert.match(clues.switchboard_call_detail.description, /недостаточно для доказательства связи/);
  assert.ok(clues.key_note_impression_report.connections_to.includes('supply_evening_request_codes'));
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="extension-seventeen-check"[^>]*hasClue\('key_note_impression_report'\) && GameState\.hasClue\('court_extension_directory'\)/);
  assert.match(scene, /function inspectSeventeenLink/);
  assert.match(scene, /'supply_evening_request_codes'/);
  assert.match(scene, /'switchboard_call_detail'/);
});

test('kit seventeen has a verifiable inventory trail without identifying its operator', () => {
  assert.match(clues.kit_seventeen_loan_log.description, /19:58/);
  assert.match(clues.kit_seventeen_loan_log.description, /20:58/);
  assert.match(clues.kit_seventeen_loan_log.description, /не личность получателя/);
  assert.match(clues.kit_seventeen_service_checklist.description, /20:31/);
  assert.match(clues.kit_seventeen_service_checklist.description, /не устанавливает, кто работал/);
  const scene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.match(scene, /id="kit-seventeen-audit"[^>]*hasClue\('supply_evening_request_codes'\)/);
  assert.match(scene, /'kit_seventeen_loan_log'[^;]*'supply_evening_request_codes'/s);
  assert.match(scene, /'kit_seventeen_service_checklist'[^;]*'supply_evening_request_codes'/s);
});
