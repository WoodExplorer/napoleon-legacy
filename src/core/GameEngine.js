/**
 * GameEngine - 3D游戏引擎核心
 * 管理Three.js渲染循环、玩家控制、NPC交互、场景切换
 */
import * as THREE from 'three';
import { InputController } from '../controls/InputController.js';
import { DialogueSystem } from '../dialogue/DialogueSystem.js';
import { t } from '../i18n/index.js';

const MOVE_SPEED = 4.5;
const TURN_SPEED = 2.0;
const CAM_SPEED = 1.8;
const INTERACT_DIST = 2.5;
const CAM_DIST_DEFAULT = 3.8;
const CAM_PITCH_DEFAULT = -0.18;

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.lastFrameTime = performance.now();
    this.currentChapterScene = null;
    this.player = null;
    this.input = new InputController();
    this.dialogue = null;
    this.plotEngine = null;
    this.inDialogue = false;
    this.isPaused = false;
    this.onChapterComplete = null;
    this.camYaw = 0;
    this.camPitch = CAM_PITCH_DEFAULT;
    this.camDist = CAM_DIST_DEFAULT;
    this.pointerLook = null;
    this._rafId = null;
    this._init();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);

    window.addEventListener('resize', () => this._onResize());
    this._bindPointerCamera();
  }

  _bindPointerCamera() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      this.pointerLook = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.pointerLook || this.inDialogue || this.isPaused) return;
      const dx = e.clientX - this.pointerLook.x;
      const dy = e.clientY - this.pointerLook.y;
      this.pointerLook = { x: e.clientX, y: e.clientY };
      this.camYaw += dx * 0.0045;
      this.camPitch = Math.max(-0.78, Math.min(0.18, this.camPitch + dy * 0.0025));
      this._updateCamera();
    });
    const clearPointer = () => { this.pointerLook = null; };
    this.canvas.addEventListener('pointerup', clearPointer);
    this.canvas.addEventListener('pointercancel', clearPointer);
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.camDist = Math.max(2.7, Math.min(7.2, this.camDist + e.deltaY * 0.003));
      this._updateCamera();
    }, { passive: false });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupDialogue(uiElements) {
    this.dialogue = new DialogueSystem(uiElements);
  }

  setPlotEngine(pe, gameState) {
    this.plotEngine = pe;
    pe.onEnterExplore = (node) => {
      this.inDialogue = false;
      this.dialogue.hide();
      if (this.currentChapterScene && this.currentChapterScene.npcs) {
        this.currentChapterScene.npcs.forEach(n => n.animator && n.animator.setState('idle'));
      }
      if (this.currentChapterScene?.playerAnimator) {
        this.currentChapterScene.playerAnimator.setState('idle');
      }
    };

    pe.onShowDialog = (node) => {
      this.inDialogue = true;
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
           pe.advance(choice.next);
        } else {
           pe.advance(node.next);
        }
      });
    };

    pe.onTriggerEvent = (eventName) => {
       if (this.currentChapterScene && this.currentChapterScene.handleEvent) {
          this.currentChapterScene.handleEvent(eventName);
       }
    };
  }

  loadChapterScene(chapterScene) {
    this.inDialogue = false;
    this.isPaused = false;
    if (this.dialogue) this.dialogue.hide();

    // 清空旧场景
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      if (this.currentChapterScene) this.currentChapterScene.dispose();
    }

    this.scene = new THREE.Scene();
    this.currentChapterScene = chapterScene;
    this.player = chapterScene.build(this.scene);

    // 重置相机参数
    this.camYaw = 0;
    this.camPitch = CAM_PITCH_DEFAULT;
    this._updateCamera();
  }

  start() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.lastFrameTime = performance.now();
    this._loop();
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    if (!this.isPaused && !this.inDialogue) {
      this._handleMovement(delta);
      this._handleCamera(delta);
      this._checkInteraction();
    }

    if (this.currentChapterScene) this.currentChapterScene.update(delta);
    this._updateSceneEffects(delta);
    this.renderer.render(this.scene, this.camera);
  }

  _updateSceneEffects(delta) {
    if (!this.scene) return;
    this.scene.traverse(object => {
      if (typeof object.userData?.tick === 'function') object.userData.tick(delta, object);
    });
  }

  _handleMovement(delta) {
    if (!this.player) return;
    const inp = this.input;

    if (inp.turnLeft) this.player.rotation.y += TURN_SPEED * delta;
    if (inp.turnRight) this.player.rotation.y -= TURN_SPEED * delta;

    const anim = this.currentChapterScene?.playerAnimator;
    if (inp.forward || inp.backward) {
      const dir = inp.forward ? 1 : -1;
      const dx = Math.sin(this.player.rotation.y) * MOVE_SPEED * delta * dir;
      const dz = Math.cos(this.player.rotation.y) * MOVE_SPEED * delta * dir;
      this.player.position.x += dx;
      this.player.position.z += dz;
      if (anim) anim.setState('walk');
    } else {
      if (anim) anim.setState('idle');
    }

    this._updateCamera();
  }

  _handleCamera(delta) {
    const inp = this.input;
    if (inp.camLeft)  this.camYaw -= CAM_SPEED * delta;
    if (inp.camRight) this.camYaw += CAM_SPEED * delta;
    // Mobile look
    if (this.input.lookVector) {
      this.camYaw += this.input.lookVector.x * CAM_SPEED * delta * 2;
      this.camPitch = Math.max(-0.8, Math.min(0, this.camPitch - this.input.lookVector.y * CAM_SPEED * delta));
    }
    this._updateCamera();
  }

  _updateCamera() {
    if (!this.player) return;
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;
    const totalYaw = this.player.rotation.y + this.camYaw;
    const cx = px - Math.sin(totalYaw) * this.camDist * Math.cos(this.camPitch);
    const cy = py + 2.5 + this.camDist * Math.sin(-this.camPitch);
    const cz = pz - Math.cos(totalYaw) * this.camDist * Math.cos(this.camPitch);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(px, py + 1.2, pz);
  }

  _checkInteraction() {
    if (!this.player || !this.currentChapterScene) return;
    const npcs = this.currentChapterScene.npcs || [];
    let nearest = null, nearestDist = Infinity;

    npcs.forEach(npc => {
      const dx = npc.mesh.position.x - this.player.position.x;
      const dz = npc.mesh.position.z - this.player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < (npc.interactDist || INTERACT_DIST) && dist < nearestDist) {
        nearest = npc; nearestDist = dist;
      }
    });

    const promptEl = document.getElementById('interact-prompt');
    const textEl = document.getElementById('interact-text');
    if (nearest) {
      promptEl?.classList.remove('hidden');
      if (textEl) {
        const name = nearest.nameKey ? t(nearest.nameKey) : nearest.name;
        textEl.textContent = t('game.interactPrompt', { name });
      }
      if (this.input.consumeInteract()) this._startDialogue(nearest);
    } else {
      promptEl?.classList.add('hidden');
    }
  }

  _startDialogue(npc) {
    if (!this.dialogue || !this.currentChapterScene) return;

    if (npc.animator) npc.animator.setState('talk');
    if (this.currentChapterScene.playerAnimator) {
      this.currentChapterScene.playerAnimator.setState('talk');
    }
    const dx = npc.mesh.position.x - this.player.position.x;
    const dz = npc.mesh.position.z - this.player.position.z;
    this.player.rotation.y = Math.atan2(dx, dz);

    if (this.plotEngine && this.plotEngine.handleInteract(npc.dialogueId)) {
      return;
    }

    // Legacy fallback
    this.inDialogue = true;
    const nodes = this.currentChapterScene.getDialogue(npc.dialogueId);
    if (!nodes || nodes.length === 0) {
      this.inDialogue = false;
      return;
    }

    let nodeIndex = 0;
    const showLegacyNode = () => {
      if (nodeIndex >= nodes.length) {
        this.inDialogue = false;
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
           import('./GameState.js').then(({gameState}) => {
             gameState.recordChoice(
               this.currentChapterScene.index,
               this.currentChapterScene.id,
               node.id,
               choice.text,
               choice.impact
             );
           });
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
