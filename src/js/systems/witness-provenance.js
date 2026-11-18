import { hasDiscoveredContradiction } from './contradictions.js';

export function canTraceSecretary(currentCase, rules) {
  return hasDiscoveredContradiction('secretary_vs_late_pass',
    currentCase?.hypotheses, currentCase?.clues || [], rules);
}

// A repeated account isn't independent corroboration when both reports share one source.
export function assessIndependentAccounts(accounts) {
  const sources = new Set();
  const duplicates = [];
  for (const account of accounts) {
    if (!account?.origin || !account?.id) continue;
    if (sources.has(account.origin)) duplicates.push(account.id);
    sources.add(account.origin);
  }
  return { independentSources: sources.size, dependentAccounts: duplicates };
}
