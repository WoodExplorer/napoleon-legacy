import { getLowerGraphicsQuality } from './GraphicsSettings.js';

export const DEFAULT_AUTO_QUALITY_OPTIONS = Object.freeze({
  downgradeReports: 6,
  cooldownReports: 12,
  pressureStatuses: Object.freeze(['critical', 'strained']),
});

export class AutoQualityController {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_AUTO_QUALITY_OPTIONS,
      ...options,
      pressureStatuses: options.pressureStatuses ?? DEFAULT_AUTO_QUALITY_OPTIONS.pressureStatuses,
    };
    this.reset();
  }

  record(snapshot, currentQuality) {
    if (!snapshot) return null;

    if (this.cooldownReports > 0) {
      this.cooldownReports -= 1;
      return null;
    }

    if (!this.options.pressureStatuses.includes(snapshot.status)) {
      this.pressureReports = Math.max(0, this.pressureReports - 1);
      return null;
    }

    this.pressureReports += 1;
    if (this.pressureReports < this.options.downgradeReports) return null;

    this.pressureReports = 0;
    this.cooldownReports = this.options.cooldownReports;
    const nextQuality = getLowerGraphicsQuality(currentQuality);
    if (nextQuality === currentQuality) return null;

    return {
      from: currentQuality,
      to: nextQuality,
      reason: snapshot.status,
      fps: snapshot.fps,
    };
  }

  reset() {
    this.pressureReports = 0;
    this.cooldownReports = 0;
  }
}
