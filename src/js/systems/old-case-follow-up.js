// Each route supplies a distinct document, but neither route decides who signed.
export const OLD_CASE_FOLLOW_UPS = {
  request_specialist: {
    clueId: 'old_case_specialist_memo',
    button: 'ПОЛУЧИТЬ ЗАПИСКУ СПЕЦИАЛИСТА',
    conclusion: 'Сохранившегося росчерка недостаточно для проверки автора. Заключение об идентичности подписанта отсутствует.'
  },
  formal_inquiry: {
    clueId: 'old_case_custody_extract',
    button: 'ПОЛУЧИТЬ ВЫПИСКУ О ДВИЖЕНИИ ПАПКИ',
    conclusion: 'Цепочка хранения частично восстановлена, но состояние подписи при приёме не записано. Дата повреждения неизвестна.'
  }
};

export function assessOldCaseFollowUp(action, hasClue) {
  const route = OLD_CASE_FOLLOW_UPS[action?.actionId];
  if (!route || action?.status !== 'Подписант не установлен') return null;
  return {
    ...route,
    found: !!hasClue(route.clueId),
    commonLimit: 'Подписант остаётся неизвестен. Следующий общий шаг — получить независимые сведения о лицах и обстоятельствах закрытия дела, не предъявляя обвинение по неподтверждённой подписи.'
  };
}

export function recordOldCaseFollowUp(result, previous = null) {
  if (!result?.found || previous || !Object.values(OLD_CASE_FOLLOW_UPS).some(route => route.clueId === result.clueId)) return null;
  return { sourceId: result.clueId, conclusion: result.conclusion, nextStep: result.commonLimit };
}
