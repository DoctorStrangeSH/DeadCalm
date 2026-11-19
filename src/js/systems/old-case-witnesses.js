export const OLD_CASE_WITNESS_STATEMENTS = [
  { clueId: 'old_case_clerk_statement', button: 'ЗАПРОСИТЬ ОБЪЯСНЕНИЕ АРХИВНОГО ДЕЛОПРОИЗВОДИТЕЛЯ' },
  { clueId: 'old_case_dock_statement', button: 'ЗАПРОСИТЬ ЗАПИСЬ ОПРОСА ПОРТОВОГО СТОРОЖА' }
];

export function assessOldCaseWitnesses(hasClue, audit) {
  if (audit?.readingId !== 'partial_confirmation') return null;
  const found = OLD_CASE_WITNESS_STATEMENTS.filter(item => hasClue(item.clueId)).map(item => item.clueId);
  return {
    found,
    ready: found.length === OLD_CASE_WITNESS_STATEMENTS.length,
    question: 'Делопроизводитель лично описывает передачу запечатанной папки. Сторож лишь повторяет услышанное от коллеги о визите судьи. Какие сведения можно считать самостоятельным наблюдением?',
    conclusion: 'Личное наблюдение делопроизводителя относится только к передаче папки. Рассказ сторожа о судье — пересказ неизвестного исходного наблюдения; он не подтверждает присутствие судьи и не раскрывает подписанта.'
  };
}

export function recordOldCaseWitnessReading(choice, assessment, previous = null) {
  if (!assessment?.ready || previous || !['direct_only', 'both_direct', 'both_rumor'].includes(choice)) return null;
  if (choice !== 'direct_only') return {
    correct: false,
    feedback: choice === 'both_direct'
      ? 'Сторож не видел судью сам: он повторяет чужую фразу. Два документа не означают два независимых наблюдения.'
      : 'Делопроизводитель сообщает о передаче, которую видел лично. Это ограниченное, но непосредственное наблюдение.'
  };
  return { correct: true, choice, conclusion: assessment.conclusion,
    nextStep: 'Для проверки визита судьи нужны первичная запись посетителей или прямой свидетель, а не ещё один пересказ.' };
}
