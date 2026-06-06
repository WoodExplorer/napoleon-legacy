/**
 * main.js - 游戏入口，UI流程管理
 */
import './style.css';
import { GameEngine } from './core/GameEngine.js';
import { gameState } from './core/GameState.js';
import { MobileJoystick } from './controls/InputController.js';
import { CHAPTERS, getChapter } from './ui/ChapterData.js';
import { renderSummary } from './ui/SummaryUI.js';
import { applyTranslations } from './i18n/dom.js';
import { getLocale, onLocaleChange, setLocale, t } from './i18n/index.js';
import { Chapter1Scene } from './scenes/Chapter1Scene.js';
import { Chapter2Scene } from './scenes/Chapter2Scene.js';
import { Chapter3Scene } from './scenes/Chapter3Scene.js';
import { Chapter4Scene } from './scenes/Chapter4Scene.js';
import { Chapter5Scene, Chapter6Scene } from './scenes/Chapter56Scene.js';
import { Chapter7Scene } from './scenes/Chapter7Scene.js';

const SCENE_CLASSES = [
  Chapter1Scene, Chapter2Scene, Chapter3Scene, Chapter4Scene,
  Chapter5Scene, Chapter6Scene, Chapter7Scene,
];

// ---- DOM Elements ----
const $ = id => document.getElementById(id);
const loadingScreen = $('loading-screen');
const mainMenu = $('main-menu');
const chapterSelect = $('chapter-select');
const gameCanvas = $('game-canvas');
const gameUI = $('game-ui');
const finalSummary = $('final-summary');
const aboutScreen = $('about-screen');
const pauseMenu = $('pause-menu');
const chapterComplete = $('chapter-complete');
const mobileControls = $('mobile-controls');

let engine = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function syncLocaleButtons() {
  document.querySelectorAll('[data-locale]').forEach(button => {
    const active = button.dataset.locale === getLocale();
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function refreshVisibleText() {
  applyTranslations();
  syncLocaleButtons();
  if (!chapterSelect.classList.contains('hidden')) renderChapterSelect();
  if (!finalSummary.classList.contains('hidden')) renderSummary();
  if (!gameUI.classList.contains('hidden')) {
    const ch = getChapter(gameState.currentChapter);
    $('hud-chapter-num').textContent = ch.number;
    $('hud-chapter-name').textContent = ch.title;
  }
}

// ---- Loading Sequence ----
function simulateLoading() {
  const bar = $('loading-bar');
  const txt = $('loading-text');
  const steps = [
    [20, t('loading.steps.0')],
    [45, t('loading.steps.1')],
    [65, t('loading.steps.2')],
    [80, t('loading.steps.3')],
    [95, t('loading.steps.4')],
    [100, t('loading.steps.5')],
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      setTimeout(showMainMenu, 600);
      return;
    }
    const [pct, msg] = steps[i++];
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = msg;
    setTimeout(tick, 400);
  };
  setTimeout(tick, 300);
}

function showMainMenu() {
  loadingScreen.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  if (gameState.hasSave()) $('btn-continue')?.classList.remove('hidden');
}

// ---- Chapter Select ----
function renderChapterSelect() {
  const list = $('chapter-list');
  if (!list) return;
  const isDev = import.meta.env.DEV; // Vite env flag
  list.innerHTML = CHAPTERS.map((ch, i) => {
    const unlocked = isDev || gameState.unlockedChapters.includes(i);
    const done = gameState.getChoicesForChapter(i).length > 0;
    const localized = getChapter(i);
    return `
      <div class="chapter-card ${unlocked ? '' : 'locked'}" data-idx="${i}">
        <div class="chapter-num">${escapeHtml(localized.number)}</div>
        <div class="chapter-title">${escapeHtml(localized.title)}</div>
        <div class="chapter-year">${escapeHtml(localized.year)}</div>
        <div class="chapter-desc">${escapeHtml(localized.desc)}</div>
        <div class="chapter-status">${done ? '✅' : unlocked ? '▶' : '🔒'}</div>
      </div>`;
  }).join('');

  list.querySelectorAll('.chapter-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      startChapter(idx);
    });
  });
}

// ---- Start Chapter ----
function startChapter(index) {
  gameState.currentChapter = index;

  // Hide all UI
  [mainMenu, chapterSelect, finalSummary, aboutScreen].forEach(el => el?.classList.add('hidden'));
  gameCanvas.classList.remove('hidden');
  gameUI.classList.remove('hidden');
  chapterComplete.classList.add('hidden');
  pauseMenu.classList.add('hidden');

  // Update HUD
  const ch = getChapter(index);
  $('hud-chapter-num').textContent = ch.number;
  $('hud-chapter-name').textContent = ch.title;

  // Create engine if needed
  let pe;
  if (!engine) {
    engine = new GameEngine(gameCanvas);
    engine.setupDialogue({
      box: $('dialogue-box'),
      speaker: $('dialogue-speaker'),
      text: $('dialogue-text'),
      choices: $('dialogue-choices'),
      portrait: $('portrait-canvas'),
      skipHint: document.querySelector('.dialogue-skip-hint'),
    });
    setupMobileControls();
    setupPauseMenu();
  }

  // Use dynamic import or static import for PlotEngine and plotData
  // Since we use ES modules, we can import dynamically
  import('./core/PlotEngine.js').then(({ PlotEngine }) => {
    import('./data/plotData.js').then(({ plotData }) => {
      pe = new PlotEngine(plotData, gameState);
      engine.setPlotEngine(pe, gameState);
      
      pe.onChapterEnd = (nextChapterIndex) => {
         engine.pause();
         showChapterComplete(index);
      };

      const SceneClass = SCENE_CLASSES[index];
      const scene = new SceneClass();
      engine.loadChapterScene(scene);
      engine.start();

      // Start plot engine if this chapter has a start node
      const startNodeId = `ch${index + 1}_start`;
      if (plotData[startNodeId]) {
         pe.start(startNodeId);
      } else {
         // Fallback legacy setup
         engine.onChapterComplete = () => showChapterComplete(index);
      }
    });
  });

  // Show mobile on touch device
  if ('ontouchstart' in window) {
    mobileControls.classList.remove('hidden');
    $('mobile-interact')?.classList.remove('hidden');
  }
}

