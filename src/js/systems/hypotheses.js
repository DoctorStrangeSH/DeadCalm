const STATUSES = new Set(['unchecked', 'probable', 'contradicted', 'confirmed', 'rejected']);

export function createHypothesis({ id, title, reasoning, clueIds = [] }, availableClues, now = new Date().toISOString()) {
  const cleanTitle = String(title || '').trim().slice(0, 100);
  const cleanReasoning = String(reasoning || '').trim().slice(0, 2000);
  if (!cleanTitle || !cleanReasoning) throw new Error('Укажите название и обоснование гипотезы');
  const allowed = new Set(availableClues.map(clue => clue.id));
  const evidence = [...new Set(clueIds)].filter(clueId => allowed.has(clueId));
  return { id, title: cleanTitle, reasoning: cleanReasoning, clueIds: evidence,
    status: 'unchecked', createdAt: now, updatedAt: now,
    history: [{ at: now, type: 'created', status: 'unchecked', clueIds: evidence }] };
}

export function reviseHypothesis(hypothesis, change, availableClues, now = new Date().toISOString()) {
  const status = change.status ?? hypothesis.status;
  if (!STATUSES.has(status)) throw new Error('Неизвестный статус гипотезы');
  const allowed = new Set(availableClues.map(clue => clue.id));
  const clueIds = [...new Set(change.clueIds ?? hypothesis.clueIds)].filter(id => allowed.has(id));
  const reasoning = String(change.reasoning ?? hypothesis.reasoning).trim().slice(0, 2000);
  if (!reasoning) throw new Error('Обоснование не может быть пустым');
  const next = { ...hypothesis, status, clueIds, reasoning, updatedAt: now };
  next.history = [...(hypothesis.history || []), { at: now, type: 'revised', status,
    clueIds: [...clueIds], reasoning }];
  return next;
}

export const HYPOTHESIS_STATUS_LABELS = Object.freeze({
  unchecked: 'Не проверена', probable: 'Вероятна', contradicted: 'Есть противоречия',
  confirmed: 'Подтверждена', rejected: 'Отвергнута'
});
