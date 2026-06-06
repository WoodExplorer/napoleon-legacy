import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter2Scene {
  constructor() {
    this.id = 'chapter2';
    this.index = 1;
    this.npcs = [];
    this.scene = null;
    this.barrels = [];
  }

  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x8b6914, 0xc8a050);
    SceneBuilder.addFog(scene, 0x9a7840, 20, 50);

    const ground = SceneBuilder.createGround(0x8b7355, 50);
    scene.add(ground);
    SceneBuilder.createPath(scene, [[-6, 1.5], [-1, -0.5], [4, -3], [8, -5]], 1.4, 0x7d684e);
    SceneBuilder.createAtmosphere(scene, { count: 170, spread: 42, height: 7, color: 0xd0b08a, size: 0.12, speed: 0.08, opacity: 0.28 });
    this._buildFortress(scene);

    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const general = buildNPCCharacter({ clothColor: 0x3a5a3a, pantColor: 0x2a402a, hatColor: 0x1a2a1a, name: 'carteaux' });
    general.position.set(4, 0, -3);
    general.rotation.y = -Math.PI / 3;
    scene.add(general);
    this.npcs.push({ mesh: general, nameKey: 'characters.carteaux', animator: new CharacterAnimator(general), dialogueId: 'general', interactDist: 2.5 });

    const officer = buildNPCCharacter({ clothColor: 0x2a4a6a, pantColor: 0x1a2a3a, name: 'junot' });
    officer.position.set(-3, 0, 2);
    officer.rotation.y = Math.PI / 4;
    scene.add(officer);
    this.npcs.push({ mesh: officer, nameKey: 'characters.junot', animator: new CharacterAnimator(officer), dialogueId: 'junot', interactDist: 2.5 });

    return this.player;
  }

  _buildFortress(scene) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8870, roughness: 1 });

    // 堡垒主体
    const fort = SceneBuilder.createBuilding(6, 4, 4, 0x9a8870);
    fort.position.set(8, 2, -5);
    scene.add(fort);

    // 炮台
    const battlements = SceneBuilder.createBuilding(7, 0.8, 0.5, 0x8a7860);
    battlements.position.set(8, 4.4, -3);
    scene.add(battlements);

    // 大炮（程序化）
    [-2, 0, 2].forEach(x => {
      const barrelGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 12);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.3 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(x, 1, 0);
      barrel.castShadow = true;

      const wheelGeo = new THREE.TorusGeometry(0.25, 0.05, 8, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.25, 0);
      scene.add(barrel);
      scene.add(wheel);
      this.barrels.push(barrel);
    });

    // 沙袋掩体
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 });
    for (let i = -3; i <= 3; i++) {
      const bagGeo = new THREE.SphereGeometry(0.3, 8, 6);
      bagGeo.scale(1.2, 0.7, 0.8);
      const bag = new THREE.Mesh(bagGeo, bagMat);
      bag.position.set(i * 0.7, 0.21, -2);
      bag.castShadow = true;
      scene.add(bag);
    }

    // 远处港口水面
    const water = SceneBuilder.createAnimatedWater(30, 15, 0x1a4a6a);
    water.position.set(0, 0.02, -20);
    scene.add(water);

    [-2.8, 2.8].forEach(x => {
      const banner = SceneBuilder.createBanner(0x1a3a9a);
      banner.position.set(x, 0, -1.8);
      banner.rotation.y = x > 0 ? -0.3 : 0.3;
      scene.add(banner);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }

  handleEvent(eventName) {
    if (eventName === 'artillery_fire') {
      // 动态场景效果：开炮特效
      this.barrels.forEach((barrel, i) => {
        setTimeout(() => {
          // 炮口闪光
          const flash = new THREE.PointLight(0xffaa00, 10, 5);
          flash.position.set(0, 1.2, 0); // barrel local space relative tip
          barrel.add(flash);
          
          // 炮管后座
          barrel.position.z += 0.2;
          
          setTimeout(() => {
            barrel.remove(flash);
            barrel.position.z -= 0.2;
          }, 100);
        }, i * 200);
      });
      
      // 屏幕震动
      const ui = document.getElementById('game-ui');
      if (ui) {
         ui.style.animation = 'shake 0.5s';
         setTimeout(() => ui.style.animation = '', 500);
      }
    }
  }

  dispose() { this.npcs = []; this.barrels = []; }
}
