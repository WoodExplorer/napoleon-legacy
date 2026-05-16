import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

// Chapter 5: Moscow
export class Chapter5Scene {
  constructor() {
    this.id = 'chapter5'; this.index = 4;
    this.title = '莫斯科的冬天'; this.year = '1812年';
    this.npcs = []; this.scene = null;
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
    this._buildMoscow(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const murat = buildNPCCharacter({ clothColor: 0x8b1a1a, pantColor: 0x5c1010, hatColor: 0x5c0000, name: 'murat' });
    murat.position.set(3.5, 0, -1.5);
    murat.rotation.y = -Math.PI / 3;
    scene.add(murat);
    this.npcs.push({ mesh: murat, name: '缪拉元帅', animator: new CharacterAnimator(murat), dialogueId: 'murat', interactDist: 2.5 });

    const caulaincourt = buildNPCCharacter({ clothColor: 0x3a3a5a, pantColor: 0x2a2a3a, name: 'caulaincourt' });
    caulaincourt.position.set(-3, 0, 2);
    caulaincourt.rotation.y = Math.PI / 3;
    scene.add(caulaincourt);
    this.npcs.push({ mesh: caulaincourt, name: '科兰古公爵', animator: new CharacterAnimator(caulaincourt), dialogueId: 'caulaincourt', interactDist: 2.5 });
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

  getDialogue(dialogueId) {
    const d = {
      murat: [
        { id: 'start', speaker: '缪拉元帅', text: '陛下，莫斯科已是一座空城，俄国人放火烧毁了它，我们找不到任何补给！', portraitColor: '#8b1a1a' },
        { id: 'q1', speaker: '拿破仑', text: '俄国人用焦土战术对付我们。我们该如何应对？', portraitColor: '#1a3a5c',
          choices: [
            { text: '立即撤退，保全军队是最重要的', impact: { humanity: 12, strategy: 8 }, next: 'a1_retreat' },
            { text: '坚守莫斯科，等待沙皇的和谈信使', impact: { strategy: 6, legacy: 4 }, next: 'a1_wait' },
            { text: '继续深入，向圣彼得堡进发', impact: { strategy: 3, legacy: -5 }, next: 'a1_advance' },
          ]
        },
        { id: 'a1_retreat', speaker: '缪拉元帅', text: '明智之举，陛下。但寒冬已至，撤退之路将是一段炼狱……', portraitColor: '#8b1a1a' },
        { id: 'a1_wait', speaker: '缪拉元帅', text: '等待……陛下，每过一天，我们就损失更多士兵。俄国的冬天不会等人。', portraitColor: '#8b1a1a' },
        { id: 'a1_advance', speaker: '缪拉元帅', text: '陛下，我们的补给已经断绝，继续前进无异于自寻死路！请三思！', portraitColor: '#8b1a1a' },
      ],
      caulaincourt: [
        { id: 'start', speaker: '科兰古公爵', text: '陛下，我曾出使圣彼得堡，深知俄国人的心理。沙皇不会妥协的。', portraitColor: '#3a3a5a' },
        { id: 'q1', speaker: '拿破仑', text: '科兰古，你认为我现在应该如何与沙皇亚历山大交涉？', portraitColor: '#1a3a5c',
          choices: [
            { text: '派特使传达和平诚意，争取停战协议', impact: { diplomacy: 12, humanity: 8 }, next: 'b1_peace' },
            { text: '以强硬措辞要求赔偿，施加压力', impact: { strategy: 5, diplomacy: -5 }, next: 'b1_hard' },
            { text: '通过中间人秘密谈判，给双方留余地', impact: { diplomacy: 15, strategy: 8 }, next: 'b1_secret' },
          ]
        },
        { id: 'b1_peace', speaker: '科兰古公爵', text: '诚意是外交的基础。我愿作为使者前往，但陛下须做好让步的心理准备。', portraitColor: '#3a3a5a' },
        { id: 'b1_hard', speaker: '科兰古公爵', text: '陛下，强硬只会让沙皇更加顽固。在他的国土上，时间是他的盟友。', portraitColor: '#3a3a5a' },
        { id: 'b1_secret', speaker: '科兰古公爵', text: '秘密渠道是最聪明的选择。我知道几个可以信任的人……', portraitColor: '#3a3a5a' },
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

// Chapter 6: Waterloo
export class Chapter6Scene {
  constructor() {
    this.id = 'chapter6'; this.index = 5;
    this.title = '滑铁卢的黄昏'; this.year = '1815年';
    this.npcs = []; this.scene = null;
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x4a3a2a, 0x8a6a4a);
    SceneBuilder.addFog(scene, 0x8a7a6a, 18, 45);
    scene.add(SceneBuilder.createGround(0x6a5a3a, 60));
    this._buildWaterloo(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const ney = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe0d8c0, hatColor: 0x1a1a1a, name: 'ney' });
    ney.position.set(3, 0, -2);
    ney.rotation.y = -Math.PI / 4;
    scene.add(ney);
    this.npcs.push({ mesh: ney, name: '内伊元帅', animator: new CharacterAnimator(ney), dialogueId: 'ney', interactDist: 2.5 });

    const grouchy = buildNPCCharacter({ clothColor: 0x1a3a5c, pantColor: 0xe0d8c0, name: 'grouchy' });
    grouchy.position.set(-3.5, 0, 1.5);
    grouchy.rotation.y = Math.PI / 4;
    scene.add(grouchy);
    this.npcs.push({ mesh: grouchy, name: '格鲁希元帅', animator: new CharacterAnimator(grouchy), dialogueId: 'grouchy', interactDist: 2.5 });
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
  }

  getDialogue(dialogueId) {
    const d = {
      ney: [
        { id: 'start', speaker: '内伊元帅', text: '陛下，威灵顿的防线固若金汤！我的骑兵连续冲击都无法突破。', portraitColor: '#1a3a5c' },
        { id: 'q1', speaker: '拿破仑', text: '内伊，格鲁希的援军迟迟未到，我们该怎么办？', portraitColor: '#1a3a5c',
          choices: [
            { text: '投入最后的近卫军，孤注一掷', impact: { strategy: 5, loyalty: 8, legacy: -5 }, next: 'a1_guard' },
            { text: '命令部队有序撤退，保留实力日后再战', impact: { humanity: 10, strategy: 8 }, next: 'a1_retreat' },
            { text: '等待格鲁希，绝不动摇', impact: { strategy: 3, loyalty: 6 }, next: 'a1_wait' },
          ]
        },
        { id: 'a1_guard', speaker: '内伊元帅', text: '近卫军，前进！……陛下，他们……他们被击溃了。法国近卫军从未败退，直到今天。', portraitColor: '#1a3a5c' },
        { id: 'a1_retreat', speaker: '内伊元帅', text: '撤退……这个词说出口像刀割。但陛下是对的，活下去才能再战。', portraitColor: '#1a3a5c' },
        { id: 'a1_wait', speaker: '内伊元帅', text: '等待格鲁希……普鲁士人的炮声越来越近了，陛下，恐怕等不到了。', portraitColor: '#1a3a5c' },
      ],
      grouchy: [
        { id: 'start', speaker: '格鲁希元帅', text: '陛下，我率军追击普鲁士人，但……他们绕过了我，直奔滑铁卢。', portraitColor: '#1a3a5c' },
        { id: 'q1', speaker: '拿破仑', text: '格鲁希，你当时为何没有判断出普鲁士人的意图？', portraitColor: '#1a3a5c',
          choices: [
            { text: '宽恕格鲁希——战争中的误判人人都可能犯', impact: { humanity: 15, loyalty: 10 }, next: 'b1_forgive' },
            { text: '严厉追究责任，这个失误断送了帝国', impact: { strategy: 3, loyalty: -5 }, next: 'b1_blame' },
            { text: '冷静分析教训，为将来做准备', impact: { strategy: 10, legacy: 8 }, next: 'b1_analyze' },
          ]
        },
        { id: 'b1_forgive', speaker: '格鲁希元帅', text: '陛下……您的宽容令我无地自容。我格鲁希此生最大的遗憾就是辜负了您的信任。', portraitColor: '#1a3a5c' },
        { id: 'b1_blame', speaker: '格鲁希元帅', text: '陛下说得对，是我的过失。我愿承担一切责任，请陛下处置。', portraitColor: '#1a3a5c' },
        { id: 'b1_analyze', speaker: '格鲁希元帅', text: '陛下的冷静令人钦佩。是的，我们都要从这次失败中学习，如果还有机会的话……', portraitColor: '#1a3a5c' },
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
