/**
 * main.js - 游戏入口，UI流程管理
 */
import './style.css';
import { gameState } from './core/GameState.js';
import { MobileJoystick } from './controls/InputController.js';
import { CHAPTERS, getChapter } from './ui/ChapterData.js';
import { renderSummary } from './ui/SummaryUI.js';
import { applyTranslations } from './i18n/dom.js';
import { getLocale, onLocaleChange, setLocale, t } from './i18n/index.js';
import { loadChapterSceneClass } from './scenes/SceneRegistry.js';
import {
  getGraphicsPreset,
  getGraphicsPresetOptions,
  loadAutoGraphicsEnabled,
  loadGraphicsQuality,
  saveAutoGraphicsEnabled,
  saveGraphicsQuality,
} from './core/GraphicsSettings.js';

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
const settingsPanel = $('settings-panel');
const chapterComplete = $('chapter-complete');
const mobileControls = $('mobile-controls');

let engine = null;
let engineReadyPromise = null;
let settingsReturnTarget = 'main';

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
  if (!settingsPanel.classList.contains('hidden')) renderSettingsPanel();
  if (!gameUI.classList.contains('hidden')) {
    const ch = getChapter(gameState.currentChapter);
    $('hud-chapter-num').textContent = ch.number;
    $('hud-chapter-name').textContent = ch.title;
    engine?.refreshHudControls();
  }
}

function getActiveGraphicsQuality() {
  return engine?.getGraphicsQuality?.() ?? loadGraphicsQuality();
}

function getAutoGraphicsEnabled() {
  return engine?.getAutoGraphicsEnabled?.() ?? loadAutoGraphicsEnabled();
}

function renderSettingsPanel() {
  const list = $('settings-graphics-options');
  const autoToggle = $('settings-auto-quality');
  if (!list || !autoToggle) return;
  const activeQuality = getActiveGraphicsQuality();
  const autoEnabled = getAutoGraphicsEnabled();
  list.innerHTML = getGraphicsPresetOptions().map(preset => `
    <button
      type="button"
      class="settings-option ${preset.id === activeQuality ? 'active' : ''}"
      data-graphics-quality="${escapeHtml(preset.id)}"
      aria-pressed="${preset.id === activeQuality}"
    >
      <span aria-hidden="true">${escapeHtml(preset.icon)}</span>
      <span>${escapeHtml(t(preset.labelKey))}</span>
    </button>
  `).join('');

  list.querySelectorAll('[data-graphics-quality]').forEach(button => {
    button.addEventListener('click', () => {
      setGraphicsQualityFromSettings(button.dataset.graphicsQuality);
    });
  });

  autoToggle.classList.toggle('active', autoEnabled);
  autoToggle.setAttribute('aria-pressed', String(autoEnabled));
  autoToggle.querySelector('.settings-switch-state').textContent = t(autoEnabled ? 'settings.on' : 'settings.off');
}

function setGraphicsQualityFromSettings(quality) {
  const preset = engine
    ? engine.setGraphicsQuality(quality, { persist: true })
    : getGraphicsPreset(saveGraphicsQuality(quality));
  renderSettingsPanel();
  return preset;
}

function setAutoGraphicsFromSettings(enabled) {
  const value = engine
    ? engine.setAutoGraphicsEnabled(enabled, { persist: true })
    : saveAutoGraphicsEnabled(enabled);
  renderSettingsPanel();
  return value;
}

function openSettingsPanel(returnTarget = 'main') {
  settingsReturnTarget = returnTarget;
  renderSettingsPanel();
  settingsPanel.classList.remove('hidden');
  if (returnTarget === 'pause') pauseMenu.classList.add('hidden');
}

