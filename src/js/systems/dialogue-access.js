/**
 * Guards public dialogue actions as well as the UI. A stale or forged callback
 * must not expose a question from a locked topic or repeat a consumed response.
 */
export function canSelectDialogueTopic(topicId, unlockedTopics) {
  return typeof topicId === 'string' && Array.isArray(unlockedTopics) && unlockedTopics.includes(topicId);
}

export function canAskDialogueQuestion({ topicId, unlockedTopics, askedQuestions, response, isAvailable } = {}) {
  if (!canSelectDialogueTopic(topicId, unlockedTopics)) return false;
  if (!response || typeof response.id !== 'string') return false;
  if (!Array.isArray(askedQuestions) || askedQuestions.includes(response.id)) return false;
  return typeof isAvailable === 'function' && isAvailable(response) === true;
}
