export function filterBoardClues(clues = [], query = '', category = 'all') {
  const needle = String(query || '').trim().toLocaleLowerCase('ru-RU');
  return clues.filter(clue => {
    if (!clue?.id || (category !== 'all' && clue.category !== category)) return false;
    if (!needle) return true;
    return [clue.name, clue.source, clue.description]
      .some(value => String(value || '').toLocaleLowerCase('ru-RU').includes(needle));
  }).map(clue => clue.id);
}
