/**
 * Единая проверка доступа к локациям.
 *
 * locations.json остаётся авторским источником условий.
 * Условие вида day_2 / met_anna считается выполненным только при наличии
 * одноимённого сюжетного флага. Этот модуль не продвигает время и не
 * устанавливает флаги самостоятельно.
 */
export function isLocationUnlocked(location, state) {
  if (!location || typeof location !== 'object') return false;
  if (location.unlocked === true) return true;

  const condition = location.unlock_condition;
  if (typeof condition !== 'string' || !condition.trim()) return false;

  return Boolean(state?.hasFlag?.(condition));
}

export function countUnlockedLocations(locations, state) {
  if (!locations || typeof locations !== 'object') return 0;
  return Object.values(locations).filter(location => isLocationUnlocked(location, state)).length;
}
