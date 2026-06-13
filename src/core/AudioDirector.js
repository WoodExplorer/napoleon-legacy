export const MASTER_VOLUME = 0.42;

const CHAPTER_AMBIENCE = [
  { baseHz: 92, shimmerHz: 184, color: 'warm' },
  { baseHz: 68, shimmerHz: 136, color: 'siege' },
  { baseHz: 110, shimmerHz: 220, color: 'court' },
  { baseHz: 74, shimmerHz: 148, color: 'battle' },
  { baseHz: 54, shimmerHz: 108, color: 'winter' },
  { baseHz: 58, shimmerHz: 116, color: 'dusk' },
  { baseHz: 88, shimmerHz: 176, color: 'island' },
];

const CHAPTER_MUSIC = [
  { rootHz: 220, tempo: 72, mode: [0, 3, 5, 7, 10], motif: [0, 2, 3, 2, 4, 3, 1, 0], bass: [0, -2, -4, -2], chords: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 0, 2]], percussion: 'warm' },
  { rootHz: 196, tempo: 88, mode: [0, 2, 3, 7, 10], motif: [0, 3, 4, 3, 2, 4, 1, 0], bass: [0, -5, -3, -2], chords: [[0, 2, 4], [4, 0, 2], [3, 0, 2], [0, 2, 4]], percussion: 'march' },
  { rootHz: 246.94, tempo: 76, mode: [0, 2, 4, 7, 9], motif: [0, 1, 3, 4, 3, 1, 2, 0], bass: [0, -3, -5, -3], chords: [[0, 2, 4], [2, 4, 0], [3, 0, 2], [4, 2, 0]], percussion: 'court' },
  { rootHz: 174.61, tempo: 92, mode: [0, 2, 5, 7, 10], motif: [0, 2, 4, 5, 4, 2, 3, 1], bass: [0, -5, -2, -7], chords: [[0, 2, 4], [4, 0, 2], [3, 5, 0], [0, 2, 4]], percussion: 'march' },
  { rootHz: 164.81, tempo: 58, mode: [0, 2, 3, 7, 8], motif: [0, 1, 2, 1, 3, 2, 1, 0], bass: [0, -4, -5, -7], chords: [[0, 2, 4], [3, 0, 2], [4, 2, 0], [0, 2, 4]], percussion: 'sparse' },
  { rootHz: 185, tempo: 64, mode: [0, 3, 5, 7, 10], motif: [3, 2, 1, 0, 2, 1, 0, -1], bass: [0, -2, -5, -4], chords: [[0, 2, 4], [4, 0, 2], [1, 3, 5], [3, 5, 0]], percussion: 'sparse' },
  { rootHz: 207.65, tempo: 60, mode: [0, 2, 5, 7, 9], motif: [0, 2, 1, 3, 2, 4, 3, 1], bass: [0, -5, -7, -5], chords: [[0, 2, 4], [2, 4, 0], [3, 0, 2], [0, 2, 4]], percussion: 'warm' },
];

