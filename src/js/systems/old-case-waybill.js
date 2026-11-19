export const OLD_CASE_WAYBILL_READINGS = [
  { id: 'identified_judge', label: 'Путевой лист устанавливает, что в порт приезжал судья.' },
  { id: 'same_vehicle', label: 'Одинаковая дата доказывает, что журнал и путевой лист описывают одну машину.' },
  { id: 'unmatched_trip', label: 'Путевой лист подтверждает служебный рейс, но сопоставить его с въездом пока нельзя.' }
];

export function assessOldCaseWaybill(hasClue, portReading, previous = null) {
  if (portReading?.choice !== 'limited_record' || portReading?.correct !== true) return null;
  return {
    found: hasClue('old_case_port_waybill'),
    saved: previous,
    question: 'Путевой лист описывает служебный рейс в день записи журнала. Маршрут указан лишь как «портовый район», а номер машины и фамилия пассажира отсутствуют. Как сопоставить источники?',
    finding: 'Два документа независимо фиксируют служебную активность в один день, но нельзя установить, что речь об одной машине или одном посетителе.',
    nextStep: 'Проверить сохранившиеся пропуска с регистрационными номерами; совпадение даты само по себе недостаточно.'
  };
}

export function recordOldCaseWaybillReading(choice, assessment, previous = null) {
  if (!assessment?.found || previous || !OLD_CASE_WAYBILL_READINGS.some(item => item.id === choice)) return null;
  if (choice !== 'unmatched_trip') return {
    correct: false,
    feedback: choice === 'identified_judge'
      ? 'Путевой лист не содержит имени судьи или пассажира. Личность нельзя восстановить предположением.'
      : 'Совпадение даты не является уникальным идентификатором транспорта. Необходим номер машины или пропуска.'
  };
  return { correct: true, choice, finding: assessment.finding, nextStep: assessment.nextStep };
}
