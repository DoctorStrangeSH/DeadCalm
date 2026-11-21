import { Events } from './events.js';

/**
 * Система управления звуком.
 * Поддерживает фоновую музыку, звуковые эффекты и атмосферу.
 */
export const Audio = {
  _ctx: null,         // AudioContext
  _masterGain: null,  // Главная громкость
  _musicGain: null,   // Громкость музыки
  _sfxGain: null,     // Громкость эффектов
  _currentMusic: null,
  _musicVolume: 0.5,
  _sfxVolume: 0.7,
  _loops: {},
  _initialized: false,

  /**
   * Инициализация (должна быть вызвана после взаимодействия пользователя)
   */
  init(settings = {}) {
    if (Number.isFinite(settings.musicVolume)) this._musicVolume = Math.max(0, Math.min(1, settings.musicVolume));
    if (Number.isFinite(settings.sfxVolume)) this._sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
    if (this._initialized) {
      this.setMusicVolume(this._musicVolume);
      this.setSfxVolume(this._sfxVolume);
      return;
    }

    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.connect(this._masterGain);
      this._musicGain.gain.value = this._musicVolume;

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.connect(this._masterGain);
      this._sfxGain.gain.value = this._sfxVolume;

      this._initialized = true;
      console.log('[Audio] Инициализирован');
    } catch (error) {
      console.warn('[Audio] Не удалось инициализировать:', error);
    }
  },

  /**
   * Установить громкость музыки
   */
  setMusicVolume(value) {
    if (!Number.isFinite(value)) return;
    this._musicVolume = Math.max(0, Math.min(1, value));
    if (this._musicGain) this._musicGain.gain.value = this._musicVolume;
  },

  /**
   * Установить громкость эффектов
   */
  setSfxVolume(value) {
    if (!Number.isFinite(value)) return;
    this._sfxVolume = Math.max(0, Math.min(1, value));
    if (this._sfxGain) this._sfxGain.gain.value = this._sfxVolume;
  },

  /**
   * Воспроизвести звуковой эффект
   */
  playSfx(name) {
    if (!this._initialized) return;
    // Заглушка: звуки будут добавлены позже
    console.log(`[Audio] SFX: ${name}`);
  },

  /**
   * Запустить фоновый шум (дождь, город)
   */
  startAmbient(type) {
    if (!this._initialized) return;
    console.log(`[Audio] Ambient started: ${type}`);
  },

  /**
   * Остановить фоновый шум
   */
  stopAmbient() {
    console.log('[Audio] Ambient stopped');
  },

  /** Приостановить всё */
  suspend() {
    if (this._ctx && this._ctx.state === 'running') {
      this._ctx.suspend();
    }
  },

  /** Возобновить */
  resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }
};