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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getChapterAmbienceProfile(index) {
  return CHAPTER_AMBIENCE[index] || CHAPTER_AMBIENCE[0];
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
    this.ambientNodes = [];
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
    return true;
  }

  stopChapterAmbience() {
    if (!this.context) return;
    const now = this.context.currentTime;
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
