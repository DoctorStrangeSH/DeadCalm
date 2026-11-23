const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/**
 * Maps a completed mini-game outcome to an honest result cue.
 * Partial information is neutral: it is neither a clean win nor a total failure.
 */
export function getMiniGameResultCue(outcome) {
  if (outcome === 'success' || outcome === 'clear') return 'success';
  if (outcome === 'failure' || outcome === 'damaged' || outcome === 'unreadable') return 'failure';
  return null;
}

const MUSIC_THEMES = Object.freeze({
  menu: { notes: [55, 82.41, 110, 164.81], melody: [220, 196, 164.81, 146.83, 164.81, 196, 246.94, 220], filter: 680 },
  investigation: { notes: [49, 73.42, 98, 146.83], melody: [196, 174.61, 146.83, 130.81, 146.83, 174.61, 220, 196], filter: 540 },
  tension: { notes: [46.25, 69.3, 92.5, 138.59], melody: [185, 174.61, 138.59, 155.56, 138.59, 116.54, 155.56, 174.61], filter: 430 },
  finale: { notes: [65.41, 98, 130.81, 196], melody: [261.63, 246.94, 196, 220, 261.63, 293.66, 261.63, 196], filter: 760 }
});

const SOUND_CUES = Object.freeze({
  'ui-click': [{ frequency: 520, duration: 0.045, volume: 0.035, wave: 'triangle' }],
  'ui-adjust': [{ frequency: 760, duration: 0.025, volume: 0.018, wave: 'sine' }],
  'dialogue-open': [{ frequency: 110, duration: 0.16, volume: 0.07, wave: 'sine' }, { frequency: 330, delay: 0.035, duration: 0.12, volume: 0.018, wave: 'sine' }],
  'dialogue-close': [{ frequency: 220, duration: 0.11, volume: 0.025, wave: 'sine' }],
  'scene-transition': [{ frequency: 196, duration: 0.12, volume: 0.025, wave: 'sine' }, { frequency: 293.66, delay: 0.06, duration: 0.14, volume: 0.018, wave: 'sine' }],
  'clue-found': [{ frequency: 523.25, duration: 0.22, volume: 0.045 }, { frequency: 659.25, delay: 0.11, duration: 0.24, volume: 0.04 }, { frequency: 783.99, delay: 0.23, duration: 0.32, volume: 0.035 }],
  success: [{ frequency: 523.25, duration: 0.18, volume: 0.04 }, { frequency: 659.25, delay: 0.1, duration: 0.2, volume: 0.04 }, { frequency: 783.99, delay: 0.2, duration: 0.28, volume: 0.04 }],
  failure: [{ frequency: 196, duration: 0.22, volume: 0.045, wave: 'triangle' }, { frequency: 155.56, delay: 0.12, duration: 0.3, volume: 0.04, wave: 'triangle' }],
  'minigame-action': [{ frequency: 420, duration: 0.035, volume: 0.025, wave: 'triangle' }]
});

/**
 * Оригинальная процедурная звуковая система Dead Calm.
 * Все тембры синтезируются Web Audio API — внешние библиотеки и аудиофайлы не нужны.
 */
