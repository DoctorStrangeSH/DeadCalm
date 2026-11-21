import test from 'node:test';
import assert from 'node:assert/strict';
import { Audio } from '../src/js/core/audio.js';

class FakeParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['ramp', value, time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class FakeNode {
  constructor() { this.connections = []; this.gain = new FakeParam(1); this.frequency = new FakeParam(440); this.detune = new FakeParam(); this.Q = new FakeParam(1); }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; }
}
class FakeOscillator extends FakeNode {
  constructor() { super(); this.type = 'sine'; }
  start(time) { this.startedAt = time; }
  stop(time) { this.stoppedAt = time; }
}
class FakeBufferSource extends FakeNode {
  start() { this.started = true; }
  stop(time) { this.stoppedAt = time; }
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 10; this.sampleRate = 8000; this.destination = {}; this.oscillators = []; this.sources = []; }
  createGain() { return new FakeNode(); }
  createOscillator() { const node = new FakeOscillator(); this.oscillators.push(node); return node; }
  createBiquadFilter() { const node = new FakeNode(); node.type = 'lowpass'; return node; }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { const node = new FakeBufferSource(); this.sources.push(node); return node; }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

function resetAudio() {
  Audio._stopMusic();
  Audio.stopAmbient();
  Object.assign(Audio, {
    _ctx: null, _masterGain: null, _musicGain: null, _sfxGain: null,
    _ambientGain: null, _musicVoices: [], _musicTimer: null, _musicTheme: null,
    _musicStep: 0, _ambientSource: null, _ambientFilter: null, _ambientLfo: null,
    _ambientType: null, _ambientBuffer: null, _ambientNodes: null,
    _initialized: false, _musicVolume: 0.5, _sfxVolume: 0.7, _pendingScene: null,
    _lastCueAt: new Map()
  });
}

test('scene profiles start original procedural music and location ambience', () => {
  const originalWindow = globalThis.window;
  resetAudio();
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    Audio.init({ musicVolume: 0.4, sfxVolume: 0.6 });
    Audio.setScene('main-menu');
    assert.equal(Audio._musicTheme, 'menu');
    assert.equal(Audio._ambientType, 'rain');
    assert.ok(Audio._ambientSource?.started);
    assert.equal(Audio._musicGain.gain.value, 0.4);

    Audio.setScene('port');
    assert.equal(Audio._musicTheme, 'investigation');
    assert.equal(Audio._ambientType, 'harbor');
    assert.equal(Audio._ambientSource?.started, true);
    Audio._stopMusic();
    Audio.stopAmbient();
  } finally {
    resetAudio();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('procedural sound cues create short synthesized tones and ignore unknown cues', () => {
  const originalWindow = globalThis.window;
  resetAudio();
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    Audio.init();
    const before = Audio._ctx.oscillators.length;
    Audio.playSfx('clue-found');
    assert.equal(Audio._ctx.oscillators.length - before, 3);
    const afterKnownCue = Audio._ctx.oscillators.length;
    Audio.playSfx('not-a-real-cue');
    assert.equal(Audio._ctx.oscillators.length, afterKnownCue);
    assert.ok(Audio._ctx.oscillators.slice(before).every(node => node.stoppedAt > node.startedAt));
  } finally {
    resetAudio();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('audio can pause and resume without losing the active scene profile', async () => {
  const originalWindow = globalThis.window;
  resetAudio();
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    Audio.init();
    Audio.setScene('office');
    Audio.suspend();
    assert.equal(Audio._ctx.state, 'suspended');
    await Audio.resume();
    await Promise.resolve();
    assert.equal(Audio._ctx.state, 'running');
    assert.equal(Audio._musicTheme, 'investigation');
    Audio._stopMusic();
    Audio.stopAmbient();
  } finally {
    resetAudio();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
