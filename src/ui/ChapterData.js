import { t } from '../i18n/index.js';

export const CHAPTERS = [
  { id: 'chapter1', index: 0, key: 'chapters.items.0' },
  { id: 'chapter2', index: 1, key: 'chapters.items.1' },
  { id: 'chapter3', index: 2, key: 'chapters.items.2' },
  { id: 'chapter4', index: 3, key: 'chapters.items.3' },
  { id: 'chapter5', index: 4, key: 'chapters.items.4' },
  { id: 'chapter6', index: 5, key: 'chapters.items.5' },
  { id: 'chapter7', index: 6, key: 'chapters.items.6' },
];

export function getChapter(index) {
  const chapter = CHAPTERS[index];
  return {
    ...chapter,
    number: t(`${chapter.key}.number`),
    title: t(`${chapter.key}.title`),
    year: t(`${chapter.key}.year`),
    desc: t(`${chapter.key}.desc`),
  };
}

export function getChapters() {
  return CHAPTERS.map((_, index) => getChapter(index));
}
