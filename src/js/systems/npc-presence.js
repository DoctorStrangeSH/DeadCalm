import { isLocationUnlocked } from './location-access.js';

/**
 * Resolves whether an authored NPC may appear at their canonical location.
 * This is a story availability gate, not a simulation of movement or schedules.
 */
export function getNpcPresenceAtLocation(character, location, state) {
  if (!character || !location || typeof character !== 'object' || typeof location !== 'object') {
    return { status: 'unknown', available: false, reason: 'Персонаж или локация не найдены.' };
  }
  if (typeof character.id !== 'string' || !character.id.trim() ||
      typeof location.id !== 'string' || !location.id.trim() ||
      character.location !== location.id || location.npc !== character.id) {
    return { status: 'not_here', available: false, reason: 'Персонаж не закреплён за этой локацией.' };
  }
  const match = typeof character.first_appearance === 'string'
    ? /^day_([1-5])$/.exec(character.first_appearance)
    : null;
  if (!match) {
    return { status: 'unknown', available: false, reason: 'Первое появление персонажа не определено в сценарии.' };
  }
  const firstDay = Number(match[1]);
  const currentDay = Number(state?.campaign?.day);
  if (!Number.isInteger(currentDay) || currentDay < firstDay) {
    return {
      status: 'not_yet_introduced',
      available: false,
      firstDay,
      reason: `Персонаж появится не раньше ${firstDay}-го дня расследования.`
    };
  }
  if (!isLocationUnlocked(location, state)) {
    return { status: 'location_locked', available: false, reason: 'Локация пока закрыта по сюжету.' };
  }
  return {
    status: 'available',
    available: true,
    firstDay,
    reason: 'По сценарию персонаж уже может появиться в этой локации.'
  };
}
