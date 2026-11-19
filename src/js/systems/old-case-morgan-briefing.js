export const MORGAN_BRIEFING_APPROACHES = [
  { id: 'share_limits', label: 'Открыто объяснить, что записи пока нельзя связать', trustDelta: 1 },
  { id: 'press_for_name', label: 'Потребовать назвать судью на основании совпавших дат', trustDelta: -1 }
];

export function planMorganBriefing(hasClue, waybillReading, previousApproach, previous = null) {
  if (waybillReading?.choice !== 'unmatched_trip' || !waybillReading?.correct ||
      !hasClue('old_case_port_waybill') || !hasClue('old_case_port_visitor_log') ||
      !['careful_request', 'unsupported_accusation'].includes(previousApproach?.approachId)) return null;
  return { saved: previous, lead: 'Морган сверяет два независимых листа. Дата совпадает, но ни номер машины, ни фамилия пассажира не сохранились.' };
}

export function recordMorganBriefing(choice, briefing, previousApproach, trust, previous = null) {
  const approach = MORGAN_BRIEFING_APPROACHES.find(item => item.id === choice);
  if (!briefing || briefing.saved || previous || !approach ||
      !['careful_request', 'unsupported_accusation'].includes(previousApproach?.approachId)) return null;
  const strained = previousApproach.approachId === 'unsupported_accusation' || trust < 40;
  const response = choice === 'share_limits'
    ? strained
      ? 'Морган медлит: «После твоих прежних обвинений я осторожен. Но сейчас ты честно признаёшь пробел. Давай проверять номера пропусков официально».'
      : 'Морган кивает: «Вот теперь мы говорим на одном языке. Два листа — ещё не один человек. Запросим номера пропусков».'
    : strained
      ? 'Морган отодвигает бумаги: «Ты снова хочешь имя без доказательств. Мой ответ прежний: только официальный запрос».'
      : 'Морган хмурится: «Совпавшая дата не даёт права обвинять судью. Я не назову имя, которого нет в документах».';
  return { choice, response, trustDelta: approach.trustDelta,
    nextStep: 'Сверить номера пропусков с транспортным журналом; доступ к официальным запросам сохраняется.' };
}
