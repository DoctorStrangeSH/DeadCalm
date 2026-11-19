const REVISIT_ROUTES = {
  careful_request: {
    route: 'voluntary_assistance',
    button: 'ПОПРОСИТЬ МОРГАНА НАЙТИ КАРТОЧКУ ПЕРЕДАЧИ',
    response: 'Морган приносит индексную карточку: «Это всё, что сохранилось в рабочем каталоге. Здесь подразделение, но нет фамилии. Не строй обвинение на пустой строке».'
  },
  unsupported_accusation: {
    route: 'formal_registry',
    button: 'ЗАПРОСИТЬ КАРТОЧКУ ПЕРЕДАЧИ ЧЕРЕЗ КАНЦЕЛЯРИЮ',
    response: 'Канцелярия выдаёт заверенную карточку по письменному запросу. Морган не участвует в передаче; в графе отправителя есть лишь подразделение, без фамилии.'
  }
};

export function planMorganRevisit(approach, previous = null) {
  if (previous) return null;
  const route = REVISIT_ROUTES[approach?.approachId];
  if (!route || !['old_case_specialist_memo', 'old_case_custody_extract'].includes(approach?.sourceId)) return null;
  return { ...route, clueId: 'old_case_transfer_card',
    limit: 'Карточка подтверждает движение папки, а не личность человека, подписавшего решение.' };
}

export function recordMorganRevisit(route, hasClue, previous = null) {
  if (!route || route.clueId !== 'old_case_transfer_card' || !hasClue(route.clueId) || previous) return null;
  return { route: route.route, clueId: route.clueId, response: route.response, limit: route.limit };
}
