export const DEFAULT_PERFORMANCE_THRESHOLDS = Object.freeze({
  targetFps: 55,
  warningFps: 42,
  criticalFps: 30,
});

export function getPerformanceStatus(fps, thresholds = DEFAULT_PERFORMANCE_THRESHOLDS) {
  if (!Number.isFinite(fps) || fps <= 0) return 'unknown';
  if (fps < thresholds.criticalFps) return 'critical';
  if (fps < thresholds.warningFps) return 'strained';
  if (fps < thresholds.targetFps) return 'watch';
  return 'stable';
}

export function formatFps(fps) {
  if (!Number.isFinite(fps) || fps <= 0) return '--';
  return String(Math.round(fps));
}

export class FrameRateSampler {
  constructor(options = {}) {
    this.windowMs = options.windowMs ?? 2000;
    this.reportIntervalMs = options.reportIntervalMs ?? 500;
    this.thresholds = options.thresholds ?? DEFAULT_PERFORMANCE_THRESHOLDS;
    this.samples = [];
    this.elapsedMs = 0;
    this.lastReportMs = 0;
  }

  record(deltaSeconds) {
    const deltaMs = Math.max(0, deltaSeconds * 1000);
    if (deltaMs <= 0) return null;

    this.elapsedMs += deltaMs;
    this.samples.push({ timeMs: this.elapsedMs, deltaMs });
    this._trimSamples();

    if (this.elapsedMs - this.lastReportMs < this.reportIntervalMs) return null;
    this.lastReportMs = this.elapsedMs;
    return this.getSnapshot();
  }

  getSnapshot() {
    if (this.samples.length === 0) {
      return {
        fps: 0,
        fpsLabel: '--',
        frameTimeMs: 0,
        sampleCount: 0,
        status: 'unknown',
      };
    }

    const totalMs = this.samples.reduce((sum, sample) => sum + sample.deltaMs, 0);
    const frameTimeMs = totalMs / this.samples.length;
    const fps = frameTimeMs > 0 ? 1000 / frameTimeMs : 0;
    return {
      fps,
      fpsLabel: formatFps(fps),
      frameTimeMs,
      sampleCount: this.samples.length,
      status: getPerformanceStatus(fps, this.thresholds),
    };
  }

  reset() {
    this.samples = [];
    this.elapsedMs = 0;
    this.lastReportMs = 0;
  }

  _trimSamples() {
    const oldestAllowed = this.elapsedMs - this.windowMs;
    while (this.samples.length > 0 && this.samples[0].timeMs < oldestAllowed) {
      this.samples.shift();
    }
  }
}
