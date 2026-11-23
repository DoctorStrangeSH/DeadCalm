import { isLocationUnlocked } from './location-access.js';

/**
 * Resolve an NPC's authored first-appearance availability at their canonical location.
 * This is a story gate, not a movement simulator or a recurring schedule.
 */
export function getNpcPresenceAtLocation(character, location, state) {
  if (!character || !location || typeof character !== 'object' || typeof location !== 'object') {
    return { status: 'unknown', available: false, reason: 'Персонаж или локация не найдены.' };
  }
  if (typeof character.id !== 'string' || !character.id.trim() ||
      typeof location.id !== 'string' || !location.id.trim() ||
      character.location !== location.id) {
    return { status: 'not_here', available: false, reason: 'Персонаж не закреплён за этой локацией.' };
  }
  if (!isLocationUnlocked(location, state)) {
    return { status: 'location_locked', available: false, reason: 'Локация пока закрыта по сюжету.' };
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
  return {
    status: 'available',
    available: true,
    firstDay,
    reason: 'По сценарию персонаж уже может появиться в этой локации.'
  };
}
