import { findContradictions } from './contradictions.js';

export const READER_AUDIT_DOCUMENTS = [
  'kit_seventeen_loan_log', 'maintenance_tool_issue_ledger', 'orlov_badge_scan',
  'kit_seventeen_service_checklist', 'reader_service_signoff',
  'key_signature_comparison', 'reader_test_diagnostic', 'reader_archive_crosscheck'
];

export function assessReaderInvestigation(currentCase, rules, flags = {}) {
  const discovered = currentCase?.clues || [];
  const ids = new Set(discovered.map(clue => clue.id));
  if (!ids.has('reader_reconstructed_timeline')) return null;
  const found = READER_AUDIT_DOCUMENTS.filter(id => ids.has(id));
  const remaining = READER_AUDIT_DOCUMENTS.filter(id => !ids.has(id));
  const verifiedRules = new Map();
  for (const hypothesis of currentCase?.hypotheses || []) {
    for (const rule of findContradictions(hypothesis, discovered, rules)) verifiedRules.set(rule.id, rule);
  }
  const conduct = flags.court_reader_theory_consequence?.approach || null;
  const narrative = conduct === 'accusation' ? 'Свидетель столкнулся с преждевременным обвинением.'
    : conduct === 'discreet' ? 'Детектив проверял версию без публичного обвинения.'
      : 'Манера последнего обращения к свидетелю пока не определена.';
  const nextSteps = [];
  if (remaining.length) nextSteps.push(`Проверить оставшиеся документы (${remaining.length}).`);
  if (!verifiedRules.size) nextSteps.push('Сопоставить обнаруженные расхождения на доске гипотез.');
  if (!flags.court_reader_theory_history?.length) nextSteps.push('Зафиксировать одну из альтернативных версий.');
  if (!flags.court_reader_theory_revisit) nextSteps.push('Уточнить позицию свидетеля либо запросить документы официально.');
  nextSteps.push('Неизвестно, кто лично использовал карточку, ключ и инструментальный набор.');
  return {
    found, remaining, verifiedContradictions: [...verifiedRules.values()], conduct: narrative,
    nextSteps, verdict: 'Причастность конкретного человека не установлена'
  };
}
