// Presentation-only reactions: narrative outcomes and trust are still owned by DialogueEngine.
export function resolveDialogueReaction({ type, tone = 'neutral', trustDelta = 0 } = {}) {
  if (type === 'critical_choice') return 'tension';
  if (type !== 'critical_result') return 'neutral';
  if (trustDelta > 0) return 'warmth';
  if (trustDelta < 0) return 'withdrawal';
  if (tone === 'aggressive') return 'tension';
  return 'neutral';
}

// Показываем только фактическое изменение доверия, без догадок о мотивах собеседника.
export function resolveTrustFeedback(trustDelta) {
  if (!Number.isFinite(trustDelta) || trustDelta === 0) return null;
  return {
    tone: trustDelta > 0 ? 'gain' : 'loss',
    label: `Доверие ${trustDelta > 0 ? '+' : '−'}${Math.abs(trustDelta)}`
  };
}
