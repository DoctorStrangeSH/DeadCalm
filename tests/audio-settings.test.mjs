import test from 'node:test';
import assert from 'node:assert/strict';
import { Audio } from '../src/js/core/audio.js';

test('Audio.init applies saved music and SFX levels to the mixer', () => {
  const original = { ...Audio };
  const originalWindow = globalThis.window;

  class FakeGain {
    constructor() {
      this.gain = { value: 1 };
      this.connections = [];
    }
    connect(target) { this.connections.push(target); }
  }
  class FakeAudioContext {
    constructor() {
      this.destination = {};
      this.state = 'running';
    }
    createGain() { return new FakeGain(); }
  }

  try {
    Object.assign(Audio, {
      _ctx: null,
      _masterGain: null,
      _musicGain: null,
      _sfxGain: null,
      _currentMusic: null,
      _loops: {},
      _initialized: false,
      _musicVolume: 0.5,
      _sfxVolume: 0.7
    });
    globalThis.window = { AudioContext: FakeAudioContext };
    Audio.init({ musicVolume: 0.23, sfxVolume: 0.81 });

    assert.equal(Audio._initialized, true);
    assert.equal(Audio._musicGain.gain.value, 0.23);
    assert.equal(Audio._sfxGain.gain.value, 0.81);
  } finally {
    Object.assign(Audio, original);
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('Audio volume setters clamp values and ignore non-finite input', () => {
  const original = {
    musicGain: Audio._musicGain,
    sfxGain: Audio._sfxGain,
    musicVolume: Audio._musicVolume,
    sfxVolume: Audio._sfxVolume
  };
  Audio._musicGain = { gain: { value: 0.5 } };
  Audio._sfxGain = { gain: { value: 0.5 } };

  try {
    Audio.setMusicVolume(4);
    Audio.setSfxVolume(-2);
    assert.equal(Audio._musicGain.gain.value, 1);
    assert.equal(Audio._sfxGain.gain.value, 0);
    Audio.setMusicVolume(Number.NaN);
    Audio.setSfxVolume(Number.POSITIVE_INFINITY);
    assert.equal(Audio._musicGain.gain.value, 1);
    assert.equal(Audio._sfxGain.gain.value, 0);
  } finally {
    Audio._musicGain = original.musicGain;
    Audio._sfxGain = original.sfxGain;
    Audio._musicVolume = original.musicVolume;
    Audio._sfxVolume = original.sfxVolume;
  }
});
