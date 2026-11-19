const MIN_FREQUENCY = 88.0;
const MAX_FREQUENCY = 108.0;
const TARGET_FREQUENCY = 96.7;
const MIN_FILTER = 0;
const MAX_FILTER = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createRadioSession(config = {}) {
  const target = Number.isFinite(config.targetFrequency)
    ? clamp(config.targetFrequency, MIN_FREQUENCY, MAX_FREQUENCY)
    : TARGET_FREQUENCY;
  return {
    id: typeof config.id === 'string' ? config.id : 'radio-session',
    targetFrequency: target,
    frequency: MIN_FREQUENCY,
    filter: 50,
    attempts: 0,
    locked: false,
    completed: false,
    result: null,
    history: []
  };
}

export function tuneRadio(session, frequency) {
  if (!session || session.completed || !Number.isFinite(frequency)) return null;
  session.frequency = clamp(frequency, MIN_FREQUENCY, MAX_FREQUENCY);
  session.attempts += 1;
  const result = getRadioSignal(session);
  session.history.push({ type: 'tune', frequency: session.frequency, quality: result.quality });
  session.locked = result.quality >= 92 && session.filter >= 35 && session.filter <= 72;
  return result;
}

export function adjustRadioFilter(session, value) {
  if (!session || session.completed || !Number.isFinite(value)) return null;
  session.filter = clamp(value, MIN_FILTER, MAX_FILTER);
  session.attempts += 1;
  const result = getRadioSignal(session);
  session.history.push({ type: 'filter', value: session.filter, quality: result.quality });
  session.locked = result.quality >= 92 && session.filter >= 35 && session.filter <= 72;
  return result;
}

export function getRadioSignal(session) {
  if (!session || !Number.isFinite(session.frequency) || !Number.isFinite(session.filter)) return null;
  const frequencyError = Math.abs(session.frequency - session.targetFrequency);
  const frequencyQuality = clamp(100 - frequencyError * 28, 0, 100);
  const filterPenalty = session.filter < 35
    ? (35 - session.filter) * 0.9
    : session.filter > 72 ? (session.filter - 72) * 0.9 : 0;
  const quality = Math.round(clamp(frequencyQuality - filterPenalty, 0, 100));
  const clarity = quality >= 92 ? 'clear' : quality >= 68 ? 'fragmented' : 'noise';
  return {
    quality,
    clarity,
    frequencyError: Number(frequencyError.toFixed(2)),
    canLock: quality >= 92 && session.filter >= 35 && session.filter <= 72
  };
}

export function completeRadioSession(session) {
  if (!session || session.completed) return null;
  const signal = getRadioSignal(session);
  if (!signal) return null;
  const result = signal.quality >= 92 && session.filter >= 35 && session.filter <= 72
    ? 'clear'
    : signal.quality >= 68 ? 'fragmented' : 'unreadable';
  session.completed = true;
  session.result = result;
  session.history.push({ type: 'finish', result, quality: signal.quality });
  return { result, quality: signal.quality, frequency: session.frequency, filter: session.filter };
}
