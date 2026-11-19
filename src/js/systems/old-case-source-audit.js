export const OLD_CASE_SOURCE_READINGS = [
  { id: 'all_confirmed', label: 'Документы подтверждают весь рассказ Моргана, включая участников дела.' },
  { id: 'partial_confirmation', label: 'Документы подтверждают сроки и передачу папки, но не всех участников и подписанта.' },
  { id: 'nothing_confirmed', label: 'Документы ничего не подтверждают: это всё лишь слухи.' }
];

export function assessOldCaseSources(hasClue, previous = null) {
  const required = ['old_case_details', 'old_case_closure_register', 'old_case_transfer_card'];
  if (!required.every(id => hasClue(id))) return null;
  return {
    saved: previous,
    established: 'Книга закрытых дел независимо от рассказа Моргана подтверждает дату закрытия и формулировку «несчастный случай». Карточка передачи фиксирует движение папки.',
    limit: 'Слова Моргана об участии конкретных людей не удостоверяются этими записями. Графа отправителя содержит подразделение, не фамилию; автор подписи остаётся неизвестен.'
  };
}

export function recordOldCaseSourceReading(readingId, assessment, previous = null) {
  if (!assessment || previous || !OLD_CASE_SOURCE_READINGS.some(item => item.id === readingId)) return null;
  if (readingId !== 'partial_confirmation') return {
    correct: false,
    feedback: readingId === 'all_confirmed'
      ? 'Это преждевременный вывод: совпадение срока не подтверждает имена участников или автора подписи. Попробуйте отделить факты реестра от рассказа.'
      : 'Реестр и карточка всё же подтверждают отдельные факты независимо от устного рассказа. Не отбрасывайте документальные свидетельства.'
  };
  return {
    correct: true,
    readingId,
    conclusion: 'Сверка зафиксирована: срок закрытия и передача папки подтверждены архивом. Названные Морганом участники и автор подписи требуют самостоятельных источников.',
    nextStep: 'Искать первичные протоколы участия, а не повторные пересказы одной истории.'
  };
}
