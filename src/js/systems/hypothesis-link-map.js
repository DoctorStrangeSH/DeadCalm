/** Only player-discovered board connections count as visible links here. */
export function getHypothesisLinkMap(clueIds = [], discoveredClues = [], connections = []) {
  const available = new Set(discoveredClues.map(clue => clue.id));
  const ids = [...new Set(clueIds)].filter(id => available.has(id));
  const selected = new Set(ids);
  const links = connections.filter(link => selected.has(link.clue1) && selected.has(link.clue2) && link.clue1 !== link.clue2);
  const adjacent = new Map(ids.map(id => [id, new Set()]));
  links.forEach(link => {
    adjacent.get(link.clue1).add(link.clue2);
    adjacent.get(link.clue2).add(link.clue1);
  });
  const isolated = ids.filter(id => adjacent.get(id).size === 0);
  const unseen = new Set(ids);
  const groups = [];
  while (unseen.size) {
    const pending = [unseen.values().next().value];
    const group = [];
    while (pending.length) {
      const id = pending.pop();
      if (!unseen.delete(id)) continue;
      group.push(id);
      for (const next of adjacent.get(id)) if (unseen.has(next)) pending.push(next);
    }
    groups.push(group);
  }
  return { ids, links, isolated, groups, missing: [...new Set(clueIds)].filter(id => !available.has(id)).length };
}
