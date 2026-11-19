import { assessReaderInvestigation } from './investigation-quality.js';

// Provisional conclusions describe what the records establish, never a culprit.
export function buildReaderEpisodeConclusion(currentCase, rules, flags = {}, previous = [], date = new Date().toISOString()) {
  const audit = assessReaderInvestigation(currentCase, rules, flags);
  if (!audit) return null;
  const history = Array.isArray(previous) ? previous : [];
  const established = [
    'Записи фиксируют последовательность работ с 19:58 до 20:58.',
    ...audit.verifiedContradictions.map(item => item.summary)
  ];
  return {
    version: history.length + 1,
    recordedAt: date,
    documentIds: [...audit.found],
    contradictionIds: audit.verifiedContradictions.map(item => item.id),
    established,
    unresolved: [...audit.nextSteps],
    verdict: audit.verdict,
    status: 'Промежуточное заключение'
  };
}

export function hasNewConclusionEvidence(previous, current) {
  if (!current) return false;
  if (!previous) return true;
  const beforeDocuments = new Set(previous.documentIds || []);
  const beforeRules = new Set(previous.contradictionIds || []);
  return current.documentIds.some(id => !beforeDocuments.has(id))
    || current.contradictionIds.some(id => !beforeRules.has(id));
}
