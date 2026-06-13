import { PlotEngine } from '../core/PlotEngine.js';
import {
  getChapterAmbienceProfile,
  getChapterMusicProfile,
  getEventSoundProfile,
  getFootstepInterval,
  getMusicStepFrequency,
  MASTER_VOLUME,
} from '../core/AudioDirector.js';
import { AutoQualityController, QualityRecommendationController } from '../core/AutoQuality.js';
import {
  DEFAULT_STORY_MODE,
  getStoryModeOptions,
  isStoryModeAllowed,
  normalizeStoryMode,
} from '../core/StoryMode.js';
import {
  CAMERA_RIG_DEFAULTS,
  clampCameraDistance,
  computeCameraRigTarget,
  getSmoothingFactor,
  resolveCameraDistance,
  smoothCameraRigPose,
} from '../core/CameraRig.js';
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
  computeDialogueCameraTarget,
  computeDialogueFacing,
  getFacingYaw,
} from '../core/DialogueCamera.js';
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
  buildInteractionPromptState,
  formatInteractionDistance,
  getInteractionDistance,
  getNearestInteractionTarget,
} from '../core/InteractionDirector.js';
import {
  clampToBounds,
  computeCameraRelativeMovement,
  resolveBoxCollision,
  resolveCircleCollision,
  resolvePlayerNavigation,
  rotateToward,
  shortestAngleDelta,
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
  buildObjectiveCompassState,
  classifyCompassSide,
  getActiveCompassObjective,
  getCameraHeading,
  getObjectiveHeading,
  normalizeAngleRadians,
} from '../ui/ObjectiveCompass.js';
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
    this.storyMode = DEFAULT_STORY_MODE;
    this.ending = null;
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

console.log('\nStoryMode');
test('normalizes story modes and checks mode gates', () => {
  assertEqual(normalizeStoryMode('free'), 'free');
  assertEqual(normalizeStoryMode('unknown'), DEFAULT_STORY_MODE);
  assertEqual(getStoryModeOptions().length, 3);
  assertEqual(isStoryModeAllowed('essential', { maxMode: 'essential' }), true);
  assertEqual(isStoryModeAllowed('essential', { minMode: 'guided' }), false);
  assertEqual(isStoryModeAllowed('free', { minMode: 'guided' }), true);
});

test('filters explore interactions by selected story mode', () => {
  const state = new MockGameState();
  state.setStoryMode('essential');
  const engine = new PlotEngine(plotData, state);
  engine.start('ch1_start');
  assertEqual(engine.getActiveInteractionIds().join(','), 'mother');
  assertEqual(engine.handleInteract('mentor'), false);

  state.setStoryMode('guided');
  engine.start('ch1_start');
  assertEqual(engine.getActiveInteractionIds().sort().join(','), 'mentor,mother');
});

test('allows essential mode to complete a chapter through the critical path only', () => {
  const state = new MockGameState();
  state.setStoryMode('essential');
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
  assertEqual(chapterEnded, true);
});

