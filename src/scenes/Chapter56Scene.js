import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

// Chapter 5: Moscow
export class Chapter5Scene {
  constructor() {
    this.id = 'chapter5'; this.index = 4;
    this.npcs = []; this.scene = null;
    this.worldBounds = { minX: -20, maxX: 20, minZ: -18, maxZ: 14 };
    this.collisionObjects = [
      { type: 'box', x: 7, z: -8, width: 5.8, depth: 5.8 },
      { type: 'circle', x: 7, z: -8, radius: 1.35 },
      { type: 'box', x: -7, z: -6, width: 3.6, depth: 3.6 },
      { type: 'box', x: 0, z: -20, width: 30, depth: 5 },
    ];
  }
  build(scene) {
    this.scene = scene;
    const ambient = new THREE.AmbientLight(0xa0c0e0, 0.8);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    sun.position.set(-5, 8, 3); sun.castShadow = true;
    scene.add(sun);
    SceneBuilder.createSkybox(scene, 0x8090b0, 0xd0d8e0);
    SceneBuilder.addFog(scene, 0xd0d8e8, 15, 40);
    scene.add(SceneBuilder.createGround(0xe8eef5, 60));
    SceneBuilder.createPath(scene, [[-6, 2], [-2, 0], [3, -4], [7, -8]], 1.3, 0xd3d7da);
    SceneBuilder.createAtmosphere(scene, { count: 260, spread: 46, height: 9, color: 0xffffff, size: 0.075, speed: 0.75, opacity: 0.7 });
    this._buildMoscow(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const murat = buildNPCCharacter({ clothColor: 0x8b1a1a, pantColor: 0x5c1010, hatColor: 0x5c0000, name: 'murat' });
    murat.position.set(3.5, 0, -1.5);
    murat.rotation.y = -Math.PI / 3;
    scene.add(murat);
    this.npcs.push({ mesh: murat, nameKey: 'characters.murat', animator: new CharacterAnimator(murat), dialogueId: 'murat', objectiveFlag: 'ch5_talked_murat', interactDist: 2.5 });

    const caulaincourt = buildNPCCharacter({ clothColor: 0x3a3a5a, pantColor: 0x2a2a3a, name: 'caulaincourt' });
    caulaincourt.position.set(-3, 0, 2);
    caulaincourt.rotation.y = Math.PI / 3;
    scene.add(caulaincourt);
    this.npcs.push({ mesh: caulaincourt, nameKey: 'characters.caulaincourt', animator: new CharacterAnimator(caulaincourt), dialogueId: 'caulaincourt', objectiveFlag: 'ch5_talked_caulaincourt', interactDist: 2.5 });
    return this.player;
  }

  _buildMoscow(scene) {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.9 });
    // 莫斯科建筑（东正教风格）
    const church = SceneBuilder.createBuilding(5, 6, 5, 0xe8dcc8);
    church.position.set(7, 3, -8);
    scene.add(church);
    // 洋葱头穹顶
    const domeGeo = new THREE.SphereGeometry(1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.5, roughness: 0.3 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(7, 6.5, -8);
    scene.add(dome);
    // 烧毁建筑（部分）
    const burnedMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
    const burned = SceneBuilder.createBuilding(3, 2, 3, 0x3a2a1a);
    burned.position.set(-7, 1, -6);
    scene.add(burned);
    // 雪地效果（白色层叠）
    for (let i = 0; i < 8; i++) {
      const sGeo = new THREE.PlaneGeometry(1.5 + Math.random(), 1 + Math.random());
      const snow = new THREE.Mesh(sGeo, snowMat);
      snow.rotation.x = -Math.PI / 2;
      snow.position.set((Math.random()-0.5)*20, 0.03, (Math.random()-0.5)*15);
      scene.add(snow);
    }
    // 退却中的士兵（静态）
    const soldierMat = new THREE.MeshStandardMaterial({ color: 0x6a8aaa, roughness: 1 });
    [-3,-1,1,3].forEach(x => {
      const sg = new THREE.BoxGeometry(0.25, 1.2, 0.2);
      const sm = new THREE.Mesh(sg, soldierMat);
      sm.position.set(x, 0.6, -12 + Math.random()*2);
      sm.rotation.y = Math.random() * 0.5 - 0.25;
      scene.add(sm);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }
  dispose() { this.npcs = []; }
}

// Chapter 6: Waterloo
export class Chapter6Scene {
  constructor() {
    this.id = 'chapter6'; this.index = 5;
    this.npcs = []; this.scene = null;
    this.worldBounds = { minX: -22, maxX: 22, minZ: -22, maxZ: 14 };
    this.collisionObjects = [
      { type: 'circle', x: -6, z: -10, radius: 6 },
      { type: 'circle', x: -4, z: -2.5, radius: 0.55 },
      { type: 'circle', x: 4, z: -2.5, radius: 0.55 },
    ];
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x4a3a2a, 0x8a6a4a);
    SceneBuilder.addFog(scene, 0x8a7a6a, 18, 45);
    scene.add(SceneBuilder.createGround(0x6a5a3a, 60));
    SceneBuilder.createPath(scene, [[-7, 1], [-2, -1], [2, -4], [7, -9]], 1.45, 0x4e4434);
    SceneBuilder.createAtmosphere(scene, { count: 240, spread: 48, height: 7, color: 0x7c6a58, size: 0.16, speed: 0.045, opacity: 0.34 });
    this._buildWaterloo(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const ney = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe0d8c0, hatColor: 0x1a1a1a, name: 'ney' });
    ney.position.set(3, 0, -2);
    ney.rotation.y = -Math.PI / 4;
    scene.add(ney);
    this.npcs.push({ mesh: ney, nameKey: 'characters.ney', animator: new CharacterAnimator(ney), dialogueId: 'ney', objectiveFlag: 'ch6_talked_ney', interactDist: 2.5 });

    const grouchy = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe0d8c0, name: 'grouchy' });
    grouchy.position.set(-3.5, 0, 1.5);
    grouchy.rotation.y = Math.PI / 4;
    scene.add(grouchy);
    this.npcs.push({ mesh: grouchy, nameKey: 'characters.grouchy', animator: new CharacterAnimator(grouchy), dialogueId: 'grouchy', objectiveFlag: 'ch6_talked_grouchy', interactDist: 2.5 });
    return this.player;
  }

  _buildWaterloo(scene) {
    const hillGeo = new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 1 });
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(-6, -11, -10);
    scene.add(hill);

    // 暮色粒子效果（静态烟）
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 10; i++) {
      const sg = new THREE.SphereGeometry(0.5 + Math.random(), 6, 5);
      const sm = new THREE.Mesh(sg, smokeMat);
      sm.position.set((Math.random()-0.5)*20, 1+Math.random()*2, -15 - Math.random()*8);
      sm.scale.set(1+Math.random()*2, 1+Math.random(), 1+Math.random()*1.5);
      scene.add(sm);
    }

    [-4, 4].forEach(x => {
      const banner = SceneBuilder.createBanner(0x233f73);
      banner.position.set(x, 0, -2.5);
      banner.rotation.y = x > 0 ? -0.35 : 0.35;
      scene.add(banner);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }
  dispose() { this.npcs = []; }
}
