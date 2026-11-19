export const OLD_CASE_CLOSURE_SOURCES = ['old_case_details', 'old_case_closure_register', 'old_case_archive_inventory'];

// The register establishes the administrative decision. Missing inventory entries
// warrant a follow-up request, not an accusation that a report never existed.
export function assessOldCaseClosure(hasClue, reading) {
  if (!reading || !['historical_warning', 'personal_return'].includes(reading.readingId)) return null;
  const found = OLD_CASE_CLOSURE_SOURCES.filter(id => hasClue(id));
  return {
    found,
    missing: OLD_CASE_CLOSURE_SOURCES.filter(id => !hasClue(id)),
    ready: found.length === OLD_CASE_CLOSURE_SOURCES.length,
    established: 'Реестр подтверждает закрытие дела на третий день с формулировкой «несчастный случай».',
    uncertainty: 'В сохранившейся описи нет данных о дополнительных экспертизах. Отсутствие записи в описи не подтверждает, что экспертизу не проводили.',
    nextStep: 'Запросить исходное постановление и материалы экспертиз, если они сохранились.'
  };
}

export function recordOldCaseClosure(check, previous = null) {
  if (!check?.ready || previous) return null;
  return { sourceIds: [...check.found], status: 'Требует дополнительной проверки', nextStep: check.nextStep };
}
