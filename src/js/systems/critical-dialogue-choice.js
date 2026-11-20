/**
 * Atomically claim a prompted critical dialogue decision.
 * A stale/double-clicked UI callback must not apply trust or memory effects twice.
 */
export function claimCriticalDialogueChoice(memory, npcId, triggerQuestion) {
  if (!memory || typeof npcId !== 'string' || !npcId || typeof triggerQuestion !== 'string' || !triggerQuestion) {
    return false;
  }

  const promptedFlag = 'critical_' + triggerQuestion;
  const resolvedFlag = 'critical_choice_resolved_' + triggerQuestion;
  if (!memory.hasFlag(npcId, promptedFlag) || memory.hasFlag(npcId, resolvedFlag)) {
    return false;
  }

  // Persist the claim before applying any effects so re-entrant callbacks are harmless.
  memory.setFlag(npcId, resolvedFlag);
  return true;
}
