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
