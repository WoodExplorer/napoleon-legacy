import { PlotEngine } from '../core/PlotEngine.js';
import {
  getChapterAmbienceProfile,
  getEventSoundProfile,
  getFootstepInterval,
  MASTER_VOLUME,
} from '../core/AudioDirector.js';
import { AutoQualityController, QualityRecommendationController } from '../core/AutoQuality.js';
import {
  ENHANCED_SUBTITLES_STORAGE_KEY,
  loadEnhancedSubtitles,
  saveEnhancedSubtitles,
} from '../core/AccessibilitySettings.js';
import {
  CAMERA_SENSITIVITY_STORAGE_KEY,
  DEFAULT_CAMERA_SENSITIVITY,
  formatCameraSensitivity,
  loadCameraSensitivity,
  normalizeCameraSensitivity,
  saveCameraSensitivity,
} from '../core/CameraSettings.js';
import {
  createIntroState,
  easeInOutCubic,
  getIntroCameraPose,
  getIntroOverlayState,
  INTRO_CAMERA_DEFAULTS,
} from '../core/CinematicDirector.js';
import {
  AUTO_GRAPHICS_STORAGE_KEY,
  DEFAULT_GRAPHICS_QUALITY,
  getLowerGraphicsQuality,
  GRAPHICS_STORAGE_KEY,
  getGraphicsPreset,
  getGraphicsPresetOptions,
  getNextGraphicsQuality,
  loadAutoGraphicsEnabled,
  loadGraphicsQuality,
  normalizeGraphicsQuality,
  saveAutoGraphicsEnabled,
  saveGraphicsQuality,
} from '../core/GraphicsSettings.js';
import {
  clampToBounds,
  resolveBoxCollision,
  resolveCircleCollision,
  resolvePlayerNavigation,
} from '../core/MovementPhysics.js';
import {
  formatFps,
  FrameRateSampler,
  getPerformanceStatus,
} from '../core/PerformanceMonitor.js';
import { plotData } from '../data/plotData.js';
import { getSceneRegistryMetadata, loadChapterSceneClass } from '../scenes/SceneRegistry.js';
import { CHAPTERS } from '../ui/ChapterData.js';
import {
  DEFAULT_LOCALE,
  getTranslationKeys,
  hasTranslationKey,
  setLocale,
  t,
  translateNode,
} from '../i18n/index.js';
import { buildMissionState, formatDistance, getObjectiveFlag } from '../ui/MissionTracker.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok ${name}`);
    passed++;
  } catch (e) {
    console.log(`  fail ${name}: ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ok ${name}`);
    passed++;
  } catch (e) {
    console.log(`  fail ${name}: ${e.message}`);
    failed++;
  }
}

function assert(value, message = 'Assertion failed') {
  if (!value) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, epsilon = 0.001, message) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

class MockGameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.choices = [];
    this.flags = {};
    this.scores = { strategy: 0, diplomacy: 0, loyalty: 0, legacy: 0, humanity: 0 };
    this.unlockedChapters = [0];
    this.ending = null;
  }

  setFlag(key, value) {
    this.flags[key] = value;
  }

  getFlag(key) {
    return this.flags[key];
  }

  recordChoice(chapterIndex, chapterId, nodeId, choiceText, impact) {
    this.choices.push({ chapterIndex, chapterId, nodeId, choiceText, impact });
    if (impact) {
      Object.entries(impact).forEach(([key, value]) => {
        if (this.scores[key] !== undefined) {
          this.scores[key] = Math.max(0, Math.min(100, this.scores[key] + value));
        }
      });
    }
  }

  unlockChapter(index) {
    if (!this.unlockedChapters.includes(index)) this.unlockedChapters.push(index);
  }

  getChoicesForChapter(index) {
    return this.choices.filter(choice => choice.chapterIndex === index);
  }

  computeEnding() {
    const avg = Object.values(this.scores).reduce((sum, value) => sum + value, 0) / 5;
    if (avg >= 70) this.ending = 'triumph';
    else if (avg >= 45) this.ending = 'legacy';
    else this.ending = 'tragedy';
    return this.ending;
  }
}

