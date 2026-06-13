import { en } from './locales/en.js';
import { zhCN } from './locales/zh-CN.js';

export const DEFAULT_LOCALE = 'en';

export const LOCALES = {
  en,
  'zh-CN': zhCN,
};

const STORAGE_KEY = 'napoleon_locale';
let currentLocale = loadInitialLocale();
const listeners = new Set();

function loadInitialLocale() {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch {
    // Ignore storage errors and fall back to the product default.
  }
  return DEFAULT_LOCALE;
}

function resolvePath(source, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], source);
}

function interpolate(value, params) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => {
    const replacement = params[name];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!LOCALES[locale]) return false;
  currentLocale = locale;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Locale switching must keep working even when storage is unavailable.
  }
  listeners.forEach(listener => listener(locale));
  return true;
}

export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key, params = {}) {
  const localeValue = resolvePath(LOCALES[currentLocale], key);
  const defaultValue = resolvePath(LOCALES[DEFAULT_LOCALE], key);
  const value = localeValue ?? defaultValue ?? key;
  return interpolate(value, params);
}

export function hasTranslationKey(key, locale = DEFAULT_LOCALE) {
  return resolvePath(LOCALES[locale], key) !== undefined;
}

export function resolveChoiceText(choice) {
  if (!choice) return '';
  if (choice.choiceKey && hasTranslationKey(choice.choiceKey)) return t(choice.choiceKey);
  return choice.choiceText ?? '';
}

export function translateNode(node) {
  if (!node) return node;
  const translated = { ...node };
  if (node.speakerKey) {
    translated.speaker = t(node.speakerKey);
    delete translated.speakerKey;
  }
  if (node.textKey) {
    translated.text = t(node.textKey);
    delete translated.textKey;
  }
  if (node.choices) {
    translated.choices = node.choices.map(choice => ({
      ...choice,
      text: choice.textKey ? t(choice.textKey) : choice.text,
    }));
  }
  return translated;
}

export function getTranslationKeys(locale = DEFAULT_LOCALE) {
  const keys = [];
  const walk = (value, path = []) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => walk(childValue, [...path, childKey]));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((childValue, index) => walk(childValue, [...path, String(index)]));
      return;
    }
    keys.push(path.join('.'));
  };
  walk(LOCALES[locale]);
  return keys;
}
