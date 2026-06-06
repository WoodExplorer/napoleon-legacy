import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter7Scene {
  constructor() {
    this.id = 'chapter7'; this.index = 6;
    this.npcs = []; this.scene = null;
  }

  build(scene) {
    this.scene = scene;
    const ambient = new THREE.AmbientLight(0xfff0d0, 1.0);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe8b0, 0.8);
    sun.position.set(8, 12, 5); sun.castShadow = true;
    scene.add(sun);
    SceneBuilder.createSkybox(scene, 0x4a9ad4, 0x7acfa0);
    SceneBuilder.addFog(scene, 0x9ad4c8, 30, 70);
    scene.add(SceneBuilder.createGround(0x5a8a5a, 60));
    this._buildIsland(scene);

    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const montholon = buildNPCCharacter({ clothColor: 0x5a4a3a, pantColor: 0x3a2a1a, name: 'montholon' });
    montholon.position.set(3, 0, -2);
    montholon.rotation.y = -Math.PI / 4;
    scene.add(montholon);
    this.npcs.push({ mesh: montholon, nameKey: 'characters.montholon', animator: new CharacterAnimator(montholon), dialogueId: 'montholon', interactDist: 2.5 });

    const gourgaud = buildNPCCharacter({ clothColor: 0x4a5a3a, pantColor: 0x2a3a1a, name: 'gourgaud' });
    gourgaud.position.set(-3, 0, 1.5);
    gourgaud.rotation.y = Math.PI / 3;
    scene.add(gourgaud);
    this.npcs.push({ mesh: gourgaud, nameKey: 'characters.gourgaud', animator: new CharacterAnimator(gourgaud), dialogueId: 'gourgaud', interactDist: 2.5 });

    return this.player;
  }

  _buildIsland(scene) {
    // 隆伍德庄园
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xd4c8a8, roughness: 0.9 });
    const house = SceneBuilder.createBuilding(7, 3, 5, 0xd4c8a8);
    house.position.set(6, 1.5, -6);
    scene.add(house);

    const roofGeo = new THREE.BoxGeometry(7.5, 0.3, 5.5);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(6, 3.15, -6);
    scene.add(roof);

    // 海洋
    const oceanGeo = new THREE.PlaneGeometry(60, 30);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1a6090, roughness: 0.2, metalness: 0.3 });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, 0.02, -25);
    scene.add(ocean);

    // 岩石
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1 });
    [[10, 0, -12], [-8, 0, -10], [5, 0, -15]].forEach(([x, y, z]) => {
      const rg = new THREE.DodecahedronGeometry(0.8 + Math.random()*0.5, 0);
      const r = new THREE.Mesh(rg, rockMat);
      r.position.set(x, y, z);
      r.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(r);
    });

    // 椰子树
    SceneBuilder.createTree && [-5, 8].forEach(x => scene.add(SceneBuilder.createTree(x, -4)));

    // 长椅
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), benchMat);
    benchSeat.position.set(0, 0.45, -2);
    scene.add(benchSeat);
    [-0.5, 0.5].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), benchMat);
      leg.position.set(x, 0.2, -2);
      scene.add(leg);
    });
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }
  dispose() { this.npcs = []; }
}
