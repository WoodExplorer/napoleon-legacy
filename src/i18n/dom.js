import { getLocale, t } from './index.js';

export function applyTranslations(root = document) {
  if (root === document) {
    document.documentElement.lang = getLocale();
    document.title = t('meta.title');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('meta.description'));
  }

  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.setAttribute('title', t(element.dataset.i18nTitle));
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}
