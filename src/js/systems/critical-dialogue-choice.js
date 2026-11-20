/**
 * Critical decision state is keyed by the authored node id because askQuestion
 * persists "critical_<node id>" when that node is first opened.
 */
export function findPendingCriticalDialogueNode(npcData, memory, npcId) {
  if (!npcData || !memory || typeof npcId !== 'string' || !npcId) return null;

  for (const [nodeId, node] of Object.entries(npcData)) {
    if (!node?.choices?.length || !node.trigger_question) continue;
    const promptedFlag = 'critical_' + nodeId;
    const resolvedFlag = 'critical_choice_resolved_' + nodeId;
    if (memory.hasFlag(npcId, promptedFlag) && !memory.hasFlag(npcId, resolvedFlag)) {
      return { id: nodeId, node };
    }
  }
  return null;
}

/**
 * Claim a prompted critical decision exactly once. This makes stale and
 * double-clicked callbacks harmless, including after a save/load cycle.
 */
export function claimCriticalDialogueChoice(memory, npcId, criticalNodeId) {
  if (!memory || typeof npcId !== 'string' || !npcId ||
      typeof criticalNodeId !== 'string' || !criticalNodeId) return false;

  const promptedFlag = 'critical_' + criticalNodeId;
  const resolvedFlag = 'critical_choice_resolved_' + criticalNodeId;
  if (!memory.hasFlag(npcId, promptedFlag) || memory.hasFlag(npcId, resolvedFlag)) {
    return false;
  }

  // Persist the claim before applying effects so re-entrant callbacks are harmless.
  memory.setFlag(npcId, resolvedFlag);
  return true;
}
