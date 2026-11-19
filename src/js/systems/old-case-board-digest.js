const ARCHIVE_GROUPS = [
  { id: 'closure', title: 'Закрытие дела', clues: ['old_case_details', 'old_case_closure_register', 'old_case_archive_inventory', 'old_case_original_order', 'old_case_authority_roster'] },
  { id: 'custody', title: 'Подпись и передача', clues: ['old_case_order_physical_original', 'old_case_signature_samples', 'old_case_specialist_memo', 'old_case_custody_extract', 'old_case_transfer_card'] },
  { id: 'accounts', title: 'Свидетельства и порт', clues: ['old_case_clerk_statement', 'old_case_dock_statement', 'old_case_port_visitor_log'] }
];

export function getOldCaseBoardDigest(clues = [], flags = {}) {
  const ids = new Set(clues.filter(clue => clue?.id).map(clue => clue.id));
  const groups = ARCHIVE_GROUPS.map(group => ({
    id: group.id, title: group.title, clueIds: group.clues.filter(id => ids.has(id))
  })).filter(group => group.clueIds.length);
  if (!groups.length) return null;
  const observations = [
    ...(flags.court_old_case_closure_review ? ['Срок закрытия документирован; обоснованность решения не установлена.'] : []),
    ...(flags.court_old_case_witness_reading?.choice === 'direct_only' ? ['Показание о приёме папки — непосредственное; рассказ о судье — пересказ.'] : []),
    ...(flags.court_old_case_discrepancy?.id === 'source_gap' ? ['Неизвестное происхождение слуха — пробел, а не доказанная ложь.'] : []),
    ...(flags.court_old_case_port_log_reading?.choice === 'limited_record' ? ['Журнал подтверждает въезд, но не имя посетителя.'] : [])
  ];
  return { groups, observations, total: groups.reduce((sum, group) => sum + group.clueIds.length, 0),
    warning: 'Архивные документы и устные сообщения не устанавливают автоматически личность подписанта или виновного.' };
}
