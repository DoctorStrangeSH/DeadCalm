export const OLD_CASE_SIGNATURE_SOURCES = ['old_case_order_physical_original', 'old_case_signature_samples'];

export const OLD_CASE_SIGNATURE_ACTIONS = [
  { id: 'request_specialist', label: 'Передать материалы специалисту и запросить дополнительные образцы',
    result: 'Назначена дополнительная проверка сохранности оригинала и независимых подписей. До её окончания подписант не установлен.' },
  { id: 'formal_inquiry', label: 'Направить запрос о цепочке хранения постановления',
    result: 'Оформлен запрос о передаче документа в архив. История хранения может объяснить повреждение, но пока не устанавливает ни автора подписи, ни умысел.' }
];

export function assessOldCaseSignature(hasClue, orderInterpretation) {
  if (!orderInterpretation || !['formal_authority_possible', 'signature_unverified'].includes(orderInterpretation.interpretationId)) return null;
  const found = OLD_CASE_SIGNATURE_SOURCES.filter(id => hasClue(id));
  return {
    found,
    missing: OLD_CASE_SIGNATURE_SOURCES.filter(id => !hasClue(id)),
    ready: found.length === OLD_CASE_SIGNATURE_SOURCES.length,
    finding: 'Независимые образцы получены, но подпись на оригинале повреждена: достоверное отождествление или исключение конкретного подписанта невозможно.',
    limit: 'Повреждение не подтверждает подделку. Для вывода о личности или намерениях нужны дополнительные проверяемые материалы.'
  };
}

export function recordOldCaseSignatureAction(actionId, assessment, previous = null) {
  if (!assessment?.ready || previous) return null;
  const action = OLD_CASE_SIGNATURE_ACTIONS.find(item => item.id === actionId);
  if (!action) return null;
  return { actionId, sourceIds: [...assessment.found], status: 'Подписант не установлен', result: action.result };
}
