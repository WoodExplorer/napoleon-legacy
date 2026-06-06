export const DEFAULT_INTRO_DURATION_MS = 3400;

export const INTRO_CAMERA_DEFAULTS = {
  startYaw: -0.86,
  endYaw: 0,
  startPitch: -0.52,
  endPitch: -0.18,
  startDistance: 7.2,
  endDistance: 3.8,
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function easeInOutCubic(value) {
  const t = clamp01(value);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2;
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function createIntroState(options = {}) {
  return {
    elapsedMs: 0,
    durationMs: options.durationMs ?? DEFAULT_INTRO_DURATION_MS,
    camera: {
      ...INTRO_CAMERA_DEFAULTS,
      ...(options.camera || {}),
    },
  };
}

export function getIntroCameraPose(state, deltaMs = 0) {
  const elapsedMs = state.elapsedMs + deltaMs;
  const rawProgress = state.durationMs > 0 ? elapsedMs / state.durationMs : 1;
  const progress = clamp01(rawProgress);
  const eased = easeInOutCubic(progress);
  const camera = state.camera;

  return {
    elapsedMs,
    progress,
    complete: progress >= 1,
    yaw: lerp(camera.startYaw, camera.endYaw, eased),
    pitch: lerp(camera.startPitch, camera.endPitch, eased),
    distance: lerp(camera.startDistance, camera.endDistance, eased),
  };
}

export function getIntroOverlayState(progress) {
  const clamped = clamp01(progress);
  return {
    progress: clamped,
    opacity: clamped < 0.78 ? 1 : 1 - ((clamped - 0.78) / 0.22),
    visible: clamped < 1,
  };
}