test('choice effects can unlock later data-driven routes', () => {
  const state = new MockGameState();
  state.setStoryMode('free');
  state.scores.strategy = 20;
  const engine = new PlotEngine(plotData, state);
  let node = null;
  engine.onShowDialog = value => { node = value; };
  engine.start('ch2_gen_q1');
  const signalChoice = node.choices.find(item => item.setFlags?.ch2_signal_harbor);
  assert(signalChoice, 'Expected free-mode signal choice to be available');
  engine.applyChoiceEffects(signalChoice);
  assertEqual(state.getFlag('ch2_signal_harbor'), true);

  state.setFlag('ch2_talked_gen', true);
  state.setFlag('ch2_talked_junot', true);
  let eventName = null;
  engine.onTriggerEvent = event => { eventName = event; };
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 1;
  try {
    engine.start('ch2_check');
    assertEqual(eventName, 'harbor_signal');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
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
  assertClose(mission.objectives[0].position.x, 3);
  assertClose(mission.objectives[0].position.z, 4);
  assertEqual(mission.objectives[1].done, false);
});

test('filters mission objectives to currently active plot interactions', () => {
  const scene = {
    index: 0,
    npcs: [
      { dialogueId: 'mother', name: 'Letizia', mesh: { position: { x: 1, z: 0 } } },
      { dialogueId: 'mentor', name: 'Paoli', mesh: { position: { x: 2, z: 0 } } },
    ],
  };
  const mission = buildMissionState(scene, new MockGameState(), key => key, null, {
    activeDialogueIds: ['mother'],
  });
  assertEqual(mission.total, 1);
  assertEqual(mission.objectives[0].id, 'mother');
});

console.log('\nObjectiveCompass');
test('normalizes compass angles into a signed half turn', () => {
  assertClose(normalizeAngleRadians(Math.PI * 3), -Math.PI);
  assertClose(normalizeAngleRadians(-Math.PI * 1.5), Math.PI / 2);
});

test('derives camera and objective headings on the XZ plane', () => {
  assertClose(getCameraHeading({
    position: { x: 0, z: 0 },
    lookAt: { x: 0, z: 1 },
  }), 0);
  assertClose(getCameraHeading({
    position: { x: 0, z: 0 },
    lookAt: { x: 1, z: 0 },
  }), Math.PI / 2);
  assertClose(getObjectiveHeading({ x: 0, z: 0 }, { x: -1, z: 0 }), -Math.PI / 2);
});

test('classifies objective direction around the compass', () => {
  assertEqual(classifyCompassSide(0), 'ahead');
  assertEqual(classifyCompassSide(-Math.PI / 2), 'left');
  assertEqual(classifyCompassSide(Math.PI / 2), 'right');
  assertEqual(classifyCompassSide(Math.PI), 'behind');
});

test('selects nearest incomplete objective for the compass', () => {
  const objective = getActiveCompassObjective({
    objectives: [
      { id: 'done', done: true, distance: 1, position: { x: 0, z: 1 } },
      { id: 'far', done: false, distance: 8, position: { x: 0, z: 8 } },
      { id: 'near', done: false, distance: 3, position: { x: 0, z: 3 } },
    ],
  });
  assertEqual(objective.id, 'near');
});

test('builds visible compass state with offset, rotation, name, and distance', () => {
  const state = buildObjectiveCompassState(
    {
      objectives: [
        {
          id: 'mentor',
          name: 'Pasquale Paoli',
          done: false,
          distance: 5,
          distanceLabel: '5m',
          position: { x: 5, z: 0 },
        },
      ],
    },
    { x: 0, z: 0 },
    {
      position: { x: 0, z: -4 },
      lookAt: { x: 0, z: 0 },
    },
    { maxOffset: 100 }
  );
  assertEqual(state.visible, true);
  assertEqual(state.objectiveId, 'mentor');
  assertEqual(state.name, 'Pasquale Paoli');
  assertEqual(state.distanceLabel, '5m');
  assertEqual(state.side, 'right');
  assertEqual(state.offsetPx, 50);
  assertEqual(state.arrowRotationDeg, 90);
});

test('hides compass when no incomplete positioned objective exists', () => {
  assertEqual(buildObjectiveCompassState({ objectives: [] }, { x: 0, z: 0 }, null).visible, false);
  assertEqual(buildObjectiveCompassState({
    objectives: [{ id: 'done', done: true, position: { x: 0, z: 1 } }],
  }, { x: 0, z: 0 }, null).visible, false);
});

console.log('\nInteractionDirector');
test('measures and formats interaction target distance', () => {
  const player = { position: { x: 0, z: 0 } };
  const npc = { mesh: { position: { x: 3, z: 4 } } };
  assertClose(getInteractionDistance(player, npc), 5);
  assertEqual(formatInteractionDistance(4.6), '5m');
  assertEqual(formatInteractionDistance(Infinity), '--');
});

test('selects nearest NPC inside awareness range', () => {
  const player = { position: { x: 0, z: 0 } };
  const near = { id: 'near', mesh: { position: { x: 0, z: 3 } } };
  const far = { id: 'far', mesh: { position: { x: 0, z: 8 } } };
  const target = getNearestInteractionTarget(player, [far, near], { awarenessDist: 6 });
  assertEqual(target.npc.id, 'near');
  assertEqual(getNearestInteractionTarget(player, [far], { awarenessDist: 6 }), null);
});

test('builds approach and ready interaction prompt states', () => {
  const player = { position: { x: 0, z: 0 } };
  const npc = {
    nameKey: 'characters.letizia',
    interactDist: 2.5,
    mesh: { position: { x: 0, z: 5 } },
  };
  const approach = buildInteractionPromptState(player, [npc], key => key.split('.').pop(), {
    awarenessDist: 6.5,
  });
  assertEqual(approach.visible, true);
  assertEqual(approach.canInteract, false);
  assertEqual(approach.name, 'letizia');
  assertEqual(approach.distanceLabel, '5m');
  assert(approach.progress > 0 && approach.progress < 1);

  npc.mesh.position.z = 2;
  const ready = buildInteractionPromptState(player, [npc], key => key, { awarenessDist: 6.5 });
  assertEqual(ready.visible, true);
  assertEqual(ready.canInteract, true);
  assertEqual(ready.progress, 1);
});

test('allows a small ready assist radius near interaction targets', () => {
  const player = { position: { x: 0, z: 0 } };
  const npc = {
    name: 'Target',
    interactDist: 2.5,
    mesh: { position: { x: 0, z: 2.85 } },
  };
  const state = buildInteractionPromptState(player, [npc], key => key, {
    awarenessDist: 6.5,
    readyAssistDist: 0.4,
  });
  assertEqual(state.canInteract, true);
  assertClose(state.readyDist, 2.9);
  assertEqual(state.progress, 1);
});

test('suppresses interaction prompt state when disabled', () => {
  const player = { position: { x: 0, z: 0 } };
  const npc = { name: 'Target', mesh: { position: { x: 0, z: 1 } } };
  const state = buildInteractionPromptState(player, [npc], key => key, {
    enabled: false,
    awarenessDist: 6.5,
  });
  assertEqual(state.visible, false);
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

test('shortestAngleDelta takes the short way around the circle', () => {
  assertClose(shortestAngleDelta(0, Math.PI / 2), Math.PI / 2);
  assertClose(shortestAngleDelta(0, -Math.PI / 2), -Math.PI / 2);
  // 3 -> -3 is +0.283 the short way, not -6 the long way.
  assertClose(shortestAngleDelta(3, -3), 2 * Math.PI - 6);
});

test('rotateToward clamps to maxStep but snaps when within reach', () => {
  assertClose(rotateToward(0, Math.PI, 0.1), 0.1);
  assertClose(rotateToward(0, -Math.PI / 2, 0.1), -0.1);
  assertClose(rotateToward(0, Math.PI / 4, 10), Math.PI / 4);
});

test('stick movement ignores input inside the deadzone', () => {
  const result = computeCameraRelativeMovement(
    { x: 0.1, y: -0.1 },
    { worldYaw: 0, playerYaw: 0, speed: 4, delta: 0.1, turnRate: 100 }
  );
  assertEqual(result.moving, false);
  assertClose(result.dx, 0);
  assertClose(result.dz, 0);
  assertClose(result.camYawDelta, 0);
});

test('pushing the stick up walks into the screen (away from camera)', () => {
  const result = computeCameraRelativeMovement(
    { x: 0, y: -1 },
    { worldYaw: 0, playerYaw: 0, speed: 4, delta: 0.1, turnRate: 100 }
  );
  assertEqual(result.moving, true);
  assertClose(result.dx, 0);
  assertClose(result.dz, 0.4);
  assertClose(result.playerYaw, 0);
});

test('pushing the stick right walks along the camera right axis', () => {
  const result = computeCameraRelativeMovement(
    { x: 1, y: 0 },
    { worldYaw: 0, playerYaw: 0, speed: 4, delta: 0.1, turnRate: 100 }
  );
  // Camera right vector at worldYaw 0 is (-1, 0), so screen-right is -x.
  assertClose(result.dx, -0.4);
  assertClose(result.dz, 0);
  assertClose(result.playerYaw, -Math.PI / 2);
});

test('auto-facing counter-rotates camYaw so the camera stays put', () => {
  const worldYaw = 0;
  const playerYaw = Math.PI / 2;
  const camYaw = worldYaw - playerYaw; // engine invariant: worldYaw = playerYaw + camYaw
  const result = computeCameraRelativeMovement(
    { x: 0, y: -1 },
    { worldYaw, playerYaw, speed: 4, delta: 0.1, turnRate: 100 }
  );
  // Body snapped to face into the screen...
  assertClose(result.playerYaw, 0);
  // ...and the camera's world yaw is unchanged.
  const newWorldYaw = result.playerYaw + (camYaw + result.camYawDelta);
  assertClose(newWorldYaw, worldYaw);
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

console.log('\nDialogueCamera');
test('computes facing yaw for player and NPC dialogue lock', () => {
  assertClose(getFacingYaw({ x: 0, z: 0 }, { x: 0, z: 3 }), 0);
  assertClose(getFacingYaw({ x: 0, z: 0 }, { x: 3, z: 0 }), Math.PI / 2);
  const facing = computeDialogueFacing({ x: 0, z: 0 }, { x: 0, z: 3 });
  assertClose(facing.playerYaw, 0);
  assertClose(facing.npcYaw, Math.PI);
});

test('builds an over-shoulder dialogue camera target between actors', () => {
  const target = computeDialogueCameraTarget(
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 4 },
    { distance: 3, sideOffset: 1, height: 1.6, lookAtHeight: 1.1, fov: 50 }
  );
  assertClose(target.position.x, 1);
  assertClose(target.position.y, 1.6);
  assertClose(target.position.z, -1);
  assertClose(target.lookAt.x, 0);
  assertClose(target.lookAt.y, 1.1);
  assertClose(target.lookAt.z, 2);
  assertEqual(target.fov, 50);
  assertEqual(target.obstructed, false);
});

test('dialogue camera falls back to a stable forward axis for overlapping actors', () => {
  const target = computeDialogueCameraTarget(
    { x: 2, y: 0, z: 2 },
    { x: 2, y: 0, z: 2 },
    { distance: 2, sideOffset: 0.5 }
  );
  assertClose(target.position.x, 2.5);
  assertClose(target.position.z, 0);
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

console.log('\nCameraRig');
test('camera rig clamps player zoom distance', () => {
  assertClose(clampCameraDistance(1), 2.35);
  assertClose(clampCameraDistance(12), 7.2);
  assertClose(clampCameraDistance(4.2), 4.2);
});

test('camera rig computes a stable third-person pose behind the player', () => {
  const target = computeCameraRigTarget({
    playerPosition: { x: 0, y: 0, z: 0 },
    playerRotationY: 0,
    yawOffset: 0,
    pitch: 0,
    distance: 4,
    moving: false,
    blocked: false,
    obstacles: [],
  });
  assertClose(target.position.x, 0);
  assertClose(target.position.y, 2.5);
  assertClose(target.position.z, -4);
  assertClose(target.lookAt.y, 1.25);
  assertEqual(target.fov, 65);
  assertEqual(target.obstructed, false);
});

test('camera rig allows exploration pitch to look upward', () => {
  const target = computeCameraRigTarget({
    playerPosition: { x: 0, y: 0, z: 0 },
    pitch: CAMERA_RIG_DEFAULTS.maxPitch,
    distance: 4,
    obstacles: [],
  });
  assert(target.position.y < target.lookAt.y, 'Camera should dip below the look target for upward viewing');
});

test('camera rig shortens distance when scene geometry blocks the chase camera', () => {
  const clear = resolveCameraDistance({ x: 0, z: 0 }, { x: 0, z: -4 }, 4, []);
  const blocked = resolveCameraDistance(
    { x: 0, z: 0 },
    { x: 0, z: -4 },
    4,
    [{ type: 'circle', x: 0, z: -2, radius: 0.5 }]
  );
  assertClose(clear, 4);
  assert(blocked < clear, 'Expected obstacle to shorten the camera distance');
  assert(blocked >= 2.35, 'Camera distance should never collapse inside the player');
});

test('camera rig exposes motion and blocked feedback through field of view', () => {
  const idle = computeCameraRigTarget({
    playerPosition: { x: 0, y: 0, z: 0 },
    distance: 4,
    obstacles: [],
  });
  const moving = computeCameraRigTarget({
    playerPosition: { x: 0, y: 0, z: 0 },
    distance: 4,
    moving: true,
    obstacles: [],
  });
  const blocked = computeCameraRigTarget({
    playerPosition: { x: 0, y: 0, z: 0 },
    distance: 4,
    moving: true,
    blocked: true,
    obstacles: [],
  });
  assert(moving.fov > idle.fov);
  assert(blocked.fov < moving.fov);
});

test('camera rig smoothing moves poses toward the target without snapping', () => {
  const factor = getSmoothingFactor(1 / 60, 10);
  assert(factor > 0 && factor < 1);

  const next = smoothCameraRigPose(
    {
      position: { x: 0, y: 0, z: 0 },
      lookAt: { x: 0, y: 1, z: 0 },
      fov: 65,
      distance: 4,
      obstructed: false,
    },
    {
      position: { x: 10, y: 4, z: -5 },
      lookAt: { x: 2, y: 1.5, z: 1 },
      fov: 70,
      distance: 5,
      obstructed: true,
    },
    1 / 60
  );
  assert(next.position.x > 0 && next.position.x < 10);
  assert(next.lookAt.z > 0 && next.lookAt.z < 1);
  assert(next.fov > 65 && next.fov < 70);
  assertEqual(next.obstructed, true);
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

test('chapter music profiles expose playable melodic steps', () => {
  const profile = getChapterMusicProfile(0);
  const fallback = getChapterMusicProfile(999);
  assertEqual(profile.rootHz, fallback.rootHz);
  assert(profile.tempo > 0);
  assertEqual(profile.motif.length > 0, true);
  const first = getMusicStepFrequency(profile, 0);
  const later = getMusicStepFrequency(profile, 3);
  assert(first > 0);
  assert(later > 0);
  assert(first !== later);
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
