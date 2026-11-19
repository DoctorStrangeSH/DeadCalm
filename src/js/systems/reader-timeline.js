// A chronology is a synthesis of recorded events, not a proof that one person performed them.
export const READER_TIMELINE_EVIDENCE = [
  'kit_seventeen_loan_log',
  'maintenance_tool_issue_ledger',
  'orlov_badge_scan',
  'kit_seventeen_service_checklist',
  'reader_service_signoff'
];

export const READER_TIMELINE_EVENTS = [
  { time: '19:58', event: 'Выдача набора № 17' },
  { time: '20:02', event: 'Вход по карточке Орлова' },
  { time: '20:03', event: 'Запись о выдаче универсального ключа' },
  { time: '20:31', event: 'Отметка о проверке считывателя' },
  { time: '20:47', event: 'Выход по карточке Орлова' },
  { time: '20:52', event: 'Закрытие ремонтного акта' },
  { time: '20:56', event: 'Возврат универсального ключа' },
  { time: '20:58', event: 'Возврат набора № 17' }
];

export function canAssembleReaderTimeline(hasClue) {
  return READER_TIMELINE_EVIDENCE.every(id => hasClue(id));
}