export const Audio = {
  _ctx: null,
  _masterGain: null,
  _musicGain: null,
  _sfxGain: null,
  _ambientGain: null,
  _musicVoices: [],
  _musicTimer: null,
  _musicTheme: null,
  _musicStep: 0,
  _ambientSource: null,
  _ambientFilter: null,
  _ambientHighPass: null,
  _ambientLfo: null,
  _ambientType: null,
  _ambientBuffer: null,
  _initialized: false,
  _musicVolume: 0.5,
  _sfxVolume: 0.7,
  _pendingScene: null,
  _lastCueAt: new Map(),

  init(settings = {}) {
    if (Number.isFinite(settings.musicVolume)) this._musicVolume = clamp(settings.musicVolume);
    if (Number.isFinite(settings.sfxVolume)) this._sfxVolume = clamp(settings.sfxVolume);
    if (this._initialized) {
      this.setMusicVolume(this._musicVolume);
      this.setSfxVolume(this._sfxVolume);
      return;
    }

    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this._ctx = new Context();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.82;
      this._masterGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this._musicVolume;
      this._musicGain.connect(this._masterGain);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this._masterGain);

      this._ambientGain = this._ctx.createGain();
      this._ambientGain.gain.value = 1;
      this._ambientGain.connect(this._musicGain);

      this._initialized = true;
      if (this._pendingScene) this.setScene(this._pendingScene);
      console.info('[Audio] Процедурная звуковая система готова');
    } catch (error) {
      console.warn('[Audio] Не удалось инициализировать:', error);
    }
  },

  unlock(settings = {}) {
    this.init(settings);
    this.resume();
    if (this._pendingScene) this.setScene(this._pendingScene);
  },

  applySettings(settings = {}) {
    this.setMusicVolume(Number.isFinite(Number(settings.musicVolume)) ? Number(settings.musicVolume) : this._musicVolume);
    this.setSfxVolume(Number.isFinite(Number(settings.sfxVolume)) ? Number(settings.sfxVolume) : this._sfxVolume);
  },

  setMusicVolume(value) {
    if (!Number.isFinite(value)) return;
    this._musicVolume = clamp(value);
    if (this._musicGain?.gain) {
      if (this._ctx && typeof this._musicGain.gain.setTargetAtTime === 'function') {
        this._musicGain.gain.setTargetAtTime(this._musicVolume, (this._ctx?.currentTime ?? 0), 0.04);
      } else {
        this._musicGain.gain.value = this._musicVolume;
      }
    }
  },

  setSfxVolume(value) {
    if (!Number.isFinite(value)) return;
    this._sfxVolume = clamp(value);
    if (this._sfxGain?.gain) {
      if (this._ctx && typeof this._sfxGain.gain.setTargetAtTime === 'function') {
        this._sfxGain.gain.setTargetAtTime(this._sfxVolume, (this._ctx?.currentTime ?? 0), 0.04);
      } else {
        this._sfxGain.gain.value = this._sfxVolume;
      }
    }
  },

  _tone(frequency, startAt, duration, volume, wave = 'sine') {
    if (!this._ctx || !this._sfxGain || this._ctx.state !== 'running') return;
    const oscillator = this._ctx.createOscillator();
    const envelope = this._ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(this._sfxGain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.025);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  },

  playSfx(name) {
    if (!this._initialized || !this._ctx || this._ctx.state !== 'running') return;
    const cue = SOUND_CUES[name];
    if (!cue) return;
    const now = this._ctx.currentTime;
    const last = this._lastCueAt.get(name);
    const cooldown = name === 'ui-adjust' ? 0.075 : 0.025;
    if (last !== undefined && now - last < cooldown) return;
    this._lastCueAt.set(name, now);
    for (const note of cue) {
      this._tone(note.frequency, now + (note.delay || 0), note.duration, note.volume, note.wave || 'sine');
    }
  },

  _stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
    const now = this._ctx?.currentTime || 0;
    for (const voice of this._musicVoices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0.0001, now, 0.22);
          voice.oscillator.onended = () => { voice.oscillator.disconnect(); voice.gain.disconnect(); voice.filter?.disconnect(); };
        voice.oscillator.stop(now + 0.9);
      } catch {}
    }
    this._musicVoices = [];
    this._musicTheme = null;
  },

  playMusic(theme = 'investigation') {
    if (!this._initialized || !this._ctx || this._ctx.state !== 'running') return;
    if (!MUSIC_THEMES[theme]) theme = 'investigation';
    if (this._musicTheme === theme) return;
    this._stopMusic();
    this._musicTheme = theme;
    this._musicStep = 0;
    const profile = MUSIC_THEMES[theme];
    const now = this._ctx.currentTime;
    for (const [index, frequency] of profile.notes.entries()) {
      const oscillator = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      const filter = this._ctx.createBiquadFilter();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.setValueAtTime(index % 2 ? -3 : 3, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.filter, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(index === 0 ? 0.045 : 0.018, now + 0.15, 1.1 + index * 0.18);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this._musicGain);
      oscillator.start(now);
      this._musicVoices.push({ oscillator, gain, filter });
    }
    this._musicTimer = setInterval(() => {
      if (!this._ctx || this._ctx.state !== 'running' || this._musicTheme !== theme) return;
      const note = profile.melody[this._musicStep++ % profile.melody.length];
      const start = this._ctx.currentTime;
      const oscillator = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.012, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
      oscillator.connect(gain);
      gain.connect(this._musicGain);
      oscillator.start(start);
      oscillator.stop(start + 2.7);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }, 3400);
  },

  _createNoiseBuffer() {
    if (this._ambientBuffer || !this._ctx) return this._ambientBuffer;
    const length = Math.floor(this._ctx.sampleRate * 3);
    this._ambientBuffer = this._ctx.createBuffer(1, length, this._ctx.sampleRate);
    const channel = this._ambientBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.025 * white) / 1.025;
      channel[i] = brown * 3.5;
    }
    return this._ambientBuffer;
  },

  startAmbient(type = 'interior') {
    if (!this._initialized || !this._ctx || this._ctx.state !== 'running') return;
    if (this._ambientType === type && this._ambientSource) return;
    this.stopAmbient();
    this._ambientType = type;
    const profiles = {
      rain: { low: 260, high: 4200, level: 0.16, sway: 0.035, rate: 0.07 },
      harbor: { low: 90, high: 1100, level: 0.2, sway: 0.075, rate: 0.035 },
      interior: { low: 180, high: 1500, level: 0.055, sway: 0.012, rate: 0.045 },
      silence: { low: 200, high: 800, level: 0, sway: 0, rate: 0.05 }
    };
    const profile = profiles[type] || profiles.interior;
    const source = this._ctx.createBufferSource();
    const highPass = this._ctx.createBiquadFilter();
    const filter = this._ctx.createBiquadFilter();
    const gain = this._ctx.createGain();
    const lfo = this._ctx.createOscillator();
    const lfoGain = this._ctx.createGain();
    source.buffer = this._createNoiseBuffer();
    source.loop = true;
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(profile.low, this._ctx.currentTime);
    highPass.Q.setValueAtTime(0.45, this._ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile.high, this._ctx.currentTime);
    filter.Q.setValueAtTime(0.35, this._ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, this._ctx.currentTime);
    gain.gain.setTargetAtTime(profile.level, this._ctx.currentTime + 0.1, 1.4);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(profile.rate, this._ctx.currentTime);
    lfoGain.gain.setValueAtTime(profile.sway, this._ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    source.connect(highPass);
    highPass.connect(filter);
    filter.connect(gain);
    gain.connect(this._ambientGain);
    source.start();
    lfo.start();
    this._ambientSource = source;
    this._ambientFilter = filter;
    this._ambientHighPass = highPass;
    this._ambientLfo = lfo;
    this._ambientNodes = { gain, lfoGain };
  },

  stopAmbient() {
    if (!this._ambientSource) {
      this._ambientType = null;
      return;
    }
    const source = this._ambientSource;
    const lfo = this._ambientLfo;
    const highPass = this._ambientHighPass;
    const filter = this._ambientFilter;
    const nodes = this._ambientNodes;
    const now = this._ctx?.currentTime || 0;
    try {
      const gain = this._ambientNodes?.gain;
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.18);
      }
      source.stop(now + 0.85);
      lfo?.stop(now + 0.85);
      source.onended = () => { source.disconnect(); highPass?.disconnect(); filter?.disconnect(); gain?.disconnect(); };
      if (lfo) lfo.onended = () => { lfo.disconnect(); nodes?.lfoGain?.disconnect(); };
    } catch {}
    this._ambientSource = null;
    this._ambientFilter = null;
    this._ambientHighPass = null;
    this._ambientLfo = null;
    this._ambientNodes = null;
    this._ambientType = null;
  },

  setScene(scene) {
    this._pendingScene = scene;
    if (!this._initialized || !this._ctx || this._ctx.state !== 'running') return;
    const profile = {
      'main-menu': ['menu', 'rain'],
      office: ['investigation', 'interior'],
      'city-map': ['investigation', 'rain'],
      'radio-tuning': ['tension', 'interior'],
      'mechanical-repair': ['tension', 'interior'],
      'film-restoration': ['tension', 'interior'],
      port: ['investigation', 'harbor'],
      bar: ['investigation', 'interior'],
      morgue: ['investigation', 'interior'],
      'crime-scene': ['investigation', 'rain'],
      'police-station': ['investigation', 'interior'],
      church: ['investigation', 'interior'],
      'blackwood-mansion': ['investigation', 'interior'],
      'holt-house': ['investigation', 'interior']
    };
    const [theme, ambient] = profile[scene] || ['investigation', 'interior'];
    this.playMusic(theme);
    this.startAmbient(ambient);
    this.playSfx('scene-transition');
  },

  suspend() {
    if (this._ctx && this._ctx.state === 'running') this._ctx.suspend();
  },

  resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      return this._ctx.resume().then(() => {
        if (this._pendingScene) this.setScene(this._pendingScene);
      }).catch(error => { console.warn('[Audio] Не удалось возобновить звук:', error); });
    }
  }
};