function closeSettingsPanel() {
  settingsPanel.classList.add('hidden');
  if (settingsReturnTarget === 'pause' && engine?.isPaused && !gameUI.classList.contains('hidden')) {
    pauseMenu.classList.remove('hidden');
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

function showChapterLoading(message = t('loading.chapter')) {
  loadingScreen.classList.remove('hidden');
  const bar = $('loading-bar');
  const txt = $('loading-text');
  if (bar) bar.style.width = '72%';
  if (txt) txt.textContent = message;
}

function hideChapterLoading() {
  loadingScreen.classList.add('hidden');
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
async function ensureEngine() {
  if (engine) return engine;
  if (!engineReadyPromise) {
    engineReadyPromise = import('./core/GameEngine.js').then(({ GameEngine }) => {
      const created = new GameEngine(gameCanvas);
      created.setupDialogue({
        box: $('dialogue-box'),
        speaker: $('dialogue-speaker'),
        text: $('dialogue-text'),
        choices: $('dialogue-choices'),
        portrait: $('portrait-canvas'),
        skipHint: document.querySelector('.dialogue-skip-hint'),
      });
      created.setupMissionTracker({
        panel: $('mission-panel'),
        list: $('mission-list'),
        progressFill: $('mission-progress-fill'),
        progressText: $('mission-progress-text'),
      });
      created.setupCinematicIntro({
        overlay: $('cinematic-intro'),
        kicker: $('cinematic-kicker'),
        number: $('cinematic-number'),
        year: $('cinematic-year'),
        title: $('cinematic-title'),
        desc: $('cinematic-desc'),
        progressFill: $('cinematic-progress-fill'),
        skip: $('cinematic-skip'),
      });
      created.setupAudioControls({
        toggle: $('audio-toggle'),
      });
      created.setupGraphicsControls({
        toggle: $('graphics-quality-toggle'),
      });
      created.setupPerformanceHud({
        badge: $('performance-badge'),
        fps: $('performance-fps'),
        quality: $('performance-quality'),
        auto: $('performance-auto'),
        recommendation: $('performance-recommendation'),
        recommendationText: $('performance-recommendation-text'),
        enableAuto: $('btn-enable-auto-quality'),
        dismissRecommendation: $('btn-dismiss-performance-recommendation'),
      });
      setupMobileControls();
      setupPauseMenu();
      engine = created;
      return engine;
    });
  }
  return engineReadyPromise;
}

// ---- Start Chapter ----
async function startChapter(index) {
  gameState.currentChapter = index;
  showChapterLoading();

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

  try {
    const [
      readyEngine,
      { PlotEngine },
      { plotData },
      SceneClass,
    ] = await Promise.all([
      ensureEngine(),
      import('./core/PlotEngine.js'),
      import('./data/plotData.js'),
      loadChapterSceneClass(index),
    ]);

    const pe = new PlotEngine(plotData, gameState);
    readyEngine.setPlotEngine(pe, gameState);

    pe.onChapterEnd = () => {
      readyEngine.pause();
      showChapterComplete(index);
    };

    const scene = new SceneClass();
    readyEngine.loadChapterScene(scene);
    readyEngine.start();
    readyEngine.playChapterIntro(ch);

    const startNodeId = `ch${index + 1}_start`;
    if (plotData[startNodeId]) {
      pe.start(startNodeId);
    } else {
      readyEngine.onChapterComplete = () => showChapterComplete(index);
    }
    hideChapterLoading();
  } catch (error) {
    console.error('Failed to load chapter', error);
    hideChapterLoading();
    gameCanvas.classList.add('hidden');
    gameUI.classList.add('hidden');
    chapterSelect.classList.remove('hidden');
    renderChapterSelect();
  }

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
    if (e.code === 'Escape' && !settingsPanel.classList.contains('hidden')) {
      closeSettingsPanel();
      return;
    }
    if (e.code === 'Escape' && engine) {
      if (engine.isPaused) { engine.resume(); pauseMenu.classList.add('hidden'); }
      else { engine.pause(); pauseMenu.classList.remove('hidden'); }
    }
  });
  $('btn-resume')?.addEventListener('click', () => {
    engine.resume(); pauseMenu.classList.add('hidden');
  });
  $('btn-settings-pause')?.addEventListener('click', () => {
    openSettingsPanel('pause');
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

$('btn-settings-main')?.addEventListener('click', () => {
  openSettingsPanel('main');
});

$('btn-close-settings')?.addEventListener('click', () => {
  closeSettingsPanel();
});

$('settings-auto-quality')?.addEventListener('click', () => {
  setAutoGraphicsFromSettings(!getAutoGraphicsEnabled());
});

settingsPanel?.addEventListener('click', event => {
  if (event.target.classList.contains('settings-backdrop')) closeSettingsPanel();
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
