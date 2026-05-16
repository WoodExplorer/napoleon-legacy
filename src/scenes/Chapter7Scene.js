import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter7Scene {
  constructor() {
    this.id = 'chapter7'; this.index = 6;
    this.title = '圣赫勒拿岛'; this.year = '1821年';
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
    this.npcs.push({ mesh: montholon, name: '蒙托隆伯爵', animator: new CharacterAnimator(montholon), dialogueId: 'montholon', interactDist: 2.5 });

    const gourgaud = buildNPCCharacter({ clothColor: 0x4a5a3a, pantColor: 0x2a3a1a, name: 'gourgaud' });
    gourgaud.position.set(-3, 0, 1.5);
    gourgaud.rotation.y = Math.PI / 3;
    scene.add(gourgaud);
    this.npcs.push({ mesh: gourgaud, name: '古尔戈将军', animator: new CharacterAnimator(gourgaud), dialogueId: 'gourgaud', interactDist: 2.5 });

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

  getDialogue(dialogueId) {
    const d = {
      montholon: [
        { id: 'start', speaker: '蒙托隆伯爵', text: '陛下，您的回忆录已经记录了数百页。后人将如何评价您的一生？', portraitColor: '#5a4a3a' },
        { id: 'q1', speaker: '拿破仑', text: '历史会如何审判我？这个问题常常困扰我……', portraitColor: '#1a3a5c',
          choices: [
            { text: '我为法兰西和欧洲带来了法律、秩序和现代制度', impact: { legacy: 15, humanity: 8 }, next: 'a1_legacy' },
            { text: '战争带来了太多痛苦，这是我最深的遗憾', impact: { humanity: 15, legacy: 8 }, next: 'a1_regret' },
            { text: '历史由胜利者书写，但真相终将大白', impact: { legacy: 12, strategy: 8 }, next: 'a1_truth' },
          ]
        },
        { id: 'a1_legacy', speaker: '蒙托隆伯爵', text: '《拿破仑法典》至今仍是许多国家法律的基础。您的遗产将永存，陛下。', portraitColor: '#5a4a3a' },
        { id: 'a1_regret', speaker: '蒙托隆伯爵', text: '这份悲悯之心令人动容，陛下。承认错误需要比任何战役都更大的勇气。', portraitColor: '#5a4a3a' },
        { id: 'a1_truth', speaker: '蒙托隆伯爵', text: '是的，时间是最公正的裁判。两百年后，世人将重新审视您的功过。', portraitColor: '#5a4a3a' },
      ],
      gourgaud: [
        { id: 'start', speaker: '古尔戈将军', text: '陛下，如果时光能够倒流，您会做出哪些不同的选择？', portraitColor: '#4a5a3a' },
        { id: 'q1', speaker: '拿破仑', text: '……也许我最大的错误是那场俄国远征。还有……与欧洲列强为敌太久了。', portraitColor: '#1a3a5c',
          choices: [
            { text: '如果能重来，我会在鼎盛时期选择和平，而非继续扩张', impact: { diplomacy: 15, humanity: 12 }, next: 'b1_peace' },
            { text: '即使重来，我仍会做同样的选择——这就是命运', impact: { legacy: 10, strategy: 8 }, next: 'b1_fate' },
            { text: '我希望能更好地倾听身边人的忠告', impact: { loyalty: 15, humanity: 10 }, next: 'b1_listen' },
          ]
        },
        { id: 'b1_peace', speaker: '古尔戈将军', text: '和平的拿破仑……那将是一个不同的世界。也许更美好，也许更平静，陛下。', portraitColor: '#4a5a3a' },
        { id: 'b1_fate', speaker: '古尔戈将军', text: '命运……您始终相信自己的星宿。即使在这小岛上，那颗星依然闪耀。', portraitColor: '#4a5a3a' },
        { id: 'b1_listen', speaker: '古尔戈将军', text: '陛下，您终于……说出了我们心中所想。您身边有太多忠诚的人，愿意为您赴死。', portraitColor: '#4a5a3a' },
      ],
    };
    return d[dialogueId] || [];
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }
  dispose() { this.npcs = []; }
}
