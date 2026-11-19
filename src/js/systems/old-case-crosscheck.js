// A comparison of two already obtained sources. It must not award evidence or identify anyone.
export const OLD_CASE_READINGS = [
  {
    id: 'historical_warning',
    label: 'Дневник отражает страх судьи перед оглаской старого дела',
    assessment: 'Возможное объяснение. Запись подтверждает тревогу автора, но не причину этой тревоги и не личность «вернувшегося».'
  },
  {
    id: 'personal_return',
    label: 'Судья ожидал возвращения конкретного человека',
    assessment: 'Версия требует независимого подтверждения. Местоимение «он» само по себе не позволяет установить ни имя, ни причастность к нынешнему убийству.'
  }
];

export function assessOldCaseCrosscheck(hasClue, directives = []) {
  const authorized = Array.isArray(directives) && directives.some(item => item?.kind === 'next_lead' && item?.targetClueId === 'judge_notes');
  if (!authorized) return null;
  const available = ['judge_notes', 'old_case_details'].filter(id => hasClue(id));
  return {
    available,
    missing: ['judge_notes', 'old_case_details'].filter(id => !hasClue(id)),
    ready: available.length === 2,
    commonGround: 'Дневник упоминает двадцать лет; архивное описание старого дела датирует события тем же периодом.',
    limit: 'Совпадение периода не устанавливает, кого имел в виду судья, и не доказывает связь с исполнителем нынешнего преступления.'
  };
}

export function recordOldCaseReading(readingId, check, previous = null) {
  if (!check?.ready || previous || !OLD_CASE_READINGS.some(item => item.id === readingId)) return null;
  const reading = OLD_CASE_READINGS.find(item => item.id === readingId);
  return { readingId, sourceIds: [...check.available], assessment: reading.assessment };
}
