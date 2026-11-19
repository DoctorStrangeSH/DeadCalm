export const OLD_CASE_DISCREPANCY_CHOICES = [
  { id: 'deliberate_lie', label: 'Сторож намеренно солгал: карточка передачи это доказывает.' },
  { id: 'source_gap', label: 'Здесь пробел в происхождении слуха, а не доказанное противоречие или ложь.' },
  { id: 'judge_confirmed', label: 'Раз папку передали официально, присутствие судьи тоже подтверждено.' }
];

export function assessOldCaseDiscrepancy(hasClue, witnessReading, followUp, previous = null) {
  if (witnessReading?.choice !== 'direct_only' || !['clerk_precision', 'dock_origin'].includes(followUp?.id)) return null;
  if (!['old_case_clerk_statement', 'old_case_dock_statement', 'old_case_transfer_card'].every(hasClue)) return null;
  return {
    saved: previous,
    question: 'Карточка и делопроизводитель говорят о передаче папки. Сторож пересказывает чужие слова о судье. Можно ли считать эти сообщения противоречием?',
    finding: 'Передача архивной папки и предполагаемый визит судьи — разные события. Одно не опровергает другое. Неизвестный источник слов сторожа оставляет пробел проверки, но не доказывает обман.',
    nextStep: 'Найти независимую первичную запись визита, если она сохранилась; до этого не отмечать свидетельство сторожа как ложь.'
  };
}

export function recordOldCaseDiscrepancy(id, assessment, previous = null) {
  if (!assessment || previous || !OLD_CASE_DISCREPANCY_CHOICES.some(choice => choice.id === id)) return null;
  if (id !== 'source_gap') return { correct: false,
    feedback: id === 'deliberate_lie'
      ? 'Расхождение в надёжности источников не является доказательством намеренной лжи. Карточка не описывает посещения порта.'
      : 'Оформление папки не подтверждает визит судьи. Эти события нельзя отождествлять.' };
  return { correct: true, id, finding: assessment.finding, nextStep: assessment.nextStep };
}
