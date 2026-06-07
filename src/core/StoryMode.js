export const STORY_MODES = [
  {
    id: 'essential',
    rank: 0,
    labelKey: 'storyMode.essential.title',
    descriptionKey: 'storyMode.essential.desc',
  },
  {
    id: 'guided',
    rank: 1,
    labelKey: 'storyMode.guided.title',
    descriptionKey: 'storyMode.guided.desc',
  },
  {
    id: 'free',
    rank: 2,
    labelKey: 'storyMode.free.title',
    descriptionKey: 'storyMode.free.desc',
  },
];

export const DEFAULT_STORY_MODE = 'guided';

const RANK_BY_MODE = Object.fromEntries(STORY_MODES.map(mode => [mode.id, mode.rank]));

export function normalizeStoryMode(mode) {
  return RANK_BY_MODE[mode] === undefined ? DEFAULT_STORY_MODE : mode;
}

export function getStoryModeRank(mode) {
  return RANK_BY_MODE[normalizeStoryMode(mode)];
}

export function getStoryModeOptions() {
  return STORY_MODES.map(mode => ({ ...mode }));
}

export function isStoryModeAllowed(currentMode, rule = {}) {
  const rank = getStoryModeRank(currentMode);
  if (rule.mode && normalizeStoryMode(rule.mode) !== normalizeStoryMode(currentMode)) return false;
  if (rule.storyModes && !rule.storyModes.includes(normalizeStoryMode(currentMode))) return false;
  if (rule.minMode && rank < getStoryModeRank(rule.minMode)) return false;
  if (rule.maxMode && rank > getStoryModeRank(rule.maxMode)) return false;
  return true;
}
