const VALID_TONES = new Set(['patient', 'pressure']);
const VALID_RESPONSES = new Set(['shared_lead', 'declined_further_comment']);

function cleanIds(values) {
  return Array.isArray(values)
    ? [...new Set(values.filter(value => typeof value === 'string' && value.trim()))]
    : [];
}

/** Append an attributed interview event; it records what was said, never whether it is true. */
export function appendWitnessInterview(memory, input) {
  if (!memory || typeof memory !== 'object' || !input || typeof input !== 'object') return null;
  if (typeof input.npcId !== 'string' || !input.npcId.trim() ||
      !VALID_TONES.has(input.tone) || !VALID_RESPONSES.has(input.response) ||
      typeof input.statementRef !== 'string' || !input.statementRef.trim()) return null;

  const history = Array.isArray(memory.interviewHistory) ? memory.interviewHistory : [];
  const event = {
    sequence: history.length + 1,
    occurredAt: typeof input.occurredAt === 'string' ? input.occurredAt : new Date().toISOString(),
    tone: input.tone,
    response: input.response,
    statementRef: input.statementRef,
    presentedEvidenceIds: cleanIds(input.presentedEvidenceIds),
    trustAfter: Number.isFinite(input.trustAfter) ? Math.max(0, Math.min(100, input.trustAfter)) : null
  };
  memory.interviewHistory = [...history, event];
  return event;
}

/** A neutral recap for dialogue logic; trust and cooperation remain separate dimensions. */
export function getWitnessInterviewContext(memory) {
  const history = Array.isArray(memory?.interviewHistory) ? memory.interviewHistory : [];
  const last = history.length ? history[history.length - 1] : null;
  return {
    interviewCount: history.length,
    hasPreviousInterview: history.length > 0,
    lastTone: last?.tone || null,
    lastResponse: last?.response || null,
    lastStatementRef: last?.statementRef || null,
    previousStatementRefs: [...new Set(history.map(item => item?.statementRef).filter(Boolean))],
    previouslyPresentedEvidenceIds: [...new Set(history.flatMap(item => cleanIds(item?.presentedEvidenceIds)))]
  };
}
