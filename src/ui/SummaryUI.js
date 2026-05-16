/**
 * SummaryUI - 渲染最终总结页面
 */
import { gameState } from '../core/GameState.js';
import { CHAPTERS } from './ChapterData.js';

const ENDINGS = {
  triumph: {
    title: '帝国的永恒荣耀',
    text: '凭借非凡的智慧与仁德，您不仅在战场上无敌，更以《拿破仑法典》和现代制度铸就了不朽的文明遗产。历史将永远铭记这位既有钢铁意志又有人道关怀的伟大皇帝。',
    emoji: '👑',
  },
  legacy: {
    title: '复杂的历史遗产',
    text: '您的一生充满了辉煌与遗憾。战争的荣耀与苦难并存，改革的光辉与专制的阴影交织。历史学家们将永远争论您的功过，而这正是伟大人物的标志。',
    emoji: '⚔️',
  },
  tragedy: {
    title: '英雄的悲剧落幕',
    text: '野心与力量未能转化为持久的成就。过于依赖武力，忽视了外交与人心。圣赫勒拿岛的孤独流亡，是对无休止征战的历史审判。但即便如此，您依然是改变了世界的人。',
    emoji: '🌅',
  },
};

const SCORE_LABELS = {
  strategy:  { name: '战略智慧', icon: '🗺️' },
  diplomacy: { name: '外交手腕', icon: '🤝' },
  loyalty:   { name: '部下忠诚', icon: '⚔️' },
  legacy:    { name: '历史遗产', icon: '📜' },
  humanity:  { name: '人道关怀', icon: '❤️' },
};

export function renderSummary() {
  gameState.computeEnding();
  const ending = ENDINGS[gameState.ending] || ENDINGS.legacy;

  // 评分卡
  const scoresEl = document.getElementById('summary-scores');
  if (scoresEl) {
    scoresEl.innerHTML = Object.entries(gameState.scores).map(([key, val]) => {
      const info = SCORE_LABELS[key];
      return `
        <div class="score-card">
          <span class="score-icon">${info.icon}</span>
          <div class="score-name">${info.name}</div>
          <div class="score-value">${Math.round(val)}</div>
          <div class="score-bar-wrap"><div class="score-bar" style="width:${val}%"></div></div>
        </div>`;
    }).join('');
  }

  // 时间线
  const timelineEl = document.getElementById('summary-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = '<h2>您的选择历程</h2>' + CHAPTERS.map((ch, i) => {
      const chChoices = gameState.getChoicesForChapter(i);
      const choiceText = chChoices.map(c => `"${c.choiceText}"`).join('；') || '（未完成）';
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div>
            <div class="timeline-year">${ch.year}</div>
            <div class="timeline-chapter">${ch.title}</div>
            <div class="timeline-choice">${choiceText}</div>
          </div>
        </div>`;
    }).join('');
  }

  // 结局
  const endingEl = document.getElementById('summary-ending');
  if (endingEl) {
    endingEl.innerHTML = `
      <div class="ending-title">${ending.emoji} ${ending.title}</div>
      <div class="ending-text">${ending.text}</div>`;
  }
}
