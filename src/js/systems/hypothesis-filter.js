/** Filters the detective's saved theories without changing their status or evidence. */
export function filterHypotheses(hypotheses = [], clues = [], query = '', status = 'all', reviewIds = new Set()) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  const clueNames = new Map(clues.map(clue => [clue.id, clue.name || '']));
  return hypotheses.filter(item => {
    if (status === 'review' ? !reviewIds.has(item.id) : status !== 'all' && item.status !== status) return false;
    if (!needle) return true;
    const searchable = [item.title, item.reasoning, ...(item.clueIds || []).map(id => clueNames.get(id) || '')];
    return searchable.some(value => String(value || '').toLocaleLowerCase().includes(needle));
  });
}
