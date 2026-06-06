import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter3Scene {
  constructor() {
    this.id = 'chapter3'; this.index = 2;
    this.npcs = []; this.scene = null;
    this.worldBounds = { minX: -16, maxX: 16, minZ: -14, maxZ: 12 };
    this.collisionObjects = [
      { type: 'box', x: 0, z: -8, width: 14.8, depth: 5.8 },
      { type: 'box', x: 0, z: -5.6, width: 13.8, depth: 0.6 },
      { type: 'circle', x: -5.4, z: -5.6, radius: 0.32 },
      { type: 'circle', x: -3.6, z: -5.6, radius: 0.32 },
      { type: 'circle', x: -1.8, z: -5.6, radius: 0.32 },
      { type: 'circle', x: 0, z: -5.6, radius: 0.32 },
      { type: 'circle', x: 1.8, z: -5.6, radius: 0.32 },
      { type: 'circle', x: 3.6, z: -5.6, radius: 0.32 },
      { type: 'circle', x: 5.4, z: -5.6, radius: 0.32 },
    ];
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x5a7ab5, 0xd4c8a0);
    SceneBuilder.addFog(scene, 0xc8c0a8, 30, 70);
    scene.add(SceneBuilder.createGround(0x8a7a60, 50));
    SceneBuilder.createPath(scene, [[-7, 2], [-2, 0], [0, -2], [0, -8]], 1.35, 0xc8bca4);
    SceneBuilder.createAtmosphere(scene, { count: 70, spread: 26, height: 7, color: 0xffe6b0, size: 0.075, speed: 0.04, opacity: 0.26 });
    this._buildPalace(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const talleyrand = buildNPCCharacter({ clothColor: 0x2a2a6a, pantColor: 0x1a1a4a, name: 'talleyrand' });
    talleyrand.position.set(4, 0, -2);
    talleyrand.rotation.y = -Math.PI / 3;
    scene.add(talleyrand);
    this.npcs.push({ mesh: talleyrand, nameKey: 'characters.talleyrand', animator: new CharacterAnimator(talleyrand), dialogueId: 'talleyrand', objectiveFlag: 'ch3_talked_talleyrand', interactDist: 2.5 });

    const josephine = buildNPCCharacter({ clothColor: 0xd4748c, pantColor: 0xb45870, skinColor: 0xf5d5c0, name: 'josephine' });
    josephine.position.set(-4, 0, 1);
    josephine.rotation.y = Math.PI / 4;
    scene.add(josephine);
    this.npcs.push({ mesh: josephine, nameKey: 'characters.josephine', animator: new CharacterAnimator(josephine), dialogueId: 'josephine', objectiveFlag: 'ch3_talked_josephine', interactDist: 2.5 });
    return this.player;
  }

  _buildPalace(scene) {
    // 杜伊勒里宫风格
    const palaceMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.8 });
    const mainWing = SceneBuilder.createBuilding(14, 5, 5, 0xe8dcc8);
    mainWing.position.set(0, 2.5, -8);
    scene.add(mainWing);

    // 柱子
    for (let i = -3; i <= 3; i++) {
      const colGeo = new THREE.CylinderGeometry(0.18, 0.2, 5, 12);
      const col = new THREE.Mesh(colGeo, palaceMat);
      col.position.set(i * 1.8, 2.5, -5.6);
      col.castShadow = true;
      scene.add(col);
    }

    // 三角形山花
    const pedGeo = new THREE.ConeGeometry(7, 1.5, 3);
    const ped = new THREE.Mesh(pedGeo, palaceMat);
    ped.position.set(0, 6.5, -5.6);
    ped.rotation.y = Math.PI / 6;
    scene.add(ped);

    // 大理石地板
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.3, metalness: 0.1 });
    const floorGeo = new THREE.PlaneGeometry(16, 10);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, -3);
    floor.receiveShadow = true;
    scene.add(floor);

    // 地毯
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 });
    const carpetGeo = new THREE.PlaneGeometry(3, 8);
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.02, -1);
    scene.add(carpet);

    [-4.8, 4.8].forEach(x => {
      const banner = SceneBuilder.createBanner(0x244f8f);
      banner.position.set(x, 0, -5.2);
      scene.add(banner);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }
  dispose() { this.npcs = []; }
}
