export const GRAPHICS_STORAGE_KEY = 'napoleon_graphics_quality';
export const AUTO_GRAPHICS_STORAGE_KEY = 'napoleon_graphics_auto';
export const DEFAULT_GRAPHICS_QUALITY = 'balanced';
export const DEFAULT_AUTO_GRAPHICS_ENABLED = false;
export const GRAPHICS_QUALITY_ORDER = ['low', 'balanced', 'cinematic'];

export const GRAPHICS_PRESETS = Object.freeze({
  low: Object.freeze({
    id: 'low',
    labelKey: 'graphics.low',
    shortLabel: 'L',
    icon: '□',
    pixelRatioCap: 1,
    shadows: false,
    shadowMapType: 'BasicShadowMap',
    shadowMapSize: 512,
    exposure: 1.0,
    bloom: Object.freeze({ enabled: false, strength: 0, radius: 0, threshold: 1 }),
  }),
  balanced: Object.freeze({
    id: 'balanced',
    labelKey: 'graphics.balanced',
    shortLabel: 'B',
    icon: '◐',
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapType: 'PCFShadowMap',
    shadowMapSize: 1024,
    exposure: 1.12,
    bloom: Object.freeze({ enabled: true, strength: 0.2, radius: 0.38, threshold: 0.88 }),
  }),
  cinematic: Object.freeze({
    id: 'cinematic',
    labelKey: 'graphics.cinematic',
    shortLabel: 'C',
    icon: '◆',
    pixelRatioCap: 2,
    shadows: true,
    shadowMapType: 'PCFShadowMap',
    shadowMapSize: 2048,
    exposure: 1.24,
    bloom: Object.freeze({ enabled: true, strength: 0.34, radius: 0.58, threshold: 0.76 }),
  }),
});

export function normalizeGraphicsQuality(quality) {
  return GRAPHICS_PRESETS[quality] ? quality : DEFAULT_GRAPHICS_QUALITY;
}

export function getGraphicsPreset(quality) {
  return GRAPHICS_PRESETS[normalizeGraphicsQuality(quality)];
}

export function getGraphicsPresetOptions() {
  return GRAPHICS_QUALITY_ORDER.map(quality => GRAPHICS_PRESETS[quality]);
}

export function getNextGraphicsQuality(quality) {
  const normalized = normalizeGraphicsQuality(quality);
  const currentIndex = GRAPHICS_QUALITY_ORDER.indexOf(normalized);
  return GRAPHICS_QUALITY_ORDER[(currentIndex + 1) % GRAPHICS_QUALITY_ORDER.length];
}

export function getLowerGraphicsQuality(quality) {
  const normalized = normalizeGraphicsQuality(quality);
  const currentIndex = GRAPHICS_QUALITY_ORDER.indexOf(normalized);
  return GRAPHICS_QUALITY_ORDER[Math.max(0, currentIndex - 1)];
}

export function loadGraphicsQuality(storage = globalThis.localStorage) {
  try {
    return normalizeGraphicsQuality(storage?.getItem(GRAPHICS_STORAGE_KEY));
  } catch {
    return DEFAULT_GRAPHICS_QUALITY;
  }
}

export function saveGraphicsQuality(quality, storage = globalThis.localStorage) {
  const normalized = normalizeGraphicsQuality(quality);
  try {
    storage?.setItem(GRAPHICS_STORAGE_KEY, normalized);
  } catch {
    // Rendering preferences should never block play if storage is unavailable.
  }
  return normalized;
}

export function loadAutoGraphicsEnabled(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(AUTO_GRAPHICS_STORAGE_KEY);
    return saved === null || saved === undefined ? DEFAULT_AUTO_GRAPHICS_ENABLED : saved === 'true';
  } catch {
    return DEFAULT_AUTO_GRAPHICS_ENABLED;
  }
}

export function saveAutoGraphicsEnabled(enabled, storage = globalThis.localStorage) {
  const normalized = Boolean(enabled);
  try {
    storage?.setItem(AUTO_GRAPHICS_STORAGE_KEY, String(normalized));
  } catch {
    // Rendering preferences should never block play if storage is unavailable.
  }
  return normalized;
}
