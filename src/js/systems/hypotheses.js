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

/** Newly found documents directly linked to a theory's attached evidence.
 *  A catalog link is a lead to recheck, never automatic corroboration. */
export function findNewEvidenceLeads(hypothesis, availableClues = [], catalog = {}) {
  const attached = new Set(hypothesis?.clueIds || []);
  if (!attached.size || !Number.isFinite(Date.parse(hypothesis?.updatedAt))) return [];
  const lastReviewedAt = Date.parse(hypothesis.updatedAt);
  const discovered = new Map(availableClues.filter(clue => clue?.id).map(clue => [clue.id, clue]));
  return [...discovered.values()].filter(clue => {
    if (attached.has(clue.id)) return false;
    const foundAt = Date.parse(clue.foundAt);
    if (!Number.isFinite(foundAt) || foundAt <= lastReviewedAt) return false;
    return [...attached].some(id => {
      if (!discovered.has(id)) return false;
      const a = catalog[id]?.connections_to || discovered.get(id)?.connections_to || [];
      const b = catalog[clue.id]?.connections_to || clue.connections_to || [];
      return a.includes(clue.id) || b.includes(id);
    });
  }).map(clue => ({ id: clue.id, name: clue.name || 'Новый материал' }));
}

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
  // A known graph link is not independent corroboration. Group only identical,
  // explicitly documented origins; an unknown origin must never count as independent.
  const bySource = new Map();
  let unknownSources = 0;
  for (const id of ids) {
    const clue = found.get(id);
    const source = (typeof clue.source === 'string' && clue.source.trim()) ||
      (typeof catalog[id]?.source === 'string' && catalog[id].source.trim()) || '';
    if (!source) { unknownSources++; continue; }
    const key = source.toLocaleLowerCase('ru-RU');
    if (!bySource.has(key)) bySource.set(key, { label: source, clueIds: [] });
    bySource.get(key).clueIds.push(id);
  }
  const sharedSources = [...bySource.values()].filter(group => group.clueIds.length > 1);
  return { attached: ids.length, missing: (hypothesis.clueIds || []).filter(id => !found.has(id)).length,
    connections, groups, needsReview: groups.length > 1,
    unknownSources, sharedSources };
}
