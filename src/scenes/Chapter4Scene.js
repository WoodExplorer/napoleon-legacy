import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

// Chapter 4: Austerlitz
export class Chapter4Scene {
  constructor() {
    this.id = 'chapter4'; this.index = 3;
    this.npcs = []; this.scene = null;
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x3a4a6a, 0x9aaa8a);
    SceneBuilder.addFog(scene, 0xa0a890, 20, 55);
    scene.add(SceneBuilder.createGround(0x7a8a6a, 60));
    SceneBuilder.createPath(scene, [[-7, 1], [-2, -1], [1, -4], [6, -8]], 1.2, 0x6d6550);
    SceneBuilder.createAtmosphere(scene, { count: 220, spread: 50, height: 8, color: 0xb0a090, size: 0.14, speed: 0.035, opacity: 0.32 });
    SceneBuilder.createInstancedFoliage(scene, { count: 80, spread: 42, color: 0x596f48 });
    this._buildBattlefield(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const berthier = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe8e0d0, hatColor: 0x1a1a1a, name: 'berthier' });
    berthier.position.set(3, 0, -2);
    berthier.rotation.y = -Math.PI / 4;
    scene.add(berthier);
    this.npcs.push({ mesh: berthier, nameKey: 'characters.berthier', animator: new CharacterAnimator(berthier), dialogueId: 'berthier', objectiveFlag: 'ch4_talked_berthier', interactDist: 2.5 });

    const soult = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe8e0d0, name: 'soult' });
    soult.position.set(-3.5, 0, 1.5);
    soult.rotation.y = Math.PI / 3;
    scene.add(soult);
    this.npcs.push({ mesh: soult, nameKey: 'characters.soult', animator: new CharacterAnimator(soult), dialogueId: 'soult', objectiveFlag: 'ch4_talked_soult', interactDist: 2.5 });
    return this.player;
  }

  _buildBattlefield(scene) {
    // 观察丘陵
    const hillGeo = new THREE.SphereGeometry(8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.95 });
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(5, -7.5, -8);
    scene.add(hill);

    // 战旗
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 1.5, -1);
    scene.add(pole);
    const flagGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x1a3a9a, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.6, 2.8, -1);
    scene.add(flag);
    this._waveFlag = flag;

    [-5, 5].forEach(x => {
      const banner = SceneBuilder.createBanner(0x1a3a9a);
      banner.position.set(x, 0, -3);
      banner.rotation.y = x > 0 ? -0.2 : 0.2;
      scene.add(banner);
    });

    // 远处军队轮廓
    [-6, -3, 3, 6].forEach(x => {
      const soldierGeo = new THREE.BoxGeometry(0.3, 1.4, 0.2);
      const soldierMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 1 });
      for (let z = 0; z < 5; z++) {
        const s = new THREE.Mesh(soldierGeo, soldierMat);
        s.position.set(x + (Math.random()-0.5)*0.5, 0.7, -15 - z * 0.6);
        scene.add(s);
      }
    });

    // 烟雾粒子（静态点）
    const smokeGeo = new THREE.SphereGeometry(0.4, 6, 5);
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0xb0a090, transparent: true, opacity: 0.5 });
    [-8,-5,-2,2,6,9].forEach(x => {
      const s = new THREE.Mesh(smokeGeo, smokeMat);
      s.position.set(x, 2 + Math.random(), -18);
      s.scale.set(1+Math.random()*1.5, 1+Math.random(), 1+Math.random());
      scene.add(s);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
    if (this._waveFlag) this._waveFlag.rotation.y = Math.sin(Date.now() * 0.003) * 0.3;
  }
  dispose() { this.npcs = []; }
}
