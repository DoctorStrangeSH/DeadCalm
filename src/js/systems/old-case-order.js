export const OLD_CASE_ORDER_SOURCES = ['old_case_original_order', 'old_case_authority_roster'];

export const OLD_CASE_ORDER_INTERPRETATIONS = [
  { id: 'formal_authority_possible', label: 'Временное полномочие могло быть действительным',
    finding: 'Журнал допускает существование уполномоченного исполняющего обязанности, но не подтверждает, что постановление подписал именно он.' },
  { id: 'signature_unverified', label: 'Личность подписавшего остаётся непроверенной',
    finding: 'Подпись и имя в архивных копиях не позволяют установить подписанта; требуются оригиналы либо независимые образцы.' }
];

export function assessOldCaseOrder(hasClue, closureReview) {
  if (closureReview?.status !== 'Требует дополнительной проверки') return null;
  const found = OLD_CASE_ORDER_SOURCES.filter(id => hasClue(id));
  return {
    found,
    missing: OLD_CASE_ORDER_SOURCES.filter(id => !hasClue(id)),
    ready: found.length === OLD_CASE_ORDER_SOURCES.length,
    established: 'Постановление оформлено как решение исполняющего обязанности; журнал фиксирует передачу полномочий на этот период.',
    limitation: 'Документы не устанавливают, кто поставил подпись, и не подтверждают подделку или давление.'
  };
}

export function recordOldCaseOrderInterpretation(id, assessment, previous = null) {
  if (!assessment?.ready || previous) return null;
  const interpretation = OLD_CASE_ORDER_INTERPRETATIONS.find(item => item.id === id);
  if (!interpretation) return null;
  return { interpretationId: id, sourceIds: [...assessment.found], finding: interpretation.finding,
    nextStep: 'Запросить оригинал постановления и независимые образцы подписи.' };
}
