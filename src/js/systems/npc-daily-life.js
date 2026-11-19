const ACTIVITY_TYPES = new Set(['work','travel','meal','rest','social','private','unknown']);
const DAYS = new Set([1,2,3,4,5,6,7]);

export function createEmptyDailyLife() {
  return { schedules: [], occurrences: [] };
}

function cleanRefs(refs) {
  return Array.isArray(refs) ? [...new Set(refs.filter(value => typeof value === 'string' && value.trim()))] : [];
}

function validSchedule(item) {
  return !!item && typeof item.id === 'string' && !!item.id.trim() &&
    typeof item.npcId === 'string' && !!item.npcId.trim() &&
    ACTIVITY_TYPES.has(item.activity) &&
    Number.isInteger(item.startMinute) && item.startMinute >= 0 && item.startMinute < 1440 &&
    Number.isInteger(item.endMinute) && item.endMinute > item.startMinute && item.endMinute <= 1440 &&
    Array.isArray(item.days) && item.days.length > 0 && item.days.every(day => DAYS.has(day)) &&
    typeof item.locationId === 'string' && !!item.locationId.trim() &&
    typeof item.basis === 'string' && !!item.basis.trim();
}

function validOccurrence(item) {
  return !!item && typeof item.id === 'string' && !!item.id.trim() &&
    typeof item.npcId === 'string' && !!item.npcId.trim() &&
    typeof item.scheduleId === 'string' && !!item.scheduleId.trim() &&
    Number.isInteger(item.day) && item.day > 0 &&
    Number.isInteger(item.minute) && item.minute >= 0 && item.minute < 1440 &&
    typeof item.locationId === 'string' && !!item.locationId.trim() &&
    typeof item.description === 'string' && !!item.description.trim() &&
    typeof item.basis === 'string' && !!item.basis.trim();
}

export function normalizeDailyLife(value) {
  if (!value || typeof value !== 'object') return createEmptyDailyLife();
  const schedules = (Array.isArray(value.schedules) ? value.schedules.filter(validSchedule) : [])
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .map(item => ({ ...item, days: [...new Set(item.days)], sourceRefs: cleanRefs(item.sourceRefs) }));
  const occurrences = (Array.isArray(value.occurrences) ? value.occurrences.filter(validOccurrence) : [])
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .filter(item => {
      const schedule = schedules.find(candidate => candidate.id === item.scheduleId && candidate.npcId === item.npcId);
      return !!schedule && schedule.days.includes(((item.day - 1) % 7) + 1) &&
        item.minute >= schedule.startMinute && item.minute < schedule.endMinute &&
        item.locationId === schedule.locationId;
    })
    .map(item => ({ ...item, sourceRefs: cleanRefs(item.sourceRefs) }));
  return { schedules, occurrences };
}

/** Add only an authored, source-backed schedule. No schedule is inferred from a location or job title. */
export function upsertNpcSchedule(life, input) {
  if (!life || !Array.isArray(life.schedules) || !input || typeof input !== 'object') return null;
  const schedule = {
    id: typeof input.id === 'string' ? input.id.trim() : '',
    npcId: typeof input.npcId === 'string' ? input.npcId.trim() : '',
    activity: input.activity,
    startMinute: input.startMinute,
    endMinute: input.endMinute,
    days: Array.isArray(input.days) ? [...new Set(input.days)] : [],
    locationId: typeof input.locationId === 'string' ? input.locationId.trim() : '',
    basis: typeof input.basis === 'string' ? input.basis.trim() : '',
    sourceRefs: cleanRefs(input.sourceRefs)
  };
  if (!validSchedule(schedule)) return null;
  const index = life.schedules.findIndex(item => item.id === schedule.id);
  if (index === -1) life.schedules.push(schedule); else life.schedules[index] = schedule;
  return { ...schedule, days: [...schedule.days], sourceRefs: [...schedule.sourceRefs] };
}

export function getNpcScheduleAt(life, npcId, day, minute) {
  if (!life || !Array.isArray(life.schedules) || typeof npcId !== 'string' ||
      !Number.isInteger(day) || !DAYS.has(((day - 1) % 7) + 1) ||
      !Number.isInteger(minute) || minute < 0 || minute >= 1440) return null;
  const weekday = ((day - 1) % 7) + 1;
  const matches = life.schedules.filter(item => item.npcId === npcId &&
    item.days.includes(weekday) && minute >= item.startMinute && minute < item.endMinute);
  return matches.length === 1 ? { ...matches[0], days: [...matches[0].days], sourceRefs: [...matches[0].sourceRefs] } : null;
}

/** Record a witnessed/discovered occurrence. Merely passing time never fabricates an event. */
export function recordNpcOccurrence(life, input) {
  if (!life || !Array.isArray(life.occurrences) || !input || typeof input !== 'object') return null;
  const occurrence = {
    id: typeof input.id === 'string' ? input.id.trim() : '',
    npcId: typeof input.npcId === 'string' ? input.npcId.trim() : '',
    scheduleId: typeof input.scheduleId === 'string' ? input.scheduleId.trim() : '',
    day: input.day,
    minute: input.minute,
    locationId: typeof input.locationId === 'string' ? input.locationId.trim() : '',
    description: typeof input.description === 'string' ? input.description.trim() : '',
    basis: typeof input.basis === 'string' ? input.basis.trim() : '',
    sourceRefs: cleanRefs(input.sourceRefs)
  };
  if (!validOccurrence(occurrence) || life.occurrences.some(item => item.id === occurrence.id)) return null;
  const schedule = life.schedules.find(item => item.id === occurrence.scheduleId && item.npcId === occurrence.npcId);
  if (!schedule || !schedule.days.includes(((occurrence.day - 1) % 7) + 1) ||
      occurrence.minute < schedule.startMinute || occurrence.minute >= schedule.endMinute ||
      schedule.locationId !== occurrence.locationId) return null;
  life.occurrences.push(occurrence);
  return { ...occurrence, sourceRefs: [...occurrence.sourceRefs] };
}

export function getNpcOccurrences(life, npcId) {
  if (!life || !Array.isArray(life.occurrences)) return [];
  return life.occurrences.filter(item => item.npcId === npcId)
    .map(item => ({ ...item, sourceRefs: [...item.sourceRefs] }));
}
