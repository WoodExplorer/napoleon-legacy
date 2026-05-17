/**
 * GameEngine - 3D游戏引擎核心
 * 管理Three.js渲染循环、玩家控制、NPC交互、场景切换
 */
import * as THREE from 'three';
import { InputController } from '../controls/InputController.js';
import { DialogueSystem } from '../dialogue/DialogueSystem.js';

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
    this.clock = new THREE.Clock();
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
    this._rafId = null;
    this._init();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);

    window.addEventListener('resize', () => this._onResize());
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
    this._loop();
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused && !this.inDialogue) {
      this._handleMovement(delta);
      this._handleCamera(delta);
      this._checkInteraction();
    }

    if (this.currentChapterScene) this.currentChapterScene.update(delta);
    this.renderer.render(this.scene, this.camera);
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
      if (textEl) textEl.textContent = `与 ${nearest.name} 交谈`;
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
