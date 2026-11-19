// Alternative scenarios are investigative questions, never established identities.
export const READER_THEORIES = [
  {
    id: 'single_operator',
    title: 'Один исполнитель',
    premise: 'Карточкой, ключом и набором пользовался один человек.',
    observations: ['orlov_badge_scan', 'maintenance_tool_issue_ledger', 'kit_seventeen_service_checklist'],
    checks: ['key_signature_comparison', 'reader_test_diagnostic'],
    question: 'Кто объединяет эти действия? Ни один журнал не называет одного и того же человека.'
  },
  {
    id: 'shift_handover',
    title: 'Передача между дежурными',
    premise: 'Инструменты и ключ переходили между несколькими сотрудниками.',
    observations: ['kit_seventeen_loan_log', 'maintenance_tool_issue_ledger', 'reader_service_signoff'],
    checks: ['key_signature_comparison'],
    question: 'Где запись передачи? Коллективная заявка не подтверждает смену владельца ключа.'
  },
  {
    id: 'borrowed_badge',
    title: 'Чужая карточка',
    premise: 'Карточку Орлова предъявлял человек, не являвшийся её владельцем.',
    observations: ['orlov_badge_scan', 'orlov_badge_handover'],
    checks: ['reader_test_diagnostic'],
    question: 'Кто предъявил карточку в 20:02 и 20:47? Считыватель не фиксирует лицо.'
  }
];

export function compareReaderTheories(hasClue) {
  if (!hasClue('reader_reconstructed_timeline')) return [];
  return READER_THEORIES.map(theory => ({
    ...theory,
    observed: theory.observations.filter(hasClue),
    unavailable: theory.observations.filter(id => !hasClue(id)),
    verifiedChecks: theory.checks.filter(hasClue),
    pendingChecks: theory.checks.filter(id => !hasClue(id)),
    status: 'Не доказано'
  }));
}
