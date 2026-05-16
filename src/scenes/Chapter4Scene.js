import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

// Chapter 4: Austerlitz
export class Chapter4Scene {
  constructor() {
    this.id = 'chapter4'; this.index = 3;
    this.title = '奥斯特利茨的荣耀'; this.year = '1805年';
    this.npcs = []; this.scene = null;
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x3a4a6a, 0x9aaa8a);
    SceneBuilder.addFog(scene, 0xa0a890, 20, 55);
    scene.add(SceneBuilder.createGround(0x7a8a6a, 60));
    this._buildBattlefield(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const berthier = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe8e0d0, hatColor: 0x1a1a1a, name: 'berthier' });
    berthier.position.set(3, 0, -2);
    berthier.rotation.y = -Math.PI / 4;
    scene.add(berthier);
    this.npcs.push({ mesh: berthier, name: '贝尔蒂埃元帅', animator: new CharacterAnimator(berthier), dialogueId: 'berthier', interactDist: 2.5 });

    const soult = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe8e0d0, name: 'soult' });
    soult.position.set(-3.5, 0, 1.5);
    soult.rotation.y = Math.PI / 3;
    scene.add(soult);
    this.npcs.push({ mesh: soult, name: '苏尔特元帅', animator: new CharacterAnimator(soult), dialogueId: 'soult', interactDist: 2.5 });
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

  getDialogue(dialogueId) {
    const d = {
      berthier: [
        { id: 'start', speaker: '贝尔蒂埃元帅', text: '皇帝陛下，俄奥联军正在向普拉岑高地推进，我们该如何部署？', portraitColor: '#1a3a5c' },
        { id: 'q1', speaker: '拿破仑', text: '贝尔蒂埃，这正是我等待的时机。他们露出了侧翼！', portraitColor: '#1a3a5c',
          choices: [
            { text: '立即发动中央突破，切断联军的联系', impact: { strategy: 15, legacy: 10 }, next: 'a1_center' },
            { text: '先佯装撤退诱敌，再发动反击', impact: { strategy: 18, diplomacy: 5 }, next: 'a1_feint' },
            { text: '保守推进，稳扎稳打确保安全', impact: { humanity: 8, strategy: 6 }, next: 'a1_safe' },
          ]
        },
        { id: 'a1_center', speaker: '贝尔蒂埃元帅', text: '妙计！苏尔特军团将从正面突破，这将是教科书般的战术！传令下去！', portraitColor: '#1a3a5c' },
        { id: 'a1_feint', speaker: '贝尔蒂埃元帅', text: '天才！用虚弱引诱敌人，再致命一击。奥斯特利茨将成为战争史的传奇！', portraitColor: '#1a3a5c' },
        { id: 'a1_safe', speaker: '贝尔蒂埃元帅', text: '稳健的选择，陛下。减少伤亡也是胜利的一部分。', portraitColor: '#1a3a5c' },
      ],
      soult: [
        { id: 'start', speaker: '苏尔特元帅', text: '陛下！我的军团已就位，只等一声令下。弟兄们士气高涨！', portraitColor: '#1a3a5c' },
        { id: 'q1', speaker: '拿破仑', text: '苏尔特，攻占普拉岑高地需要多久？', portraitColor: '#1a3a5c',
          choices: [
            { text: '二十分钟！集中精锐，快速突击', impact: { strategy: 12, loyalty: 8 }, next: 'b1_fast' },
            { text: '用一小时稳固推进，减少士兵伤亡', impact: { humanity: 12, loyalty: 10 }, next: 'b1_careful' },
            { text: '分兵两路，一攻一守互相配合', impact: { strategy: 14, loyalty: 6 }, next: 'b1_split' },
          ]
        },
        { id: 'b1_fast', speaker: '苏尔特元帅', text: '明白！二十分钟，普拉岑是我们的！为皇帝，为法兰西，冲锋！', portraitColor: '#1a3a5c' },
        { id: 'b1_careful', speaker: '苏尔特元帅', text: '陛下的仁慈令士兵们感动。我们会稳步推进，不白白牺牲任何人。', portraitColor: '#1a3a5c' },
        { id: 'b1_split', speaker: '苏尔特元帅', text: '两路并进，攻守兼备。陛下的战术布局总是令人叹服！', portraitColor: '#1a3a5c' },
      ],
    };
    return d[dialogueId] || [];
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
    if (this._waveFlag) this._waveFlag.rotation.y = Math.sin(Date.now() * 0.003) * 0.3;
  }
  dispose() { this.npcs = []; }
}
