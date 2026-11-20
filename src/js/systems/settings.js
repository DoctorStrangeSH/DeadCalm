export const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.5,
  sfxVolume: 0.7,
  textSpeed: 'normal'
});

export function normalizeSettings(input = {}) {
  const volume = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
  };
  return {
    musicVolume: volume(input.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volume(input.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    textSpeed: ['slow', 'normal', 'fast'].includes(input.textSpeed)
      ? input.textSpeed : DEFAULT_SETTINGS.textSpeed
  };
}

export function getTextDelay(speed) {
  return ({ slow: 45, normal: 25, fast: 8 })[speed] || 25;
}
