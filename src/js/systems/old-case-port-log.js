export const OLD_CASE_PORT_LOG_READINGS = [
  { id: 'judge_present', label: 'Запись доказывает, что судья лично приезжал в порт.' },
  { id: 'limited_record', label: 'Запись подтверждает только служебный въезд без установленной личности посетителя.' },
  { id: 'rumor_disproved', label: 'Журнал опровергает слова сторожа: никакого посетителя не было.' }
];

export function assessOldCasePortLog(hasClue, discrepancy, previous = null) {
  if (discrepancy?.id !== 'source_gap') return null;
  return {
    available: true,
    found: hasClue('old_case_port_visitor_log'),
    saved: previous,
    question: 'В сохранившемся листе отмечен служебный въезд в порт в период расследования. Графа посетителя залита чернилами; регистрационный номер транспорта утрачен. Что следует из этой записи?',
    finding: 'Журнал независимо подтверждает служебный въезд, но не его участника. Совпадение периода не устанавливает визит судьи и не доказывает ложность слов сторожа.',
    nextStep: 'Искать независимый пропуск или путевой лист с датой и именем, не приписывая запись конкретному человеку.'
  };
}

export function recordOldCasePortLogReading(choice, assessment, previous = null) {
  if (!assessment?.found || previous || !OLD_CASE_PORT_LOG_READINGS.some(item => item.id === choice)) return null;
  if (choice !== 'limited_record') return { correct: false,
    feedback: choice === 'judge_present'
      ? 'Имя в записи не сохранилось. Служебный въезд не равнозначен присутствию судьи.'
      : 'В журнале сохранилась запись о въезде. Но она не подтверждает и не опровергает личность, названную в пересказе.' };
  return { correct: true, choice, finding: assessment.finding, nextStep: assessment.nextStep };
}
