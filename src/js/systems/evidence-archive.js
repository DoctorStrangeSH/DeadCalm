export const EVIDENCE_CATEGORIES = Object.freeze({
  document: 'Документы',
  evidence: 'Вещественные улики',
  object: 'Предметы',
  information: 'Сведения',
  observation: 'Наблюдения',
  important: 'Важное'
});

export function evidenceCategoryLabel(category) {
  return EVIDENCE_CATEGORIES[category] || 'Прочее';
}

export function selectEvidence(clues, { category = 'all', sort = 'newest', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase('ru');
  return clues.filter(clue => {
    if (category !== 'all' && clue.category !== category) return false;
    if (!needle) return true;
    return [clue.name, clue.description, clue.location, evidenceCategoryLabel(clue.category)]
      .some(value => String(value || '').toLocaleLowerCase('ru').includes(needle));
  }).sort((a, b) => {
    const left = Date.parse(a.foundAt || '') || 0;
    const right = Date.parse(b.foundAt || '') || 0;
    return sort === 'oldest' ? left - right : right - left;
  });
}

/** Resolve known relations without exposing names or descriptions of locked clues. */
export function resolveEvidenceLinks(clue, foundClues, catalog = {}) {
  const found = new Map(foundClues.filter(item => item.id).map(item => [item.id, item]));
  const definition = catalog[clue.id] || {};
  const relatedIds = new Set([
    ...(definition.connections_to || clue.connections_to || []),
    ...Object.values(catalog)
      .filter(item => (item.connections_to || []).includes(clue.id))
      .map(item => item.id)
  ]);
  relatedIds.delete(clue.id);
  return [...relatedIds].filter(Boolean).map(id => ({
    id,
    found: found.has(id),
    name: found.has(id) ? found.get(id).name : null
  }));
}
