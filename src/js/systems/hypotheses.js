const STATUSES = new Set(['unchecked', 'probable', 'contradicted', 'confirmed', 'rejected']);

export function createHypothesis({ id, title, reasoning, clueIds = [] }, availableClues, now = new Date().toISOString()) {
  const cleanTitle = String(title || '').trim().slice(0, 100);
  const cleanReasoning = String(reasoning || '').trim().slice(0, 2000);
  if (!cleanTitle || !cleanReasoning) throw new Error('Укажите название и обоснование гипотезы');
  const allowed = new Set(availableClues.map(clue => clue.id));
  const evidence = [...new Set(clueIds)].filter(clueId => allowed.has(clueId));
  return { id, title: cleanTitle, reasoning: cleanReasoning, clueIds: evidence,
    status: 'unchecked', createdAt: now, updatedAt: now,
    history: [{ at: now, type: 'created', status: 'unchecked', clueIds: [...evidence], reasoning: cleanReasoning, title: cleanTitle }] };
}

export function reviseHypothesis(hypothesis, change, availableClues, now = new Date().toISOString()) {
  const status = change.status ?? hypothesis.status;
  if (!STATUSES.has(status)) throw new Error('Неизвестный статус гипотезы');
  const allowed = new Set(availableClues.map(clue => clue.id));
  const clueIds = [...new Set(change.clueIds ?? hypothesis.clueIds)].filter(id => allowed.has(id));
  const reasoning = String(change.reasoning ?? hypothesis.reasoning).trim().slice(0, 2000);
  if (!reasoning) throw new Error('Обоснование не может быть пустым');
  const title = String(change.title ?? hypothesis.title).trim().slice(0, 100);
  if (!title) throw new Error('Название не может быть пустым');
  if (status === hypothesis.status && title === hypothesis.title && reasoning === hypothesis.reasoning &&
      JSON.stringify(clueIds) === JSON.stringify(hypothesis.clueIds || [])) return hypothesis;
  const next = { ...hypothesis, title, status, clueIds, reasoning, updatedAt: now };
  next.history = [...(hypothesis.history || []), { at: now, type: 'revised', status,
    clueIds: [...clueIds], reasoning, title }];
  return next;
}

export const HYPOTHESIS_STATUS_LABELS = Object.freeze({
  unchecked: 'Не проверена', probable: 'Вероятна', contradicted: 'Есть противоречия',
  confirmed: 'Подтверждена', rejected: 'Отвергнута'
});

/** An evidence-link audit, not an automatic judgment about a theory's truth. */
export function auditHypothesisEvidence(hypothesis, availableClues, catalog = {}) {
  const found = new Map(availableClues.filter(clue => clue.id).map(clue => [clue.id, clue]));
  const ids = [...new Set(hypothesis.clueIds || [])].filter(id => found.has(id));
  const graph = new Map(ids.map(id => [id, new Set()]));
  const connections = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const [a, b] = [ids[i], ids[j]];
      const first = catalog[a]?.connections_to || found.get(a).connections_to || [];
      const second = catalog[b]?.connections_to || found.get(b).connections_to || [];
      if (first.includes(b) || second.includes(a)) {
        graph.get(a).add(b);
        graph.get(b).add(a);
        connections.push({ a, b });
      }
    }
  }
  const unseen = new Set(ids);
  const groups = [];
  while (unseen.size) {
    const group = [];
    const pending = [unseen.values().next().value];
    while (pending.length) {
      const id = pending.pop();
      if (!unseen.delete(id)) continue;
      group.push(id);
      for (const neighbor of graph.get(id)) if (unseen.has(neighbor)) pending.push(neighbor);
    }
    groups.push(group);
  }
  return { attached: ids.length, missing: (hypothesis.clueIds || []).filter(id => !found.has(id)).length,
    connections, groups, needsReview: groups.length > 1 };
}
