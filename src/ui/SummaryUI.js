import { gameState } from '../core/GameState.js';
import { t, resolveChoiceText } from '../i18n/index.js';
import { getChapters } from './ChapterData.js';

const ENDING_ICONS = {
  crown: '👑',
  sword: '⚔️',
  sunset: '🌅',
};

const SCORE_ICONS = {
  strategy: '🗺️',
  diplomacy: '🤝',
  loyalty: '⚔️',
  legacy: '📜',
  humanity: '❤️',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

export function renderSummary() {
  gameState.computeEnding();
  const endingKey = gameState.ending || 'legacy';
  const endingIcon = ENDING_ICONS[t(`endings.${endingKey}.icon`)] || ENDING_ICONS.sword;

  const scoresEl = document.getElementById('summary-scores');
  if (scoresEl) {
    scoresEl.innerHTML = Object.entries(gameState.scores).map(([key, val]) => `
      <div class="score-card">
        <span class="score-icon">${SCORE_ICONS[key] || '•'}</span>
        <div class="score-name">${escapeHtml(t(`scores.${key}`))}</div>
        <div class="score-value">${Math.round(val)}</div>
        <div class="score-bar-wrap"><div class="score-bar" style="width:${val}%"></div></div>
      </div>`).join('');
  }

  const chapters = getChapters();
  const timelineEl = document.getElementById('summary-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = `<h2>${escapeHtml(t('summary.choicesJourney'))}</h2>` + chapters.map((ch, i) => {
      const chChoices = gameState.getChoicesForChapter(i);
      const choiceText = chChoices.map(c => `"${resolveChoiceText(c)}"`).join('; ') || t('summary.unfinished');
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div>
            <div class="timeline-year">${escapeHtml(ch.year)}</div>
            <div class="timeline-chapter">${escapeHtml(ch.title)}</div>
            <div class="timeline-choice">${escapeHtml(choiceText)}</div>
          </div>
        </div>`;
    }).join('');
  }

  const endingEl = document.getElementById('summary-ending');
  if (endingEl) {
    endingEl.innerHTML = `
      <div class="ending-title">${endingIcon} ${escapeHtml(t(`endings.${endingKey}.title`))}</div>
      <div class="ending-text">${escapeHtml(t(`endings.${endingKey}.text`))}</div>`;
  }
}
