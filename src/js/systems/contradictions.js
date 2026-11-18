/**
 * Authored contradictions are explicit narrative facts, not guessed from prose.
 * Rules: { id, clueIds: ['a', 'b'], summary, followUp }.
 * Never reveal a rule until all of its evidence has been discovered AND attached.
 */
export function findContradictions(hypothesis, discoveredClues, rules = []) {
  const discovered = new Set(discoveredClues.map(clue => clue.id));
  const attached = new Set(hypothesis.clueIds || []);
  const seen = new Set();
  return rules.filter(rule => {
    if (!rule || typeof rule.id !== 'string' || seen.has(rule.id)) return false;
    if (!Array.isArray(rule.clueIds) || rule.clueIds.length < 2 || !rule.clueIds.every(id => typeof id === 'string')) return false;
    if (typeof rule.summary !== 'string' || !rule.summary.trim()) return false;
    if (!rule.clueIds.every(id => discovered.has(id) && attached.has(id))) return false;
    seen.add(rule.id);
    return true;
  }).map(rule => ({ id: rule.id, summary: rule.summary, followUp: rule.followUp || null,
    clueIds: [...rule.clueIds] }));
}
