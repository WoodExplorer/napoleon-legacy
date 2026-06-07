/**
 * GameEngine - 3D游戏引擎核心
 * 管理Three.js渲染循环、玩家控制、NPC交互、场景切换
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputController } from '../controls/InputController.js';
import { DialogueSystem } from '../dialogue/DialogueSystem.js';
import { t } from '../i18n/index.js';
import { AudioDirector } from './AudioDirector.js';
import { AutoQualityController, QualityRecommendationController } from './AutoQuality.js';
import { computeCameraRigTarget, smoothCameraRigPose } from './CameraRig.js';
import { loadCameraSensitivity, normalizeCameraSensitivity, saveCameraSensitivity } from './CameraSettings.js';
import { createIntroState, getIntroCameraPose, getIntroOverlayState } from './CinematicDirector.js';
import { computeDialogueCameraTarget, computeDialogueFacing } from './DialogueCamera.js';
import {
  getGraphicsPreset,
  getNextGraphicsQuality,
  loadAutoGraphicsEnabled,
  loadGraphicsQuality,
  saveAutoGraphicsEnabled,
  saveGraphicsQuality,
} from './GraphicsSettings.js';
import { buildInteractionPromptState } from './InteractionDirector.js';
import { DEFAULT_PLAYER_RADIUS, resolvePlayerNavigation } from './MovementPhysics.js';
import { FrameRateSampler } from './PerformanceMonitor.js';
import { buildObjectiveCompassState } from '../ui/ObjectiveCompass.js';
import { buildMissionState } from '../ui/MissionTracker.js';

const MOVE_SPEED = 4.5;
const TURN_SPEED = 2.0;
const CAM_SPEED = 1.8;
const INTERACT_DIST = 2.5;
const INTERACT_AWARENESS_DIST = 6.5;
const INTERACT_READY_ASSIST_DIST = 0.4;
const CAM_DIST_DEFAULT = 3.8;
const CAM_PITCH_DEFAULT = -0.18;
const CAM_PITCH_MIN = -0.82;
const CAM_PITCH_MAX = 0.58;
const NPC_COLLISION_RADIUS = 0.62;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.lastFrameTime = performance.now();
    this.currentChapterScene = null;
    this.player = null;
    this.input = new InputController();
    this.dialogue = null;
    this.dialogueFocus = null;
    this.audio = new AudioDirector();
    this.plotEngine = null;
    this.gameState = null;
    this.inDialogue = false;
    this.isPaused = false;
    this.onChapterComplete = null;
    this.camYaw = 0;
    this.camPitch = CAM_PITCH_DEFAULT;
    this.camDist = CAM_DIST_DEFAULT;
    this.cameraRigPose = null;
    this.cameraRigTarget = null;
    this.pointerLook = null;
    this.missionUI = null;
    this.missionCollapsed = false;
    this.currentMissionState = null;
    this.cinematicUI = null;
    this.audioUI = null;
    this.graphicsUI = null;
    this.performanceUI = null;
    this.performance = new FrameRateSampler();
    this.autoQuality = new AutoQualityController();
    this.qualityRecommendation = new QualityRecommendationController();
    this.autoGraphicsEnabled = loadAutoGraphicsEnabled();
    this.cameraSensitivity = loadCameraSensitivity();
    this.graphicsQuality = loadGraphicsQuality();
    this.graphicsPreset = getGraphicsPreset(this.graphicsQuality);
    this.cinematicIntro = null;
    this._missionSyncTimer = 0;
    this._movementBlocked = false;
    this._isMoving = false;
    this._rafId = null;
    this._qualityToastTimer = null;
    this._init();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.23,
      0.45,
      0.88
    );
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this._applyGraphicsPreset();

    window.addEventListener('resize', () => this._onResize());
    this._bindPointerCamera();
  }

  _getGraphicsPixelRatio() {
    const deviceRatio = window.devicePixelRatio || 1;
    return Math.max(1, Math.min(deviceRatio, this.graphicsPreset.pixelRatioCap));
  }

  _resolveShadowMapType(typeName) {
    return THREE[typeName] ?? THREE.PCFShadowMap;
  }

  _applyGraphicsPreset() {
    if (!this.renderer || !this.graphicsPreset) return;
    const preset = this.graphicsPreset;
    const pixelRatio = this._getGraphicsPixelRatio();

    this.renderer.setPixelRatio(pixelRatio);
    this.composer?.setPixelRatio?.(pixelRatio);
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = this._resolveShadowMapType(preset.shadowMapType);
    this.renderer.toneMappingExposure = preset.exposure;

    if (this.bloomPass) {
      this.bloomPass.enabled = preset.bloom.enabled;
      this.bloomPass.strength = preset.bloom.strength;
      this.bloomPass.radius = preset.bloom.radius;
      this.bloomPass.threshold = preset.bloom.threshold;
    }

    this._applySceneShadowQuality();
    this._syncGraphicsControls();
    this._syncPerformanceHud(this.performance.getSnapshot());
  }

  _applySceneShadowQuality() {
    if (!this.scene || !this.graphicsPreset) return;
    const size = this.graphicsPreset.shadowMapSize;
    this.scene.traverse(object => {
      if (!object.isLight || !object.shadow || !object.castShadow) return;
      object.shadow.mapSize.set(size, size);
      if (object.shadow.map) {
        object.shadow.map.dispose();
        object.shadow.map = null;
      }
      object.shadow.needsUpdate = true;
    });
  }

  _bindPointerCamera() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      this.pointerLook = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.pointerLook || this.inDialogue || this.isPaused || this.cinematicIntro) return;
      const dx = e.clientX - this.pointerLook.x;
      const dy = e.clientY - this.pointerLook.y;
      this.pointerLook = { x: e.clientX, y: e.clientY };
      this.camYaw += dx * 0.0045 * this.cameraSensitivity;
      this.camPitch = Math.max(
        CAM_PITCH_MIN,
        Math.min(CAM_PITCH_MAX, this.camPitch + dy * 0.0025 * this.cameraSensitivity)
      );
      this._updateCameraTarget();
    });
    const clearPointer = () => { this.pointerLook = null; };
    this.canvas.addEventListener('pointerup', clearPointer);
    this.canvas.addEventListener('pointercancel', clearPointer);
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.camDist = Math.max(2.7, Math.min(7.2, this.camDist + e.deltaY * 0.003));
      this._updateCameraTarget();
    }, { passive: false });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this._getGraphicsPixelRatio());
    this.composer?.setPixelRatio?.(this._getGraphicsPixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
  }

  setupDialogue(uiElements) {
    this.dialogue = new DialogueSystem(uiElements);
  }

  setupMissionTracker(uiElements) {
    this.missionUI = uiElements;
    uiElements.toggle?.addEventListener('click', () => {
      this.audio.playUi();
      this.setMissionPanelCollapsed(!this.missionCollapsed);
    });
    this._syncMissionPanelMode();
    this._updateMissionTracker(true);
  }

  setupCinematicIntro(uiElements) {
    this.cinematicUI = uiElements;
    uiElements.skip?.addEventListener('click', () => this.skipCinematicIntro());
  }

  setupAudioControls(uiElements) {
    this.audioUI = uiElements;
    uiElements.toggle?.addEventListener('click', () => {
      this.audio.playUi();
      this.audio.toggleMuted();
      this._syncAudioControls();
    });
    this._syncAudioControls();
  }

  setupGraphicsControls(uiElements) {
    this.graphicsUI = uiElements;
    uiElements.toggle?.addEventListener('click', () => {
      this.audio.playUi();
      this.setGraphicsQuality(getNextGraphicsQuality(this.graphicsQuality), { persist: true });
    });
    this._syncGraphicsControls();
  }

  setupPerformanceHud(uiElements) {
    this.performanceUI = uiElements;
    uiElements.enableAuto?.addEventListener('click', () => {
      this.audio.playUi();
      this.setAutoGraphicsEnabled(true, { persist: true });
      this._hideQualityRecommendation();
    });
    uiElements.dismissRecommendation?.addEventListener('click', () => {
      this.audio.playUi();
      this.qualityRecommendation.dismiss();
      this._hideQualityRecommendation();
    });
    this._syncPerformanceHud(this.performance.getSnapshot());
  }

  setGraphicsQuality(quality, options = {}) {
    this.graphicsQuality = options.persist ? saveGraphicsQuality(quality) : getGraphicsPreset(quality).id;
    this.graphicsPreset = getGraphicsPreset(this.graphicsQuality);
    if (options.source !== 'auto') this.autoQuality.reset();
    this._applyGraphicsPreset();
    return this.graphicsPreset;
  }

  getGraphicsQuality() {
    return this.graphicsQuality;
  }

  setAutoGraphicsEnabled(enabled, options = {}) {
    this.autoGraphicsEnabled = options.persist ? saveAutoGraphicsEnabled(enabled) : Boolean(enabled);
    this.autoQuality.reset();
    this.qualityRecommendation.reset();
    if (this.autoGraphicsEnabled) this._hideQualityRecommendation();
    this._syncPerformanceHud(this.performance.getSnapshot());
    return this.autoGraphicsEnabled;
  }

  getAutoGraphicsEnabled() {
    return this.autoGraphicsEnabled;
  }

  setCameraSensitivity(value, options = {}) {
    this.cameraSensitivity = options.persist ? saveCameraSensitivity(value) : normalizeCameraSensitivity(value);
    return this.cameraSensitivity;
  }

  getCameraSensitivity() {
    return this.cameraSensitivity;
  }

  refreshHudControls() {
    this._syncAudioControls();
    this._syncGraphicsControls();
    this._syncPerformanceHud(this.performance.getSnapshot());
    this._syncMissionPanelMode();
  }

  setMissionPanelCollapsed(collapsed) {
    this.missionCollapsed = Boolean(collapsed);
    this._syncMissionPanelMode();
    return this.missionCollapsed;
  }

  setPlotEngine(pe, gameState) {
    this.plotEngine = pe;
    this.gameState = gameState;
    pe.onEnterExplore = (node) => {
      this.inDialogue = false;
      this.dialogueFocus = null;
      this.dialogue.hide();
      if (this.currentChapterScene && this.currentChapterScene.npcs) {
        this.currentChapterScene.npcs.forEach(n => n.animator && n.animator.setState('idle'));
      }
      if (this.currentChapterScene?.playerAnimator) {
        this.currentChapterScene.playerAnimator.setState('idle');
      }
      this._updateMissionTracker(true);
    };

    pe.onShowDialog = (node) => {
      this.inDialogue = true;
      this._hideInteractionPrompt({ consumeInteract: true });
      this.dialogue.showNode(node, (action, data) => {
        if (action === 'choice') {
           const choice = node.choices[data];
           if (this.currentChapterScene && gameState) {
             gameState.recordChoice(
               this.currentChapterScene.index,
               this.currentChapterScene.id,
               node.id || 'plot_node',
               choice.text,
               choice.impact
             );
           }
           pe.applyChoiceEffects(choice);
           pe.advance(choice.next);
           this._updateMissionTracker(true);
        } else {
           pe.advance(node.next);
           this._updateMissionTracker(true);
        }
      });
    };

    pe.onTriggerEvent = (eventName) => {
       this.audio.playEvent(eventName);
       if (this.currentChapterScene && this.currentChapterScene.handleEvent) {
          this.currentChapterScene.handleEvent(eventName);
       }
    };
  }

  loadChapterScene(chapterScene) {
    this.inDialogue = false;
    this.isPaused = false;
    this.dialogueFocus = null;
    if (this.dialogue) this.dialogue.hide();

    // 清空旧场景
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      if (this.currentChapterScene) this.currentChapterScene.dispose();
    }

    this.scene = new THREE.Scene();
    this.renderPass.scene = this.scene;
    this.renderPass.camera = this.camera;
    this.currentChapterScene = chapterScene;
    this.player = chapterScene.build(this.scene);
    this._applyGraphicsPreset();
    this.audio.startChapterAmbience(chapterScene.index)
      .then(() => this._syncAudioControls())
      .catch(() => this._syncAudioControls());
    this._attachObjectiveMarkers();

    // 重置相机参数
    this.camYaw = 0;
    this.camPitch = CAM_PITCH_DEFAULT;
    this.camDist = CAM_DIST_DEFAULT;
    this.cameraRigPose = null;
    this.cameraRigTarget = null;
    this._updateCameraTarget({ immediate: true });
    this._updateMissionTracker(true);
  }

  playChapterIntro(chapter, options = {}) {
    if (!this.player) return;
    this.cinematicIntro = createIntroState(options);
    this._hideInteractionPrompt({ consumeInteract: true });
    this._renderCinematicIntro(chapter, 0);
    this._applyCinematicPose(getIntroCameraPose(this.cinematicIntro));
  }

  skipCinematicIntro() {
    if (!this.cinematicIntro) return;
    this.audio.playUi();
    const pose = getIntroCameraPose(this.cinematicIntro, this.cinematicIntro.durationMs);
    this._applyCinematicPose(pose);
    this._finishCinematicIntro();
  }

  start() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.lastFrameTime = performance.now();
    this._loop();
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.audio.stopChapterAmbience();
  }

  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    if (this.cinematicIntro) {
      this._updateCinematicIntro(delta);
    }

    const performanceSnapshot = this.performance.record(delta);
    if (performanceSnapshot) {
      this._applyAutoGraphics(performanceSnapshot);
      this._evaluateQualityRecommendation(performanceSnapshot);
      this._syncPerformanceHud(performanceSnapshot);
    }

    const canControlPlayer = !this.isPaused && !this.inDialogue && !this.cinematicIntro;
    if (canControlPlayer) {
      this._handleMovement(delta);
      this._handleCamera(delta);
      this._checkInteraction();
    } else {
      this._hideInteractionPrompt({ consumeInteract: true });
    }

    if (!this.cinematicIntro) {
      this._updateCameraTarget();
      this._applyCameraRig(delta);
      this._updateObjectiveCompass(this.currentMissionState);
    }

    if (this.currentChapterScene) this.currentChapterScene.update(delta);
    this._updateSceneEffects(delta);
    this.audio.updateMovement(delta, { moving: this._isMoving && !this.cinematicIntro, blocked: this._movementBlocked });
    this._missionSyncTimer += delta;
    if (this._missionSyncTimer > 0.18) {
      this._missionSyncTimer = 0;
      this._updateMissionTracker();
    }
    this.composer.render();
  }

  _updateSceneEffects(delta) {
    if (!this.scene) return;
    this.scene.traverse(object => {
      if (typeof object.userData?.tick === 'function') object.userData.tick(delta, object);
    });
  }

  _updateCinematicIntro(delta) {
    const pose = getIntroCameraPose(this.cinematicIntro, delta * 1000);
    this.cinematicIntro.elapsedMs = pose.elapsedMs;
    this._applyCinematicPose(pose);
    this._updateCinematicProgress(pose.progress);
    if (pose.complete) this._finishCinematicIntro();
  }

  _applyCinematicPose(pose) {
    this.camYaw = pose.yaw;
    this.camPitch = pose.pitch;
    this.camDist = pose.distance;
    this._updateCameraTarget({ immediate: true, moving: false, blocked: false });
  }

  _renderCinematicIntro(chapter, progress) {
    if (!this.cinematicUI?.overlay || !chapter) return;
    const ui = this.cinematicUI;
    ui.overlay.classList.remove('hidden', 'fading');
    if (ui.kicker) ui.kicker.textContent = t('cinematic.kicker');
    if (ui.number) ui.number.textContent = chapter.number;
    if (ui.year) ui.year.textContent = chapter.year;
    if (ui.title) ui.title.textContent = chapter.title;
    if (ui.desc) ui.desc.textContent = chapter.desc;
    this._updateCinematicProgress(progress);
  }

  _updateCinematicProgress(progress) {
    if (!this.cinematicUI?.overlay) return;
    const overlayState = getIntroOverlayState(progress);
    this.cinematicUI.overlay.style.opacity = String(Math.max(0, overlayState.opacity));
    if (this.cinematicUI.progressFill) {
      this.cinematicUI.progressFill.style.width = `${Math.round(overlayState.progress * 100)}%`;
    }
    if (!overlayState.visible) this.cinematicUI.overlay.classList.add('fading');
  }

  _finishCinematicIntro() {
    this.cinematicIntro = null;
    if (this.cinematicUI?.overlay) {
      this.cinematicUI.overlay.style.opacity = '';
      this.cinematicUI.overlay.classList.add('hidden');
      this.cinematicUI.overlay.classList.remove('fading');
    }
  }

  _handleMovement(delta) {
    if (!this.player) return;
    const inp = this.input;

    if (inp.turnLeft) this.player.rotation.y += TURN_SPEED * delta;
    if (inp.turnRight) this.player.rotation.y -= TURN_SPEED * delta;

    const anim = this.currentChapterScene?.playerAnimator;
    if (inp.forward || inp.backward) {
      const dir = inp.forward ? 1 : -1;
      const startX = this.player.position.x;
      const startZ = this.player.position.z;
      const dx = Math.sin(this.player.rotation.y) * MOVE_SPEED * delta * dir;
      const dz = Math.cos(this.player.rotation.y) * MOVE_SPEED * delta * dir;
      const next = this._resolvePlayerNavigation(this.player.position.x + dx, this.player.position.z + dz);
      this.player.position.x = next.x;
      this.player.position.z = next.z;
      this._movementBlocked = next.blocked;
      const movedSq = (next.x - startX) ** 2 + (next.z - startZ) ** 2;
      this._isMoving = movedSq > 0.00001;
      if (anim) anim.setState(this._isMoving ? 'walk' : 'idle');
    } else {
      this._movementBlocked = false;
      this._isMoving = false;
      if (anim) anim.setState('idle');
    }

    this._updateCameraTarget();
  }

  _resolvePlayerNavigation(x, z) {
    const sceneObstacles = this.currentChapterScene?.collisionObjects || [];
    const npcObstacles = (this.currentChapterScene?.npcs || []).map(npc => ({
      type: 'circle',
      x: npc.mesh.position.x,
      z: npc.mesh.position.z,
      radius: npc.collisionRadius ?? NPC_COLLISION_RADIUS,
    }));

    return resolvePlayerNavigation(
      { x, z },
      {
        radius: this.currentChapterScene?.playerRadius ?? DEFAULT_PLAYER_RADIUS,
        bounds: this.currentChapterScene?.worldBounds,
        obstacles: [...sceneObstacles, ...npcObstacles],
      }
    );
  }

  _handleCamera(delta) {
    const inp = this.input;
    const speed = CAM_SPEED * this.cameraSensitivity;
    if (inp.camLeft)  this.camYaw -= speed * delta;
    if (inp.camRight) this.camYaw += speed * delta;
    // Mobile look
    if (this.input.lookVector) {
      this.camYaw += this.input.lookVector.x * speed * delta * 2;
      this.camPitch = Math.max(
        CAM_PITCH_MIN,
        Math.min(CAM_PITCH_MAX, this.camPitch - this.input.lookVector.y * speed * delta)
      );
    }
    this._updateCameraTarget();
  }

  _getCameraObstacles() {
    const sceneObstacles = this.currentChapterScene?.collisionObjects || [];
    const npcObstacles = (this.currentChapterScene?.npcs || []).map(npc => ({
      type: 'circle',
      x: npc.mesh.position.x,
      z: npc.mesh.position.z,
      radius: npc.collisionRadius ?? NPC_COLLISION_RADIUS,
    }));
    return [...sceneObstacles, ...npcObstacles];
  }

  _updateCameraTarget(options = {}) {
    if (!this.player) return;
    if (this.inDialogue && this.dialogueFocus?.mesh?.position) {
      this.cameraRigTarget = computeDialogueCameraTarget(
        this.player.position,
        this.dialogueFocus.mesh.position
      );
      return;
    }

    this.cameraRigTarget = computeCameraRigTarget({
      playerPosition: this.player.position,
      playerRotationY: this.player.rotation.y,
      yawOffset: this.camYaw,
      pitch: this.camPitch,
      distance: this.camDist,
      moving: options.moving ?? this._isMoving,
      blocked: options.blocked ?? this._movementBlocked,
      obstacles: this._getCameraObstacles(),
    });
    if (options.immediate) {
      this.cameraRigPose = smoothCameraRigPose(null, this.cameraRigTarget, 0);
      this._setCameraFromPose(this.cameraRigPose);
    }
  }

  _applyCameraRig(delta) {
    if (!this.cameraRigTarget) return;
    this.cameraRigPose = smoothCameraRigPose(this.cameraRigPose, this.cameraRigTarget, delta);
    this._setCameraFromPose(this.cameraRigPose);
  }

  _setCameraFromPose(pose) {
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
    if (Math.abs(this.camera.fov - pose.fov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  _checkInteraction() {
    if (!this.player || !this.currentChapterScene) return;
    const activeIds = this.plotEngine?.getActiveInteractionIds?.();
    const allowedIds = Array.isArray(activeIds) ? new Set(activeIds) : null;
    const npcs = (this.currentChapterScene.npcs || [])
      .filter(npc => !allowedIds || allowedIds.has(npc.dialogueId));
    const promptState = buildInteractionPromptState(this.player, npcs, t, {
      awarenessDist: INTERACT_AWARENESS_DIST,
      interactDist: INTERACT_DIST,
      readyAssistDist: INTERACT_READY_ASSIST_DIST,
    });

    const promptEl = document.getElementById('interact-prompt');
    const iconEl = promptEl?.querySelector('.interact-icon');
    const textEl = document.getElementById('interact-text');
    if (promptState.visible) {
      promptEl?.classList.remove('hidden');
      promptEl?.classList.toggle('ready', promptState.canInteract);
      promptEl?.style.setProperty('--interact-progress', `${Math.round(promptState.progress * 100)}%`);
      if (iconEl) iconEl.textContent = promptState.canInteract ? 'E' : '→';
      if (textEl) {
        textEl.textContent = promptState.canInteract
          ? t('game.interactPrompt', { name: promptState.name })
          : t('game.approachPrompt', {
              name: promptState.name,
              distance: promptState.distanceLabel,
            });
      }
      if (this.input.consumeInteract() && promptState.canInteract) this._startDialogue(promptState.npc);
    } else {
      this._hideInteractionPrompt({ consumeInteract: true });
    }
  }

  _hideInteractionPrompt(options = {}) {
    const promptEl = document.getElementById('interact-prompt');
    promptEl?.classList.add('hidden');
    promptEl?.classList.remove('ready');
    promptEl?.style.setProperty('--interact-progress', '0%');
    if (options.consumeInteract) this.input.consumeInteract();
  }

  _syncAudioControls() {
    if (!this.audioUI?.toggle) return;
    const label = this.audio.muted ? t('audio.enable') : t('audio.mute');
    this.audioUI.toggle.textContent = this.audio.muted ? '♪' : '♫';
    this.audioUI.toggle.setAttribute('aria-label', label);
    this.audioUI.toggle.setAttribute('title', label);
    this.audioUI.toggle.setAttribute('aria-pressed', String(!this.audio.muted));
    this.audioUI.toggle.classList.toggle('muted', this.audio.muted);
  }

  _syncGraphicsControls() {
    if (!this.graphicsUI?.toggle || !this.graphicsPreset) return;
    const preset = this.graphicsPreset;
    const label = t('graphics.qualityLabel', { quality: t(preset.labelKey) });
    this.graphicsUI.toggle.setAttribute('aria-label', label);
    this.graphicsUI.toggle.setAttribute('title', label);
    this.graphicsUI.toggle.dataset.quality = preset.id;
    this.graphicsUI.toggle.dataset.shortLabel = preset.shortLabel;
    this.graphicsUI.toggle.textContent = preset.icon;
  }

  _syncPerformanceHud(snapshot) {
    if (!this.performanceUI?.badge || !snapshot) return;
    const preset = this.graphicsPreset;
    const fpsLabel = snapshot.fpsLabel ?? '--';
    const label = t('performance.badgeLabel', {
      fps: fpsLabel,
      quality: t(preset.labelKey),
    });
    this.performanceUI.badge.dataset.status = snapshot.status;
    this.performanceUI.badge.dataset.auto = String(this.autoGraphicsEnabled);
    this.performanceUI.badge.setAttribute('title', label);
    this.performanceUI.badge.setAttribute('aria-label', label);
    if (this.performanceUI.fps) this.performanceUI.fps.textContent = fpsLabel;
    if (this.performanceUI.quality) this.performanceUI.quality.textContent = preset.shortLabel;
    if (this.performanceUI.auto) this.performanceUI.auto.textContent = this.autoGraphicsEnabled ? 'A' : '';
  }

  _syncMissionPanelMode() {
    const ui = this.missionUI;
    if (!ui?.panel) return;
    ui.panel.classList.toggle('collapsed', this.missionCollapsed);
    ui.list?.setAttribute('aria-hidden', String(this.missionCollapsed));
    if (!ui.toggle) return;
    const label = t(this.missionCollapsed ? 'mission.expand' : 'mission.collapse');
    ui.toggle.textContent = this.missionCollapsed ? '▸' : '▾';
    ui.toggle.setAttribute('aria-label', label);
    ui.toggle.setAttribute('title', label);
    ui.toggle.setAttribute('aria-expanded', String(!this.missionCollapsed));
  }

  _applyAutoGraphics(snapshot) {
    if (!this.autoGraphicsEnabled || this.isPaused || !this.currentChapterScene) return;
    const action = this.autoQuality.record(snapshot, this.graphicsQuality);
    if (!action) return;
    this.setGraphicsQuality(action.to, { persist: true, source: 'auto' });
    this._showAutoQualityAdjustment(action);
  }

  _evaluateQualityRecommendation(snapshot) {
    if (this.isPaused || !this.currentChapterScene) return;
    const recommendation = this.qualityRecommendation.record(snapshot, {
      autoEnabled: this.autoGraphicsEnabled,
      currentQuality: this.graphicsQuality,
    });
    if (recommendation) this._showQualityRecommendation(recommendation);
  }

  _showQualityRecommendation(recommendation) {
    if (!this.performanceUI?.recommendation) return;
    this.performanceUI.recommendation.classList.remove('hidden');
    this.performanceUI.recommendation.dataset.status = recommendation.status;
    if (this.performanceUI.recommendationText) {
      this.performanceUI.recommendationText.textContent = t('performance.recommendAutoQuality');
    }
  }

  _hideQualityRecommendation() {
    this.performanceUI?.recommendation?.classList.add('hidden');
  }

  _showAutoQualityAdjustment(action) {
    if (!this.performanceUI?.adjustmentToast || !this.performanceUI.adjustmentText) return;
    const preset = getGraphicsPreset(action.to);
    this.performanceUI.adjustmentText.textContent = t('performance.autoAdjusted', {
      quality: t(preset.labelKey),
    });
    this.performanceUI.adjustmentToast.classList.remove('hidden');
    if (this._qualityToastTimer) clearTimeout(this._qualityToastTimer);
    this._qualityToastTimer = setTimeout(() => {
      this.performanceUI?.adjustmentToast?.classList.add('hidden');
      this._qualityToastTimer = null;
    }, 3600);
  }

  _attachObjectiveMarkers() {
    const npcs = this.currentChapterScene?.npcs || [];
    npcs.forEach(npc => {
      const marker = this._createObjectiveMarker();
      npc.mesh.add(marker);
      npc.objectiveMarker = marker;
    });
  }

  _createObjectiveMarker() {
    const group = new THREE.Group();
    group.name = 'objective-marker';
    group.position.y = 1.85;

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf0cf73,
      emissive: 0x8a5f14,
      emissiveIntensity: 0.8,
      metalness: 0.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.88,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.018, 8, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.userData.role = 'ring';
    group.add(ring);

    const floorMat = ringMat.clone();
    floorMat.opacity = 0.38;
    floorMat.emissiveIntensity = 0.48;
    const floorRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 64), floorMat);
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = -1.78;
    floorRing.userData.role = 'floorRing';
    group.add(floorRing);

    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xffda7a,
      emissive: 0x9a5c00,
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0.25,
    });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), diamondMat);
    diamond.position.y = 0.36;
    diamond.userData.role = 'diamond';
    group.add(diamond);

    const halo = new THREE.PointLight(0xffd27a, 1.2, 3.8);
    halo.position.y = 0.18;
    halo.userData.role = 'halo';
    group.add(halo);

    group.userData.tick = (delta, object) => {
      object.userData.time = (object.userData.time || 0) + delta;
      object.rotation.y += delta * 1.8;
      object.position.y = 1.85 + Math.sin(object.userData.time * 2.3) * 0.08;
      const diamondNode = object.children.find(child => child.userData.role === 'diamond');
      if (diamondNode) diamondNode.rotation.y -= delta * 3.2;
    };
    return group;
  }

  _updateObjectiveMarkers(missionState) {
    const npcs = this.currentChapterScene?.npcs || [];
    const activeObjective = missionState.objectives
      .filter(objective => !objective.done)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];

    npcs.forEach(npc => {
      const marker = npc.objectiveMarker;
      if (!marker) return;
      const objective = missionState.objectives.find(item => item.id === npc.dialogueId);
      if (!objective) {
        marker.visible = false;
        return;
      }
      const done = Boolean(objective?.done);
      const active = objective?.id === activeObjective?.id;
      const color = done ? 0x7fe39b : active ? 0xffd36b : 0xf0cf73;
      const emissive = done ? 0x1f7042 : 0x8a5f14;
      marker.visible = true;
      marker.scale.setScalar(done ? 0.72 : active ? 1.16 : 0.95);
      marker.traverse(child => {
        if (child.isPointLight) {
          child.color.setHex(color);
          child.intensity = done ? 0.42 : active ? 1.6 : 1.0;
        }
        if (child.material?.color) child.material.color.setHex(color);
        if (child.material?.emissive) child.material.emissive.setHex(emissive);
        if (child.material && child.userData.role === 'ring') child.material.opacity = done ? 0.45 : 0.88;
        if (child.material && child.userData.role === 'floorRing') child.material.opacity = done ? 0.2 : active ? 0.58 : 0.38;
      });
    });
  }

  _updateMissionTracker(force = false) {
    if (!this.missionUI?.panel || !this.currentChapterScene) return;
    const missionState = buildMissionState(this.currentChapterScene, this.gameState, t, this.player, {
      activeDialogueIds: this.plotEngine?.getActiveInteractionIds?.(),
    });
    this.currentMissionState = missionState;
    this._updateObjectiveMarkers(missionState);
    this._updateObjectiveCompass(missionState);

    const { panel, list, progressFill, progressText } = this.missionUI;
    if (missionState.total === 0) {
      panel.classList.add('hidden');
      this._hideObjectiveCompass();
      return;
    }
    panel.classList.remove('hidden');
    this._syncMissionPanelMode();
    if (progressFill) progressFill.style.width = `${Math.round(missionState.progress * 100)}%`;
    if (progressText) {
      progressText.textContent = t('mission.progress', {
        complete: missionState.completed,
        total: missionState.total,
      });
    }
    if (list && (force || !this.inDialogue)) {
      list.innerHTML = missionState.objectives.map(objective => `
        <li class="mission-objective ${objective.done ? 'done' : ''}">
          <span class="mission-status">${objective.done ? '✓' : '◆'}</span>
          <span class="mission-name">${escapeHtml(objective.name)}</span>
          <span class="mission-distance">${escapeHtml(objective.done ? t('status.complete') : objective.distanceLabel)}</span>
        </li>
      `).join('');
    }
  }

  _hideObjectiveCompass() {
    this.missionUI?.compass?.classList.add('hidden');
  }

  _updateObjectiveCompass(missionState) {
    const ui = this.missionUI;
    if (!ui?.compass || !missionState || !this.player) return;
    if (this.inDialogue) {
      this._hideObjectiveCompass();
      return;
    }

    const state = buildObjectiveCompassState(
      missionState,
      this.player.position,
      this.cameraRigPose || this.cameraRigTarget
    );

    ui.compass.classList.toggle('hidden', !state.visible);
    if (!state.visible) return;

    ui.compass.dataset.side = state.side;
    ui.compass.style.setProperty('--objective-offset', `${state.offsetPx}px`);
    ui.compass.style.setProperty('--objective-arrow-rotation', `${state.arrowRotationDeg}deg`);
    ui.compass.setAttribute('aria-label', t('mission.compassLabel', {
      name: state.name,
      distance: state.distanceLabel,
    }));
    if (ui.compassName) ui.compassName.textContent = state.name;
    if (ui.compassDistance) ui.compassDistance.textContent = state.distanceLabel;
  }

  _startDialogue(npc) {
    if (!this.dialogue || !this.currentChapterScene) return;

    this.audio.playUi();
    this._hideInteractionPrompt({ consumeInteract: true });
    this.dialogueFocus = npc;
    if (npc.animator) npc.animator.setState('talk');
    if (this.currentChapterScene.playerAnimator) {
      this.currentChapterScene.playerAnimator.setState('talk');
    }
    const facing = computeDialogueFacing(this.player.position, npc.mesh.position);
    this.player.rotation.y = facing.playerYaw;
    npc.mesh.rotation.y = facing.npcYaw;
    this._updateCameraTarget();

    if (this.plotEngine && this.plotEngine.handleInteract(npc.dialogueId)) {
      return;
    }

    // Legacy fallback
    this.inDialogue = true;
    const nodes = this.currentChapterScene.getDialogue(npc.dialogueId);
    if (!nodes || nodes.length === 0) {
      this.inDialogue = false;
      this.dialogueFocus = null;
      return;
    }

    let nodeIndex = 0;
    const showLegacyNode = () => {
      if (nodeIndex >= nodes.length) {
        this.inDialogue = false;
        this.dialogueFocus = null;
        this.dialogue.hide();
        if (npc.animator) npc.animator.setState('idle');
        if (this.currentChapterScene?.playerAnimator) {
          this.currentChapterScene.playerAnimator.setState('idle');
        }
        this._checkChapterComplete();
        return;
      }
      const node = nodes[nodeIndex];
      this.dialogue.showNode(node, (action, data) => {
        if (action === 'choice') {
           const choice = node.choices[data];
           if (this.gameState) {
             this.gameState.recordChoice(
               this.currentChapterScene.index,
               this.currentChapterScene.id,
               node.id,
               choice.text,
               choice.impact
             );
           }
           if (choice.next) {
             nodeIndex = nodes.findIndex(n => n.id === choice.next);
           } else {
             nodeIndex = nodes.length;
           }
           showLegacyNode();
        } else {
           nodeIndex++;
           showLegacyNode();
        }
      });
    };
    showLegacyNode();
  }

  _checkChapterComplete() {
    // Legacy complete hook
    if (this.onChapterComplete) {
      setTimeout(() => this.onChapterComplete(), 500);
    }
  }

  setMobileMoveVector(x, y) { this.input.moveVector = { x, y }; }
  setMobileLookVector(x, y) { this.input.lookVector = { x, y }; }
  triggerInteract() { this.input.interactPressed = true; }
  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
}
