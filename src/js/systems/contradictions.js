/**
 * Authored contradictions are explicit narrative facts, not guessed from prose.
 * Rules: { id, clueIds: ['a', 'b'], summary, followUp }.
 * Never reveal a rule until all of its evidence has been discovered AND attached.
 */
export function findContradictions(hypothesis, discoveredClues, rules = []) {
  if (!hypothesis || !Array.isArray(discoveredClues) || !Array.isArray(rules)) return [];
  const discovered = new Set(discoveredClues.filter(clue => clue && typeof clue.id === 'string').map(clue => clue.id));
  const attached = new Set(Array.isArray(hypothesis.clueIds) ? hypothesis.clueIds.filter(id => typeof id === 'string') : []);
  const seen = new Set();
  return rules.filter(rule => {
    if (!rule || typeof rule.id !== 'string' || seen.has(rule.id)) return false;
    if (!Array.isArray(rule.clueIds) || rule.clueIds.length < 2 ||
        !rule.clueIds.every(id => typeof id === 'string' && id.trim()) ||
        new Set(rule.clueIds).size < 2) return false;
    if (typeof rule.summary !== 'string' || !rule.summary.trim()) return false;
    if (!rule.clueIds.every(id => discovered.has(id) && attached.has(id))) return false;
    seen.add(rule.id);
    return true;
  }).map(rule => ({ id: rule.id, summary: rule.summary, followUp: rule.followUp || null,
    clueIds: [...rule.clueIds] }));
}

export function hasDiscoveredContradiction(ruleId, hypotheses, discoveredClues, rules = []) {
  if (!ruleId) return true;
  return (hypotheses || []).some(hypothesis =>
    findContradictions(hypothesis, discoveredClues, rules).some(rule => rule.id === ruleId));
}
