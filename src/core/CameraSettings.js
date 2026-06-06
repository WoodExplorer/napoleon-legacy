export const CAMERA_SENSITIVITY_STORAGE_KEY = 'napoleon_camera_sensitivity';
export const DEFAULT_CAMERA_SENSITIVITY = 1;
export const CAMERA_SENSITIVITY_MIN = 0.5;
export const CAMERA_SENSITIVITY_MAX = 1.5;

export function normalizeCameraSensitivity(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_CAMERA_SENSITIVITY;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CAMERA_SENSITIVITY;
  return Math.min(CAMERA_SENSITIVITY_MAX, Math.max(CAMERA_SENSITIVITY_MIN, numeric));
}

export function formatCameraSensitivity(value) {
  return `${Math.round(normalizeCameraSensitivity(value) * 100)}%`;
}

export function loadCameraSensitivity(storage = globalThis.localStorage) {
  try {
    return normalizeCameraSensitivity(storage?.getItem(CAMERA_SENSITIVITY_STORAGE_KEY));
  } catch {
    return DEFAULT_CAMERA_SENSITIVITY;
  }
}

export function saveCameraSensitivity(value, storage = globalThis.localStorage) {
  const normalized = normalizeCameraSensitivity(value);
  try {
    storage?.setItem(CAMERA_SENSITIVITY_STORAGE_KEY, String(normalized));
  } catch {
    // Camera feel should keep working even when storage is unavailable.
  }
  return normalized;
}
