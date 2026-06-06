export const ENHANCED_SUBTITLES_STORAGE_KEY = 'napoleon_enhanced_subtitles';
export const DEFAULT_ENHANCED_SUBTITLES = false;

export function loadEnhancedSubtitles(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(ENHANCED_SUBTITLES_STORAGE_KEY);
    return saved === null || saved === undefined ? DEFAULT_ENHANCED_SUBTITLES : saved === 'true';
  } catch {
    return DEFAULT_ENHANCED_SUBTITLES;
  }
}

export function saveEnhancedSubtitles(enabled, storage = globalThis.localStorage) {
  const normalized = Boolean(enabled);
  try {
    storage?.setItem(ENHANCED_SUBTITLES_STORAGE_KEY, String(normalized));
  } catch {
    // Accessibility preferences should not block the game if storage is unavailable.
  }
  return normalized;
}
