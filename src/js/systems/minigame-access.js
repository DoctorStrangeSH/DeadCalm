const DAY_FOUR = 4;

export function canAccessCase001MiniGame(type, gameState) {
  if (!gameState || Number(gameState.campaign?.day || 1) < DAY_FOUR) return false;
  const hasClue = id => typeof gameState.hasClue === 'function' && gameState.hasClue(id);

  switch (type) {
    case 'radio-tuning':
      return true;
    case 'mechanical-repair':
      return hasClue('anna_markus_items');
    case 'film-restoration':
      return hasClue('markus_watch_key');
    default:
      return false;
  }
}
