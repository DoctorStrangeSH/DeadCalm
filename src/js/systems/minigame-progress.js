const OUTCOME_RANK = {
  unreadable: 0,
  damaged: 1,
  partial: 1,
  fragmented: 1,
  success: 2,
  clear: 2
};

const ALLOWED_TYPES = new Set(['radio-tuning', 'mechanical-repair']);

export function createEmptyMiniGameProgress() {
  return {};
}

export function normalizeMiniGameProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  for (const [type, entry] of Object.entries(value)) {
    if (!ALLOWED_TYPES.has(type) || !entry || typeof entry !== 'object') continue;
    const attempts = Number.isInteger(entry.attempts) && entry.attempts > 0 ? entry.attempts : 1;
    const rank = OUTCOME_RANK[entry.bestOutcome];
    if (rank === undefined) continue;
    normalized[type] = {
      attempts,
      bestOutcome: entry.bestOutcome,
      bestQuality: Number.isFinite(entry.bestQuality) ? Math.max(0, Math.min(100, entry.bestQuality)) : null,
      lastOutcome: OUTCOME_RANK[entry.lastOutcome] === undefined ? entry.bestOutcome : entry.lastOutcome,
      lastQuality: Number.isFinite(entry.lastQuality) ? Math.max(0, Math.min(100, entry.lastQuality)) : null,
      completedAt: typeof entry.completedAt === 'string' ? entry.completedAt : null
    };
  }
  return normalized;
}

export function recordMiniGameResult(progress, input, now = new Date().toISOString()) {
  if (!progress || typeof progress !== 'object' || !input || !ALLOWED_TYPES.has(input.type)) return null;
  const outcome = input.outcome;
  if (OUTCOME_RANK[outcome] === undefined) return null;
  const quality = Number.isFinite(input.quality) ? Math.max(0, Math.min(100, input.quality)) : null;
  const previous = progress[input.type];
  const previousRank = previous ? OUTCOME_RANK[previous.bestOutcome] : -1;
  const nextRank = OUTCOME_RANK[outcome];
  const isBetter = nextRank > previousRank
    || (nextRank === previousRank && quality !== null
      && (previous.bestQuality === null || previous.bestQuality === undefined || quality > previous.bestQuality));

  const entry = {
    attempts: (previous?.attempts || 0) + 1,
    bestOutcome: isBetter ? outcome : previous.bestOutcome,
    bestQuality: isBetter ? quality : previous.bestQuality ?? null,
    lastOutcome: outcome,
    lastQuality: quality,
    completedAt: now
  };
  progress[input.type] = entry;
  return { type: input.type, ...entry, improved: isBetter };
}
