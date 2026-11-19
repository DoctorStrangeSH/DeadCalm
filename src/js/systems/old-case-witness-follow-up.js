export const OLD_CASE_WITNESS_FOLLOW_UPS = [
  { id: 'clerk_precision', label: 'Уточнить по архивной карточке, что именно мог видеть делопроизводитель.' },
  { id: 'dock_origin', label: 'Попытаться установить первоисточник слов портового сторожа.' }
];

export function planOldCaseWitnessFollowUp(witnessReading, previous = null) {
  if (witnessReading?.choice !== 'direct_only' || previous) return null;
  return OLD_CASE_WITNESS_FOLLOW_UPS;
}

export function recordOldCaseWitnessFollowUp(id, witnessReading, hasClue, previous = null) {
  if (!planOldCaseWitnessFollowUp(witnessReading, previous) || !hasClue('old_case_clerk_statement') || !hasClue('old_case_dock_statement')) return null;
  if (id === 'clerk_precision' && !hasClue('old_case_transfer_card')) return null;
  if (id === 'clerk_precision') return {
    id,
    response: 'Повторная сверка с карточкой передачи подтверждает совпадение рабочего дня и факт приёма папки. Имя отправителя не указано; память делопроизводителя не восполняет пропуск.',
    limitation: 'Два согласующихся источника описывают передачу папки, но не подтверждают личности участников или содержание дела.'
  };
  if (id === 'dock_origin') return {
    id,
    response: 'В старом протоколе нет ни имени коллеги сторожа, ни даты беседы. Определить первоисточник слуха по сохранившейся записи невозможно.',
    limitation: 'Неустановленный источник не превращается в очевидца только потому, что его слова были записаны официально.'
  };
  return null;
}