// ---- Chapter Complete ----
function showChapterComplete(index) {
  engine.pause();
  const ch = getChapter(index);
  const isLast = index >= CHAPTERS.length - 1;

  $('complete-chapter-name').textContent = `✅ ${t('chapterComplete.title', { chapter: ch.title })}`;
  $('complete-summary').textContent = ch.desc;

  const choicesEl = $('complete-choices');
  const choices = gameState.getChoicesForChapter(index);
  choicesEl.innerHTML = choices.length
    ? `<h4 class="choice-record-title">${escapeHtml(t('chapterComplete.choicesTitle'))}</h4>` +
      choices.map(c => `<div class="choice-item"><span class="choice-label">•</span><span>${escapeHtml(c.choiceText)}</span></div>`).join('')
    : `<p class="choice-record-empty">${escapeHtml(t('chapterComplete.noChoices'))}</p>`;

  const nextBtn = $('btn-next-chapter');
  const summaryBtn = $('btn-view-summary');
  if (isLast) {
    nextBtn.classList.add('hidden');
    summaryBtn.classList.remove('hidden');
    summaryBtn.onclick = () => { chapterComplete.classList.add('hidden'); showFinalSummary(); };
  } else {
    nextBtn.classList.remove('hidden');
    summaryBtn.classList.add('hidden');
    nextBtn.onclick = () => {
      chapterComplete.classList.add('hidden');
      const next = index + 1;
      gameState.unlockChapter(next);
      gameState.save();
      engine.resume();
      startChapter(next);
    };
  }

  chapterComplete.classList.remove('hidden');
}

// ---- Final Summary ----
function showFinalSummary() {
  engine.stop();
  gameCanvas.classList.add('hidden');
  gameUI.classList.add('hidden');
  finalSummary.classList.remove('hidden');
  renderSummary();
}

// ---- Pause Menu ----
function setupPauseMenu() {
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && engine) {
      if (engine.isPaused) { engine.resume(); pauseMenu.classList.add('hidden'); }
      else { engine.pause(); pauseMenu.classList.remove('hidden'); }
    }
  });
  $('btn-resume')?.addEventListener('click', () => {
    engine.resume(); pauseMenu.classList.add('hidden');
  });
  $('btn-chapter-menu')?.addEventListener('click', () => {
    engine.stop(); pauseMenu.classList.add('hidden');
    gameCanvas.classList.add('hidden'); gameUI.classList.add('hidden');
    chapterSelect.classList.remove('hidden');
    renderChapterSelect();
  });
  $('btn-main-menu')?.addEventListener('click', () => {
    engine.stop(); pauseMenu.classList.add('hidden');
    gameCanvas.classList.add('hidden'); gameUI.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });
}

// ---- Mobile Controls ----
function setupMobileControls() {
  const moveBase = $('joystick-move');
  const moveThumb = $('move-thumb');
  const lookBase = $('joystick-look');
  const lookThumb = $('look-thumb');

  if (moveBase && moveThumb) {
    new MobileJoystick(moveBase, moveThumb, (x, y) => engine?.setMobileMoveVector(x, y));
  }
  if (lookBase && lookThumb) {
    new MobileJoystick(lookBase, lookThumb, (x, y) => engine?.setMobileLookVector(x, y));
  }
  $('mobile-interact')?.addEventListener('touchstart', e => {
    e.preventDefault(); engine?.triggerInteract();
  }, { passive: false });
}

// ---- Menu Buttons ----
$('btn-new-game')?.addEventListener('click', () => {
  gameState.clear();
  mainMenu.classList.add('hidden');
  chapterSelect.classList.remove('hidden');
  renderChapterSelect();
});

$('btn-continue')?.addEventListener('click', () => {
  if (gameState.load()) {
    mainMenu.classList.add('hidden');
    chapterSelect.classList.remove('hidden');
    renderChapterSelect();
  }
});

$('btn-about')?.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  aboutScreen.classList.remove('hidden');
});

$('btn-back-from-about')?.addEventListener('click', () => {
  aboutScreen.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

$('btn-back-menu')?.addEventListener('click', () => {
  chapterSelect.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

$('btn-restart')?.addEventListener('click', () => {
  gameState.clear();
  finalSummary.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  $('btn-continue')?.classList.add('hidden');
});

document.querySelectorAll('[data-locale]').forEach(button => {
  button.addEventListener('click', () => setLocale(button.dataset.locale));
});

onLocaleChange(refreshVisibleText);

// ---- Boot ----
refreshVisibleText();
simulateLoading();
