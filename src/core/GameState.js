import { DEFAULT_STORY_MODE, normalizeStoryMode } from './StoryMode.js';

/**
 * GameState - global campaign state, save data, chapter progress, and scores.
 */
export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentChapter = 0;
    this.unlockedChapters = [0];
    this.storyMode = DEFAULT_STORY_MODE;
    this.choices = [];       // { chapter, chapterId, nodeId, choiceText, impact }
    this.flags = {};         // custom plot flags
    this.scores = {
      strategy: 0,    // 战略智慧
      diplomacy: 0,   // 外交手腕
      loyalty: 0,     // 部下忠诚
      legacy: 0,      // 历史遗产
      humanity: 0,    // 人道关怀
    };
    this.ending = null;
    this.startTime = Date.now();
  }

  setFlag(key, value) {
    this.flags[key] = value;
  }

  getFlag(key) {
    return this.flags[key];
  }

  setStoryMode(mode) {
    this.storyMode = normalizeStoryMode(mode);
    return this.storyMode;
  }

  getStoryMode() {
    return normalizeStoryMode(this.storyMode);
  }

  recordChoice(chapterIndex, chapterId, nodeId, choiceText, impact) {
    this.choices.push({
      chapterIndex,
      chapterId,
      nodeId,
      choiceText,
      impact,
      storyMode: this.getStoryMode(),
      timestamp: Date.now(),
    });
    if (impact) {
      Object.entries(impact).forEach(([key, val]) => {
        if (this.scores[key] !== undefined) {
          this.scores[key] = Math.max(0, Math.min(100, this.scores[key] + val));
        }
      });
    }
  }

  unlockChapter(index) {
    if (!this.unlockedChapters.includes(index)) {
      this.unlockedChapters.push(index);
    }
  }

  getChoicesForChapter(chapterIndex) {
    return this.choices.filter(c => c.chapterIndex === chapterIndex);
  }

  computeEnding() {
    const avg = Object.values(this.scores).reduce((a, b) => a + b, 0) / Object.keys(this.scores).length;
    if (avg >= 70) {
      this.ending = 'triumph';
    } else if (avg >= 45) {
      this.ending = 'legacy';
    } else {
      this.ending = 'tragedy';
    }
    return this.ending;
  }

  save() {
    try {
      localStorage.setItem('napoleon_save', JSON.stringify({
        currentChapter: this.currentChapter,
        unlockedChapters: this.unlockedChapters,
        storyMode: this.getStoryMode(),
        choices: this.choices,
        scores: this.scores,
        flags: this.flags,
      }));
    } catch (e) { console.warn('Save failed', e); }
  }

  load() {
    try {
      const data = localStorage.getItem('napoleon_save');
      if (!data) return false;
      const parsed = JSON.parse(data);
      Object.assign(this, parsed);
      if (!this.flags) this.flags = {};
      this.storyMode = normalizeStoryMode(this.storyMode);
      return true;
    } catch (e) { return false; }
  }

  hasSave() {
    return !!localStorage.getItem('napoleon_save');
  }

  clear() {
    localStorage.removeItem('napoleon_save');
    this.reset();
  }
}

export const gameState = new GameState();