// Percussion feel → which beats get a kick (strong) and a tick (offbeat accent).
const PERCUSSION_FEEL = {
  march:  { kickBeats: [0, 2], tickBeats: [1, 3], kickVol: 0.06, tickVol: 0.03 },
  warm:   { kickBeats: [0],    tickBeats: [2],    kickVol: 0.04, tickVol: 0.02 },
  court:  { kickBeats: [0, 2], tickBeats: [],     kickVol: 0.045, tickVol: 0.02 },
  sparse: { kickBeats: [0],    tickBeats: [],     kickVol: 0.035, tickVol: 0.015 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getChapterAmbienceProfile(index) {
  return CHAPTER_AMBIENCE[index] || CHAPTER_AMBIENCE[0];
}

export function getChapterMusicProfile(index) {
  return CHAPTER_MUSIC[index] || CHAPTER_MUSIC[0];
}

export function getPercussionFeel(profile) {
  return PERCUSSION_FEEL[profile?.percussion] || PERCUSSION_FEEL.warm;
}

// Convert a scale-degree (which may exceed the mode length, wrapping octaves)
// into an absolute frequency relative to the profile root.
function degreeToHz(profile, degree, octave = 0) {
  const modeLength = profile.mode.length;
  const wrapped = ((degree % modeLength) + modeLength) % modeLength;
  const octaveShift = Math.floor(degree / modeLength) + octave;
  const semitones = profile.mode[wrapped] + octaveShift * 12;
  return profile.rootHz * (2 ** (semitones / 12));
}

export function getMusicStepFrequency(profile, step, octave = 0) {
  const scaleIndex = profile.motif[((step % profile.motif.length) + profile.motif.length) % profile.motif.length];
  return degreeToHz(profile, scaleIndex, octave);
}

// The chord (array of frequencies) sustained under a given phrase. Phrases
// advance once per motif length; chords cycle through the profile's progression.
export function getChordFrequencies(profile, phraseIndex, octave = 0) {
  const chords = profile.chords || [[0, 2, 4]];
  const chord = chords[((phraseIndex % chords.length) + chords.length) % chords.length];
  return chord.map(degree => degreeToHz(profile, degree, octave));
}

// A gentle arpeggio voice: walk the current chord's tones one per step.
export function getArpeggioFrequency(profile, phraseIndex, step, octave = 1) {
  const tones = getChordFrequencies(profile, phraseIndex, octave);
  return tones[((step % tones.length) + tones.length) % tones.length];
}

export function getFootstepInterval(isBlocked, speed = 1) {
  if (isBlocked) return Infinity;
  return clamp(0.42 / Math.max(speed, 0.1), 0.24, 0.52);
}

export function getEventSoundProfile(eventName) {
  if (eventName === 'artillery_fire') {
    return { type: 'impact', frequency: 64, duration: 0.85, volume: 0.55 };
  }
  return { type: 'pulse', frequency: 280, duration: 0.18, volume: 0.18 };
}

export class AudioDirector {
  constructor(options = {}) {
    this.audioContextFactory = options.audioContextFactory || (() => {
      const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
      return AudioCtor ? new AudioCtor() : null;
    });
    this.context = null;
    this.master = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.musicBus = null;        // sub-mix: { melody, harmony, pad, perc } gains
    this.padVoices = [];         // currently sustaining pad oscillators
    this.noiseBuffer = null;     // shared buffer for percussion ticks
    this.ambientNodes = [];
    this.musicTimer = null;
    this.musicStep = 0;
    this.activeMusicProfile = null;
    this.enabled = false;
    this.muted = false;
    this.footstepTimer = 0;
  }

  async ensure() {
    if (!this.context) {
      this.context = this.audioContextFactory();
      if (!this.context) return false;
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this.enabled = true;
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.context.currentTime, 0.03);
    }
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  async startChapterAmbience(index) {
    const ready = await this.ensure();
    if (!ready) return false;
    this.stopChapterAmbience();

    const profile = getChapterAmbienceProfile(index);
    const now = this.context.currentTime;
    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.setValueAtTime(0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.16, now + 1.4);
    this.ambientGain.connect(this.master);

    const base = this._createOscillator(profile.baseHz, 'sine', 0.55);
    const shimmer = this._createOscillator(profile.shimmerHz, 'triangle', 0.18);
    [base, shimmer].forEach(node => {
      node.gain.connect(this.ambientGain);
      node.osc.start(now);
      this.ambientNodes.push(node);
    });
    this._startChapterMusic(index);
    return true;
  }

  stopChapterAmbience() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this._stopChapterMusic();
    this.ambientNodes.forEach(node => {
      try {
        node.gain.gain.setTargetAtTime(0, now, 0.08);
        node.osc.stop(now + 0.25);
      } catch {
        // Oscillator may already be stopped.
      }
    });
    this.ambientNodes = [];
    this.ambientGain = null;
  }

  _startChapterMusic(index) {
    if (!this.context || !this.master) return;
    this._stopChapterMusic();
    const now = this.context.currentTime;
    this.activeMusicProfile = getChapterMusicProfile(index);
    this.musicStep = 0;
    this.musicGain = this.context.createGain();
    this.musicGain.gain.setValueAtTime(0, now);
    this.musicGain.gain.linearRampToValueAtTime(0.095, now + 2.2);
    this.musicGain.connect(this.master);

    // Per-layer sub-mix so each voice keeps its own gentle level under the bus.
    const bus = (level) => {
      const g = this.context.createGain();
      g.gain.value = level;
      g.connect(this.musicGain);
      return g;
    };
    this.musicBus = {
      melody: bus(0.6),
      harmony: bus(0.42),
      pad: bus(0.34),
      perc: bus(0.5),
    };
    this._scheduleMusicStep();
  }

  _stopChapterMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this._stopPadVoices(0.2);
    if (this.musicGain && this.context) {
      try {
        this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.12);
      } catch {
        // Gain may already be disconnected by the browser.
      }
    }
    this.musicGain = null;
    this.musicBus = null;
    this.activeMusicProfile = null;
  }

  _scheduleMusicStep() {
    if (!this.activeMusicProfile || !this.musicGain || !this.context) return;
    const profile = this.activeMusicProfile;
    const beatSeconds = 60 / profile.tempo;
    const now = this.context.currentTime;
    const step = this.musicStep;
    const motifLen = profile.motif.length;
    const phraseIndex = Math.floor(step / motifLen);
    const beatInBar = step % 4;

    // Melody — lead voice, lifts an octave on the last step of each phrase.
    const melodyHz = getMusicStepFrequency(profile, step, step % motifLen === motifLen - 1 ? 1 : 0);
    this._playMusicNote(melodyHz, now, beatSeconds * 0.82, 0.05, 'triangle', this.musicBus.melody);

    // Bass — every other step, an octave below the chord root.
    if (step % 2 === 0) {
      const bassOffset = profile.bass[Math.floor(step / 2) % profile.bass.length];
      const bassHz = profile.rootHz * (2 ** (bassOffset / 12)) / 2;
      this._playMusicNote(bassHz, now, beatSeconds * 1.5, 0.05, 'sine', this.musicBus.harmony);
    }

    // Counter-line — a soft arpeggio tracing the current chord, off the melody.
    const arpHz = getArpeggioFrequency(profile, phraseIndex, step, 1);
    this._playMusicNote(arpHz, now + beatSeconds * 0.5, beatSeconds * 0.42, 0.022, 'sine', this.musicBus.harmony);

    // Pad — sustained chord bed, refreshed once per phrase so it cross-fades.
    if (step % motifLen === 0) {
      this._playPadChord(getChordFrequencies(profile, phraseIndex, 0), now, beatSeconds * motifLen);
    }

    // Percussion — kick on strong beats, faint tick on accents.
    const feel = getPercussionFeel(profile);
    if (feel.kickBeats.includes(beatInBar)) this._playKick(now, feel.kickVol);
    if (feel.tickBeats.includes(beatInBar)) this._playTick(now, feel.tickVol);

    this.musicStep = (step + 1) % (motifLen * 2);
    this.musicTimer = setTimeout(() => this._scheduleMusicStep(), beatSeconds * 1000);
  }

  _playMusicNote(frequency, startTime, duration, volume, type, destination = this.musicGain) {
    if (!this.enabled || this.muted || !this.context || !destination) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  // Sustained chord bed. Each note is a lowpass-filtered detuned pair; the whole
  // chord fades in, holds for the phrase, then fades as the next chord arrives.
  _playPadChord(frequencies, startTime, holdSeconds) {
    if (!this.enabled || this.muted || !this.context || !this.musicBus) return;
    this._stopPadVoices(0.8);
    const attack = 0.9;
    const release = 1.1;
    frequencies.forEach(freq => {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.min(1400, freq * 4);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.03, startTime + attack);
      gain.gain.setTargetAtTime(0.0001, startTime + holdSeconds, release);
      filter.connect(gain);
      gain.connect(this.musicBus.pad);
      // Two slightly detuned oscillators per note for warmth.
      [-4, 4].forEach(cents => {
        const osc = this.context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * (2 ** (cents / 1200));
        osc.connect(filter);
        osc.start(startTime);
        osc.stop(startTime + holdSeconds + release + 0.3);
        this.padVoices.push({ osc, gain });
      });
    });
  }

  _stopPadVoices(fade = 0.3) {
    if (!this.context) { this.padVoices = []; return; }
    const now = this.context.currentTime;
    this.padVoices.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, fade);
        osc.stop(now + fade + 0.4);
      } catch {
        // Already stopped.
      }
    });
    this.padVoices = [];
  }

  _playKick(startTime, volume) {
    if (!this.enabled || this.muted || !this.context || !this.musicBus) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, startTime);
    osc.frequency.exponentialRampToValueAtTime(46, startTime + 0.12);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);
    osc.connect(gain);
    gain.connect(this.musicBus.perc);
    osc.start(startTime);
    osc.stop(startTime + 0.24);
  }

  _playTick(startTime, volume) {
    if (!this.enabled || this.muted || !this.context || !this.musicBus) return;
    const buffer = this._getNoiseBuffer();
    if (!buffer) return;
    const src = this.context.createBufferSource();
    src.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    filter.Q.value = 0.8;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus.perc);
    src.start(startTime);
    src.stop(startTime + 0.1);
  }

  _getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!this.context?.createBuffer) return null;
    const len = Math.floor((this.context.sampleRate || 44100) * 0.2);
    const buffer = this.context.createBuffer(1, len, this.context.sampleRate || 44100);
    const data = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < len; i++) {
      // Deterministic LCG noise (avoids Math.random; fine for a tick).
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x3fffffff) - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  updateMovement(delta, { moving = false, blocked = false } = {}) {
    if (!this.enabled || this.muted || !this.context) return;
    if (!moving || blocked) {
      this.footstepTimer = 0;
      return;
    }
    this.footstepTimer += delta;
    const interval = getFootstepInterval(blocked);
    if (this.footstepTimer >= interval) {
      this.footstepTimer = 0;
      this.playFootstep();
    }
  }

  playUi() {
    this._playTone({ frequency: 520, duration: 0.08, volume: 0.08, type: 'triangle' });
  }

  playFootstep() {
    this._playTone({ frequency: 92 + Math.random() * 16, duration: 0.06, volume: 0.13, type: 'square' });
  }

  playEvent(eventName) {
    const profile = getEventSoundProfile(eventName);
    this._playTone({
      frequency: profile.frequency,
      duration: profile.duration,
      volume: profile.volume,
      type: profile.type === 'impact' ? 'sawtooth' : 'triangle',
    });
  }

  _createOscillator(frequency, type, gainValue) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.value = gainValue;
    osc.connect(gain);
    return { osc, gain };
  }

  _playTone({ frequency, duration, volume, type }) {
    if (!this.enabled || this.muted || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
