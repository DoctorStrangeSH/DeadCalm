// A chronology is a synthesis of recorded events, not a proof that one person performed them.
export const READER_TIMELINE_EVIDENCE = [
  'kit_seventeen_loan_log',
  'maintenance_tool_issue_ledger',
  'orlov_badge_scan',
  'kit_seventeen_service_checklist',
  'reader_service_signoff'
];

export const READER_TIMELINE_EVENTS = [
  { time: '19:58', event: 'Выдача набора № 17', source: 'kit_seventeen_loan_log', gap: 'Получатель записан как «дежурная бригада», без имени.' },
  { time: '20:02', event: 'Вход по карточке Орлова', source: 'orlov_badge_scan', gap: 'Система считывает карточку, а не личность человека.' },
  { time: '20:03', event: 'Запись о выдаче универсального ключа', source: 'maintenance_tool_issue_ledger', gap: 'Подпись получателя неразборчива.' },
  { time: '20:31', event: 'Отметка о проверке считывателя', source: 'kit_seventeen_service_checklist', gap: 'Исполнитель не указан.' },
  { time: '20:47', event: 'Выход по карточке Орлова', source: 'orlov_badge_scan', gap: 'Нельзя установить, кто предъявил карточку.' },
  { time: '20:52', event: 'Закрытие ремонтного акта', source: 'reader_service_signoff', gap: 'Подпись неразборчива, подтверждения руководителя нет.' },
  { time: '20:56', event: 'Возврат универсального ключа', source: 'maintenance_tool_issue_ledger', gap: 'Неизвестно, кто фактически вернул ключ.' },
  { time: '20:58', event: 'Возврат набора № 17', source: 'kit_seventeen_loan_log', gap: 'Имя возвращавшего не зафиксировано.' }
];

export function canAssembleReaderTimeline(hasClue) {
  return READER_TIMELINE_EVIDENCE.every(id => hasClue(id));
}
