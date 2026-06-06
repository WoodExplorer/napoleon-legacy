import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter1Scene {
  constructor() {
    this.id = 'chapter1';
    this.index = 0;
    this.npcs = [];
    this.scene = null;
    this.player = null;
    this.playerAnimator = null;
  }

  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x4a90d9, 0xc8e6a0);
    SceneBuilder.addFog(scene, 0xc8e6a0, 25, 60);

    const ground = SceneBuilder.createGround(0x5a8a3f, 50);
    scene.add(ground);
    SceneBuilder.createPath(scene, [[-8, 3], [-3, 1], [0, -0.5], [5, -3]], 1.1, 0xa18a63);
    SceneBuilder.createInstancedFoliage(scene, { count: 140, spread: 42, color: 0x3f7a38 });
    SceneBuilder.createAtmosphere(scene, { count: 90, spread: 34, height: 5, color: 0xffe0a0, size: 0.055, speed: 0.12, opacity: 0.35 });

    // 地中海风格建筑
    this._buildVillage(scene);

    // 树木
    [[-3,4],[-5,8],[3,6],[6,3],[-2,-5],[4,-4]].forEach(([x,z]) => {
      scene.add(SceneBuilder.createTree(x, z));
    });

    // 玩家(拿破仑)
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    // NPC: 母亲莱蒂西亚
    const mother = buildNPCCharacter({ clothColor: 0x8b5e3c, pantColor: 0x6b3e1e, name: 'letizia' });
    mother.position.set(3, 0, -2);
    mother.rotation.y = -Math.PI / 4;
    scene.add(mother);
    this.npcs.push({ mesh: mother, nameKey: 'characters.letizia', animator: new CharacterAnimator(mother), dialogueId: 'mother', objectiveFlag: 'ch1_talked_mother', interactDist: 2.5 });

    // NPC: 导师帕斯卡尔·保利
    const mentor = buildNPCCharacter({ clothColor: 0x4a3a6a, pantColor: 0x2a2040, hatColor: 0x2a2040, name: 'paoli' });
    mentor.position.set(-5, 0, 1);
    mentor.rotation.y = Math.PI / 3;
    scene.add(mentor);
    this.npcs.push({ mesh: mentor, nameKey: 'characters.paoli', animator: new CharacterAnimator(mentor), dialogueId: 'mentor', objectiveFlag: 'ch1_talked_mentor', interactDist: 2.5 });

    return this.player;
  }

  _buildVillage(scene) {
    // 主建筑
    const house = SceneBuilder.createBuilding(4, 3, 3, 0xd4b896);
    house.position.set(5, 1.5, -3);
    scene.add(house);

    // 屋顶
    const roofGeo = new THREE.ConeGeometry(3, 1.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(5, 3.75, -3);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    scene.add(roof);

    // 小屋
    const shed = SceneBuilder.createBuilding(2, 2, 2, 0xc8a87a);
    shed.position.set(-6, 1, -4);
    scene.add(shed);

    // 围墙
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.9 });
    [[-1,0],[0,-1],[1,0]].forEach(([dx, dz], i) => {
      const wGeo = new THREE.BoxGeometry(2, 1.2, 0.2);
      const w = new THREE.Mesh(wGeo, wallMat);
      w.position.set(2 + dx * 2, 0.6, 1 + dz * 2);
      w.rotation.y = i === 1 ? Math.PI / 2 : 0;
      w.castShadow = true;
      scene.add(w);
    });

    // 路面石板
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xa09070, roughness: 1 });
    for (let i = -2; i < 3; i++) {
      const pGeo = new THREE.BoxGeometry(0.8, 0.05, 0.8);
      const p = new THREE.Mesh(pGeo, pathMat);
      p.position.set(i * 0.9, 0.025, -0.5);
      scene.add(p);
    }

    const banner = SceneBuilder.createBanner(0x244f8f);
    banner.position.set(3.6, 0, -1.4);
    banner.rotation.y = -Math.PI / 8;
    scene.add(banner);
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(npc => npc.animator && npc.animator.update(delta));
  }

  dispose() {
    this.npcs = [];
  }
}