function visitPlotKeys(visitor) {
  Object.entries(plotData).forEach(([nodeId, node]) => {
    if (node.speakerKey) visitor(node.speakerKey, `${nodeId}.speakerKey`);
    if (node.textKey) visitor(node.textKey, `${nodeId}.textKey`);
    node.choices?.forEach((choice, index) => {
      if (choice.textKey) visitor(choice.textKey, `${nodeId}.choices.${index}.textKey`);
    });
  });
}

console.log('\nNapoleon game tests\n');

console.log('GameState');
test('initial scores are zero', () => {
  const state = new MockGameState();
  Object.values(state.scores).forEach(value => assertEqual(value, 0));
});

test('recordChoice accumulates scores', () => {
  const state = new MockGameState();
  state.recordChoice(0, 'ch1', 'n1', 'Study', { strategy: 10, legacy: 5 });
  assertEqual(state.scores.strategy, 10);
  assertEqual(state.scores.legacy, 5);
  assertEqual(state.scores.diplomacy, 0);
});

test('scores are clamped between zero and one hundred', () => {
  const state = new MockGameState();
  state.recordChoice(0, 'x', 'y', 'z', { strategy: 500, diplomacy: -500 });
  assertEqual(state.scores.strategy, 100);
  assertEqual(state.scores.diplomacy, 0);
});

test('getChoicesForChapter returns only matching choices', () => {
  const state = new MockGameState();
  state.recordChoice(0, 'ch1', 'n1', 'A', { strategy: 5 });
  state.recordChoice(1, 'ch2', 'n2', 'B', { diplomacy: 5 });
  state.recordChoice(0, 'ch1', 'n3', 'C', { legacy: 5 });
  assertEqual(state.getChoicesForChapter(0).length, 2);
  assertEqual(state.getChoicesForChapter(1).length, 1);
});

test('unlockChapter does not duplicate chapters', () => {
  const state = new MockGameState();
  state.unlockChapter(1);
  state.unlockChapter(1);
  assertEqual(state.unlockedChapters.length, 2);
});

console.log('\nEndings');
test('ending thresholds are respected', () => {
  const state = new MockGameState();
  Object.keys(state.scores).forEach(key => { state.scores[key] = 70; });
  assertEqual(state.computeEnding(), 'triumph');
  Object.keys(state.scores).forEach(key => { state.scores[key] = 45; });
  assertEqual(state.computeEnding(), 'legacy');
  Object.keys(state.scores).forEach(key => { state.scores[key] = 20; });
  assertEqual(state.computeEnding(), 'tragedy');
});

console.log('\nPlotEngine');
test('executes explore nodes', () => {
  const engine = new PlotEngine({ start: { type: 'explore' } }, new MockGameState());
  let exploreCalled = false;
  engine.onEnterExplore = node => {
    exploreCalled = true;
    assertEqual(node.type, 'explore');
  };
  engine.start('start');
  assert(exploreCalled);
  assertEqual(engine.currentNodeId, 'start');
});

test('handles dialog sequences and choices', () => {
  const data = {
    start: { type: 'dialog', next: 'q1' },
    q1: { type: 'dialog', choices: [{ next: 'end' }] },
    end: { type: 'chapter_end', nextChapter: 2 },
  };
  const engine = new PlotEngine(data, new MockGameState());
  let dialogCount = 0;
  let endChapter = null;
  engine.onShowDialog = () => { dialogCount++; };
  engine.onChapterEnd = chapter => { endChapter = chapter; };
  engine.start('start');
  engine.advance(data.start.next);
  engine.advance(data.q1.choices[0].next);
  assertEqual(dialogCount, 2);
  assertEqual(endChapter, 2);
});

test('evaluates conditions and set_flag nodes', () => {
  const data = {
    start: { type: 'set_flag', flag: 'met', value: true, next: 'check' },
    check: { type: 'condition', conditions: [{ hasFlags: ['met'], next: 'success' }], defaultNext: 'fail' },
    success: { type: 'event', eventName: 'win', next: 'end' },
    fail: { type: 'explore' },
    end: { type: 'chapter_end' },
  };
  const state = new MockGameState();
  const engine = new PlotEngine(data, state);
  let eventName = null;
  engine.onTriggerEvent = event => { eventName = event; };
  engine.start('start');
  assertEqual(state.getFlag('met'), true);
  assertEqual(eventName, 'win');
  assertEqual(engine.currentNodeId, 'end');
});

