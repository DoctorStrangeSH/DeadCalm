// Alternative scenarios are investigative questions, never established identities.
export const READER_THEORIES = [
  {
    id: 'single_operator',
    title: 'Один исполнитель',
    premise: 'Карточкой, ключом и набором пользовался один человек.',
    observations: ['orlov_badge_scan', 'maintenance_tool_issue_ledger', 'kit_seventeen_service_checklist'],
    checks: ['key_signature_comparison', 'reader_test_diagnostic'],
    question: 'Кто объединяет эти действия? Ни один журнал не называет одного и того же человека.'
  },
  {
    id: 'shift_handover',
    title: 'Передача между дежурными',
    premise: 'Инструменты и ключ переходили между несколькими сотрудниками.',
    observations: ['kit_seventeen_loan_log', 'maintenance_tool_issue_ledger', 'reader_service_signoff'],
    checks: ['key_signature_comparison'],
    question: 'Где запись передачи? Коллективная заявка не подтверждает смену владельца ключа.'
  },
  {
    id: 'borrowed_badge',
    title: 'Чужая карточка',
    premise: 'Карточку Орлова предъявлял человек, не являвшийся её владельцем.',
    observations: ['orlov_badge_scan', 'orlov_badge_handover'],
    checks: ['reader_test_diagnostic'],
    question: 'Кто предъявил карточку в 20:02 и 20:47? Считыватель не фиксирует лицо.'
  }
];

export function compareReaderTheories(hasClue) {
  if (!hasClue('reader_reconstructed_timeline')) return [];
  return READER_THEORIES.map(theory => ({
    ...theory,
    observed: theory.observations.filter(hasClue),
    unavailable: theory.observations.filter(id => !hasClue(id)),
    verifiedChecks: theory.checks.filter(hasClue),
    pendingChecks: theory.checks.filter(id => !hasClue(id)),
    status: 'Не доказано'
  }));
}

export function snapshotReaderTheory(theory, previous = [], recordedAt = new Date().toISOString()) {
  if (!theory || !READER_THEORIES.some(item => item.id === theory.id)) return null;
  const entries = Array.isArray(previous) ? previous : [];
  const version = entries.length + 1;
  return {
    theoryId: theory.id,
    recordedAt,
    version,
    observed: [...theory.observed],
    verifiedChecks: [...theory.verifiedChecks],
    status: 'Не доказано'
  };
}

export function evaluateTheoryChanges(snapshot, current) {
  if (!snapshot || !current || snapshot.theoryId !== current.id) return null;
  const newDocuments = current.observed.filter(id => !snapshot.observed.includes(id));
  const newChecks = current.verifiedChecks.filter(id => !snapshot.verifiedChecks.includes(id));
  return { newDocuments, newChecks, changed: newDocuments.length + newChecks.length > 0 };
}

export function resolveTheoryApproach(snapshot, approach) {
  if (!snapshot || !READER_THEORIES.some(theory => theory.id === snapshot.theoryId)) return null;
  if (!['discreet', 'accusation'].includes(approach)) return null;
  const npcId = snapshot.theoryId === 'borrowed_badge' ? 'npc_pavel_orlov' : 'npc_nikolay_klimov';
  const checked = snapshot.verifiedChecks.length > 0;
  return {
    npcId,
    approach,
    theoryId: snapshot.theoryId,
    trustDelta: approach === 'discreet' ? 2 : checked ? -4 : -8,
    response: approach === 'discreet'
      ? 'Вы просите уточнить порядок передачи оборудования, не называя подозреваемого. Собеседник соглашается сверить документы; новых показаний пока нет.'
      : 'Вы озвучиваете версию как обвинение. Собеседник требует назвать прямые доказательства своей причастности и прекращает обсуждение. Документы не подтверждают личность исполнителя.'
  };
}

export function resolveWitnessRecall(consequence, route) {
  if (!consequence || !['discreet', 'accusation'].includes(consequence.approach)) return null;
  if (!['conversation', 'formal'].includes(route)) return null;
  if (route === 'formal') return {
    route, trustDelta: 0, memoryFlag: 'reader_theory_formal_request',
    text: 'Вместо повторного давления вы направляете официальный запрос в архив. Свидетель не обязан подтверждать вашу версию; документы остаются доступны по служебной процедуре.'
  };
  return consequence.approach === 'accusation' ? {
    route, trustDelta: 1, memoryFlag: 'reader_theory_apology',
    text: 'Свидетель помнит ваше необоснованное обвинение. Вы признаёте, что вывод был преждевременным. Он принимает извинение, но отказывается от новых устных показаний до проверки документов.'
  } : {
    route, trustDelta: 2, memoryFlag: 'reader_theory_cooperation',
    text: 'Свидетель помнит, что вы не торопились обвинять. Он готов ещё раз вместе просмотреть журнал, однако без новых записей не может установить личность исполнителя.'
  };
}
