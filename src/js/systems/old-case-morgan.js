export const OLD_CASE_MORGAN_APPROACHES = [
  {
    id: 'careful_request',
    label: 'Показать Моргану документы и попросить независимую проверку',
    flag: 'old_case_careful_request',
    trustDelta: 2,
    response: 'Морган внимательно читает выписку: «Вот так и надо. Ты отделяешь факты от подозрений. Я помогу оформить официальный запрос, но пока не называй виновных».',
    result: 'Формальный запрос зарегистрирован. Морган готов содействовать, но сведений о подписанте всё ещё недостаточно.'
  },
  {
    id: 'unsupported_accusation',
    label: 'Обвинить участников старого дела без подтверждения подписи',
    flag: 'old_case_unsupported_accusation',
    trustDelta: -3,
    response: 'Морган резко закрывает папку: «Ты обвиняешь людей по испорченной бумаге? Я не подпишусь под этим. Если нужны документы — подавай запрос по правилам».',
    result: 'Морган отказывается поддержать обвинение. Официальный документальный запрос остаётся доступным; ключевые материалы не заблокированы.'
  }
];

export function canApproachMorganAboutOldCase(followUp) {
  return !!followUp && ['old_case_specialist_memo', 'old_case_custody_extract'].includes(followUp.sourceId);
}

export function resolveMorganOldCaseApproach(approachId, followUp, previous = null) {
  if (!canApproachMorganAboutOldCase(followUp) || previous) return null;
  const approach = OLD_CASE_MORGAN_APPROACHES.find(item => item.id === approachId);
  if (!approach) return null;
  return { approachId, sourceId: followUp.sourceId, flag: approach.flag, trustDelta: approach.trustDelta,
    response: approach.response, result: approach.result };
}