test('respects delayed events', () => {
  const data = {
    start: { type: 'event', eventName: 'boom', delay: 2000, next: 'end' },
    end: { type: 'chapter_end' },
  };
  const originalSetTimeout = globalThis.setTimeout;
  let timeoutCallback = null;
  let timeoutDelay = 0;
  globalThis.setTimeout = (callback, delay) => {
    timeoutCallback = callback;
    timeoutDelay = delay;
    return 1;
  };

  try {
    const engine = new PlotEngine(data, new MockGameState());
    let eventName = null;
    engine.onTriggerEvent = event => { eventName = event; };
    engine.start('start');
    assertEqual(eventName, 'boom');
    assertEqual(timeoutDelay, 2000);
    assert(engine.currentNodeId !== 'end');
    timeoutCallback();
    assertEqual(engine.currentNodeId, 'end');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('chapter one requires both interactions before ending', () => {
  const state = new MockGameState();
  const engine = new PlotEngine(plotData, state);
  let chapterEnded = false;
  engine.onChapterEnd = () => { chapterEnded = true; };
  engine.onShowDialog = () => {};
  engine.onEnterExplore = () => {};

  engine.start('ch1_start');
  engine.handleInteract('mother');
  engine.advance(plotData.ch1_mother_start.next);
  engine.advance(plotData.ch1_mother_q1.choices[0].next);
  engine.advance(plotData.ch1_mother_a1_study.next);
  assertEqual(state.getFlag('ch1_talked_mother'), true);
  assertEqual(chapterEnded, false);
  assertEqual(engine.currentNodeId, 'ch1_start');

  engine.handleInteract('mentor');
  engine.advance(plotData.ch1_mentor_start.next);
  engine.advance(plotData.ch1_mentor_q1.choices[0].next);
  engine.advance(plotData.ch1_mentor_b1_france.next);
  assertEqual(state.getFlag('ch1_talked_mentor'), true);
  assertEqual(chapterEnded, true);
});

console.log('\nLocalization');
test('default locale is English', () => {
  setLocale(DEFAULT_LOCALE);
  assertEqual(t('brand.title'), "Napoleon's Legacy");
  assertEqual(t('menu.newGame'), 'New Game');
});

test('all locale resources expose the same keys', () => {
  const enKeys = getTranslationKeys('en').sort();
  const zhKeys = getTranslationKeys('zh-CN').sort();
  assertEqual(enKeys.length, zhKeys.length);
  enKeys.forEach((key, index) => assertEqual(key, zhKeys[index], `Mismatched key: ${key}`));
});

test('plot data references existing translation keys', () => {
  visitPlotKeys((key, location) => {
    assert(hasTranslationKey(key, 'en'), `Missing English key at ${location}: ${key}`);
    assert(hasTranslationKey(key, 'zh-CN'), `Missing Chinese key at ${location}: ${key}`);
  });
});

test('chapter metadata references existing translation keys', () => {
  CHAPTERS.forEach(chapter => {
    ['number', 'title', 'year', 'desc'].forEach(field => {
      const key = `${chapter.key}.${field}`;
      assert(hasTranslationKey(key, 'en'), `Missing English key: ${key}`);
      assert(hasTranslationKey(key, 'zh-CN'), `Missing Chinese key: ${key}`);
    });
  });
});

test('PlotEngine emits localized dialog nodes', () => {
  setLocale(DEFAULT_LOCALE);
  const engine = new PlotEngine(plotData, new MockGameState());
  let node = null;
  engine.onShowDialog = value => { node = value; };
  engine.start('ch1_mother_start');
  assertEqual(node.speaker, 'Letizia Bonaparte');
  assert(node.text.includes('Brienne'));
  assert(!node.textKey, 'localized nodes should not require UI consumers to read textKey');
});

test('translateNode localizes choices', () => {
  setLocale(DEFAULT_LOCALE);
  const node = translateNode(plotData.ch1_mother_q1);
  assertEqual(node.choices.length, 3);
  assert(node.choices[0].text.includes('Prove myself'));
});

console.log('\nMissionTracker');
test('derives objective flags from chapter and dialogue id', () => {
  assertEqual(getObjectiveFlag(0, { dialogueId: 'mother' }), 'ch1_talked_mother');
  assertEqual(getObjectiveFlag(1, { dialogueId: 'general' }), 'ch2_talked_gen');
  assertEqual(getObjectiveFlag(4, { dialogueId: 'murat', objectiveFlag: 'custom_flag' }), 'custom_flag');
});

test('formats target distances for HUD display', () => {
  assertEqual(formatDistance(3.49), '3m');
  assertEqual(formatDistance(3.5), '4m');
  assertEqual(formatDistance(null), '--');
});

test('builds mission progress from NPC flags and player distance', () => {
  const state = new MockGameState();
  state.setFlag('ch2_talked_gen', true);
  const scene = {
    index: 1,
    npcs: [
      { dialogueId: 'general', nameKey: 'characters.carteaux', mesh: { position: { x: 3, z: 4 } } },
      { dialogueId: 'junot', nameKey: 'characters.junot', mesh: { position: { x: 0, z: 6 } } },
    ],
  };
  const player = { position: { x: 0, z: 0 } };
  const mission = buildMissionState(scene, state, key => key.split('.').pop(), player);
  assertEqual(mission.completed, 1);
  assertEqual(mission.total, 2);
  assertEqual(mission.objectives[0].done, true);
  assertEqual(mission.objectives[0].distanceLabel, '5m');
  assertEqual(mission.objectives[1].done, false);
});

console.log('\nMovementPhysics');
test('clamps player position inside world bounds with radius padding', () => {
  const result = clampToBounds(
    { x: 12, z: -12 },
    { minX: -10, maxX: 10, minZ: -8, maxZ: 8 },
    0.5
  );
  assertEqual(result.blocked, true);
  assertClose(result.x, 9.5);
  assertClose(result.z, -7.5);
});

test('pushes player out of circular obstacles', () => {
  const result = resolveCircleCollision(
    { x: 0.5, z: 0 },
    { type: 'circle', x: 0, z: 0, radius: 1 },
    0.5
  );
  assertEqual(result.blocked, true);
  assertClose(result.x, 1.5);
  assertClose(result.z, 0);
});

test('pushes player out of box obstacles along the shallowest axis', () => {
  const result = resolveBoxCollision(
    { x: 0.9, z: 0.1 },
    { type: 'box', x: 0, z: 0, width: 2, depth: 2 },
    0.25
  );
  assertEqual(result.blocked, true);
  assertClose(result.x, 1.25);
  assertClose(result.z, 0.1);
});

test('resolves combined bounds and obstacle navigation', () => {
  const result = resolvePlayerNavigation(
    { x: 2.4, z: 0 },
    {
      radius: 0.5,
      bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
      obstacles: [{ type: 'circle', x: 2, z: 0, radius: 0.75 }],
    }
  );
  assertEqual(result.blocked, true);
  assertClose(result.x, 3.25);
  assertClose(result.z, 0);
});

console.log('\nSceneRegistry');
test('scene registry maps one lazy loader per chapter', () => {
  const metadata = getSceneRegistryMetadata();
  assertEqual(metadata.length, CHAPTERS.length);
  metadata.forEach((entry, index) => {
    assertEqual(entry.index, index);
    assertEqual(entry.lazy, true);
    assertEqual(typeof entry.loader, 'function');
  });
});

await testAsync('loads chapter scene classes on demand', async () => {
  const SceneClass = await loadChapterSceneClass(0);
  const scene = new SceneClass();
  assertEqual(scene.id, 'chapter1');
  assertEqual(scene.index, 0);
});

await testAsync('rejects unknown chapter scene indexes', async () => {
  let rejected = false;
  try {
    await loadChapterSceneClass(CHAPTERS.length);
  } catch (error) {
    rejected = error instanceof RangeError;
  }
  assert(rejected, 'Expected an out-of-range chapter index to reject');
});

console.log('\nCinematicDirector');
test('intro easing clamps outside input range', () => {
  assertEqual(easeInOutCubic(-1), 0);
  assertEqual(easeInOutCubic(2), 1);
  assertClose(easeInOutCubic(0.5), 0.5);
});

test('intro camera pose interpolates from establishing shot to gameplay camera', () => {
  const state = createIntroState({ durationMs: 1000 });
  const start = getIntroCameraPose(state, 0);
  assertClose(start.yaw, INTRO_CAMERA_DEFAULTS.startYaw);
  assertClose(start.pitch, INTRO_CAMERA_DEFAULTS.startPitch);
  assertClose(start.distance, INTRO_CAMERA_DEFAULTS.startDistance);

  const end = getIntroCameraPose(state, 1000);
  assertEqual(end.complete, true);
  assertClose(end.yaw, INTRO_CAMERA_DEFAULTS.endYaw);
  assertClose(end.pitch, INTRO_CAMERA_DEFAULTS.endPitch);
  assertClose(end.distance, INTRO_CAMERA_DEFAULTS.endDistance);
});

test('intro overlay stays visible before fading out near the end', () => {
  const early = getIntroOverlayState(0.5);
  assertEqual(early.visible, true);
  assertClose(early.opacity, 1);

  const late = getIntroOverlayState(0.9);
  assertEqual(late.visible, true);
  assert(late.opacity < 1 && late.opacity > 0);

  const complete = getIntroOverlayState(1);
  assertEqual(complete.visible, false);
  assertClose(complete.opacity, 0);
});

console.log('\nGraphicsSettings');
test('normalizes unknown graphics quality to the balanced preset', () => {
  assertEqual(normalizeGraphicsQuality('cinematic'), 'cinematic');
  assertEqual(normalizeGraphicsQuality('ultra'), DEFAULT_GRAPHICS_QUALITY);
  assertEqual(getGraphicsPreset('ultra').id, DEFAULT_GRAPHICS_QUALITY);
});

test('cycles graphics quality through low, balanced, and cinematic', () => {
  assertEqual(getNextGraphicsQuality('low'), 'balanced');
  assertEqual(getNextGraphicsQuality('balanced'), 'cinematic');
  assertEqual(getNextGraphicsQuality('cinematic'), 'low');
  assertEqual(getLowerGraphicsQuality('cinematic'), 'balanced');
  assertEqual(getLowerGraphicsQuality('balanced'), 'low');
  assertEqual(getLowerGraphicsQuality('low'), 'low');
});

test('exposes graphics options in UI order with renderable labels', () => {
  const options = getGraphicsPresetOptions();
  assertEqual(options.map(option => option.id).join(','), 'low,balanced,cinematic');
  options.forEach(option => {
    assert(hasTranslationKey(option.labelKey, 'en'), `Missing English label: ${option.labelKey}`);
    assert(hasTranslationKey(option.labelKey, 'zh-CN'), `Missing Chinese label: ${option.labelKey}`);
    assert(option.icon.length > 0);
    assert(option.pixelRatioCap >= 1);
  });
});

test('persists graphics quality while tolerating broken storage', () => {
  const storage = {
    values: {},
    getItem(key) { return this.values[key] ?? null; },
    setItem(key, value) { this.values[key] = value; },
  };
  assertEqual(saveGraphicsQuality('cinematic', storage), 'cinematic');
  assertEqual(loadGraphicsQuality(storage), 'cinematic');
  assertEqual(saveGraphicsQuality('unknown', storage), DEFAULT_GRAPHICS_QUALITY);
  assertEqual(storage.values[GRAPHICS_STORAGE_KEY], DEFAULT_GRAPHICS_QUALITY);

  assertEqual(loadAutoGraphicsEnabled(storage), false);
  assertEqual(saveAutoGraphicsEnabled(true, storage), true);
  assertEqual(storage.values[AUTO_GRAPHICS_STORAGE_KEY], 'true');
  assertEqual(loadAutoGraphicsEnabled(storage), true);
  assertEqual(saveAutoGraphicsEnabled(false, storage), false);
  assertEqual(loadAutoGraphicsEnabled(storage), false);

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assertEqual(loadGraphicsQuality(brokenStorage), DEFAULT_GRAPHICS_QUALITY);
  assertEqual(saveGraphicsQuality('low', brokenStorage), 'low');
  assertEqual(loadAutoGraphicsEnabled(brokenStorage), false);
  assertEqual(saveAutoGraphicsEnabled(true, brokenStorage), true);
});

console.log('\nAutoQuality');
test('auto quality downgrades only after sustained pressure', () => {
  const controller = new AutoQualityController({ downgradeReports: 3, cooldownReports: 2 });
  const pressure = { status: 'strained', fps: 34 };
  assertEqual(controller.record(pressure, 'cinematic'), null);
  assertEqual(controller.record(pressure, 'cinematic'), null);
  const action = controller.record(pressure, 'cinematic');
  assertEqual(action.from, 'cinematic');
  assertEqual(action.to, 'balanced');
  assertEqual(action.reason, 'strained');
});

test('auto quality respects cooldown and never drops below low', () => {
  const controller = new AutoQualityController({ downgradeReports: 1, cooldownReports: 2 });
  const pressure = { status: 'critical', fps: 24 };
  assertEqual(controller.record(pressure, 'balanced').to, 'low');
  assertEqual(controller.record(pressure, 'low'), null);
  assertEqual(controller.record(pressure, 'low'), null);
  assertEqual(controller.record(pressure, 'low'), null);
});

test('auto quality relaxes pressure on healthy frame reports', () => {
  const controller = new AutoQualityController({ downgradeReports: 2, cooldownReports: 0 });
  assertEqual(controller.record({ status: 'strained', fps: 34 }, 'cinematic'), null);
  assertEqual(controller.record({ status: 'stable', fps: 60 }, 'cinematic'), null);
  assertEqual(controller.record({ status: 'strained', fps: 34 }, 'cinematic'), null);
});

test('quality recommendation appears only when manual quality is under pressure', () => {
  const controller = new QualityRecommendationController({ pressureReports: 2, cooldownReports: 1 });
  const pressure = { status: 'strained', fps: 34 };
  assertEqual(controller.record(pressure, { autoEnabled: true, currentQuality: 'cinematic' }), null);
  assertEqual(controller.record(pressure, { autoEnabled: false, currentQuality: 'low' }), null);
  assertEqual(controller.record(pressure, { autoEnabled: false, currentQuality: 'cinematic' }), null);
  const recommendation = controller.record(pressure, { autoEnabled: false, currentQuality: 'cinematic' });
  assertEqual(recommendation.quality, 'cinematic');
  assertEqual(recommendation.status, 'strained');
});

test('quality recommendation cooldown prevents repeated prompts', () => {
  const controller = new QualityRecommendationController({ pressureReports: 1, cooldownReports: 2 });
  const pressure = { status: 'critical', fps: 24 };
  assert(controller.record(pressure, { autoEnabled: false, currentQuality: 'balanced' }));
  assertEqual(controller.record(pressure, { autoEnabled: false, currentQuality: 'balanced' }), null);
  assertEqual(controller.record(pressure, { autoEnabled: false, currentQuality: 'balanced' }), null);
  assert(controller.record(pressure, { autoEnabled: false, currentQuality: 'balanced' }));
  controller.dismiss();
  assertEqual(controller.record(pressure, { autoEnabled: false, currentQuality: 'balanced' }), null);
});

console.log('\nCameraSettings');
test('normalizes camera sensitivity inside supported bounds', () => {
  assertEqual(normalizeCameraSensitivity('bad'), DEFAULT_CAMERA_SENSITIVITY);
  assertEqual(normalizeCameraSensitivity(0), 0.5);
  assertEqual(normalizeCameraSensitivity(2), 1.5);
  assertEqual(normalizeCameraSensitivity(1.2), 1.2);
});

test('formats camera sensitivity as a percentage', () => {
  assertEqual(formatCameraSensitivity(1), '100%');
  assertEqual(formatCameraSensitivity(0.75), '75%');
  assertEqual(formatCameraSensitivity(1.49), '149%');
});

test('persists camera sensitivity while tolerating broken storage', () => {
  const storage = {
    values: {},
    getItem(key) { return this.values[key] ?? null; },
    setItem(key, value) { this.values[key] = value; },
  };
  assertEqual(loadCameraSensitivity(storage), DEFAULT_CAMERA_SENSITIVITY);
  assertEqual(saveCameraSensitivity(1.3, storage), 1.3);
  assertEqual(storage.values[CAMERA_SENSITIVITY_STORAGE_KEY], '1.3');
  assertEqual(loadCameraSensitivity(storage), 1.3);

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assertEqual(loadCameraSensitivity(brokenStorage), DEFAULT_CAMERA_SENSITIVITY);
  assertEqual(saveCameraSensitivity(0.8, brokenStorage), 0.8);
});

console.log('\nAccessibilitySettings');
test('persists enhanced subtitles while tolerating broken storage', () => {
  const storage = {
    values: {},
    getItem(key) { return this.values[key] ?? null; },
    setItem(key, value) { this.values[key] = value; },
  };
  assertEqual(loadEnhancedSubtitles(storage), false);
  assertEqual(saveEnhancedSubtitles(true, storage), true);
  assertEqual(storage.values[ENHANCED_SUBTITLES_STORAGE_KEY], 'true');
  assertEqual(loadEnhancedSubtitles(storage), true);
  assertEqual(saveEnhancedSubtitles(false, storage), false);
  assertEqual(loadEnhancedSubtitles(storage), false);

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assertEqual(loadEnhancedSubtitles(brokenStorage), false);
  assertEqual(saveEnhancedSubtitles(true, brokenStorage), true);
});

console.log('\nPerformanceMonitor');
test('classifies frame rate health for HUD status', () => {
  assertEqual(getPerformanceStatus(60), 'stable');
  assertEqual(getPerformanceStatus(50), 'watch');
  assertEqual(getPerformanceStatus(35), 'strained');
  assertEqual(getPerformanceStatus(20), 'critical');
  assertEqual(getPerformanceStatus(0), 'unknown');
});

test('formats FPS labels for compact HUD display', () => {
  assertEqual(formatFps(59.6), '60');
  assertEqual(formatFps(29.4), '29');
  assertEqual(formatFps(0), '--');
});

test('samples rolling frame rate only after report intervals', () => {
  const sampler = new FrameRateSampler({ windowMs: 1000, reportIntervalMs: 500 });
  let snapshot = null;
  for (let i = 0; i < 29; i++) snapshot = sampler.record(1 / 60);
  assertEqual(snapshot, null);

  snapshot = sampler.record(1 / 60);
  assert(snapshot, 'Expected a frame-rate snapshot after the first report interval');
  assertClose(snapshot.fps, 60, 0.5);
  assertEqual(snapshot.status, 'stable');

  for (let i = 0; i < 30; i++) sampler.record(1 / 20);
  snapshot = sampler.getSnapshot();
  assert(snapshot.fps < 35);
  assert(snapshot.sampleCount <= 21);
  assert(['strained', 'critical'].includes(snapshot.status));
});

console.log('\nAudioDirector');
test('chapter ambience profiles fall back to the first chapter', () => {
  const first = getChapterAmbienceProfile(0);
  const fallback = getChapterAmbienceProfile(999);
  assertEqual(first.baseHz, fallback.baseHz);
  assert(first.baseHz > 0);
  assert(first.shimmerHz > first.baseHz);
});

test('footstep interval clamps by speed and blocks when movement is blocked', () => {
  assertEqual(getFootstepInterval(true), Infinity);
  assertClose(getFootstepInterval(false, 100), 0.24);
  assertClose(getFootstepInterval(false, 0.01), 0.52);
});

test('event sound profiles distinguish artillery impact from generic pulses', () => {
  const artillery = getEventSoundProfile('artillery_fire');
  const generic = getEventSoundProfile('unknown');
  assertEqual(artillery.type, 'impact');
  assert(artillery.duration > generic.duration);
  assert(artillery.volume > generic.volume);
  assert(MASTER_VOLUME > 0 && MASTER_VOLUME <= 1);
});

console.log(`\nResult: ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
