import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter1Scene {
  constructor() {
    this.id = 'chapter1';
    this.index = 0;
    this.title = '科西嘉岛的少年';
    this.year = '1785年';
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
    this.npcs.push({ mesh: mother, name: '莱蒂西亚·波拿巴', animator: new CharacterAnimator(mother), dialogueId: 'mother', interactDist: 2.5 });

    // NPC: 导师帕斯卡尔·保利
    const mentor = buildNPCCharacter({ clothColor: 0x4a3a6a, pantColor: 0x2a2040, hatColor: 0x2a2040, name: 'paoli' });
    mentor.position.set(-5, 0, 1);
    mentor.rotation.y = Math.PI / 3;
    scene.add(mentor);
    this.npcs.push({ mesh: mentor, name: '帕斯卡尔·保利', animator: new CharacterAnimator(mentor), dialogueId: 'mentor', interactDist: 2.5 });

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
  }

  getDialogue(dialogueId) {
    const dialogues = {
      mother: [
        { id: 'start', speaker: '莱蒂西亚·波拿巴', text: '拿破仑，孩子，你终于从布里埃纳军校回来了。这一年你过得如何？', portraitColor: '#8b5e3c' },
        { id: 'q1', speaker: '拿破仑', text: '母亲，同学们总嘲笑我的科西嘉口音，说我是外乡人。我该如何面对这些嘲讽？', portraitColor: '#1a3a5c',
          choices: [
            { text: '用行动证明自己——在学业和军事上超越他们', impact: { strategy: 10, legacy: 5 }, next: 'a1_study' },
            { text: '寻求和解，与同学建立友谊', impact: { diplomacy: 10, loyalty: 5 }, next: 'a1_friend' },
            { text: '拒绝接受，坚守科西嘉人的身份认同', impact: { humanity: 8, strategy: 3 }, next: 'a1_pride' },
          ]
        },
        { id: 'a1_study', speaker: '莱蒂西亚·波拿巴', text: '说得好，我的孩子！波拿巴家族的荣耀需要你去争取。勤奋是你最好的武器。', portraitColor: '#8b5e3c' },
        { id: 'a1_friend', speaker: '莱蒂西亚·波拿巴', text: '你有一颗宽广的心。结交盟友，日后你会明白朋友的价值无可替代。', portraitColor: '#8b5e3c' },
        { id: 'a1_pride', speaker: '莱蒂西亚·波拿巴', text: '科西嘉是我们的根，永远不要忘记。但也要学会在法兰西的世界里生存。', portraitColor: '#8b5e3c' },
      ],
      mentor: [
        { id: 'start', speaker: '帕斯卡尔·保利', text: '年轻的拿破仑，你有军事天赋，这是显而易见的。但你志向何在？', portraitColor: '#4a3a6a' },
        { id: 'q1', speaker: '拿破仑', text: '保利将军，科西嘉刚并入法国不久，我们的命运将向何处？', portraitColor: '#1a3a5c',
          choices: [
            { text: '我要加入法国军队，为国家效力，从中取得功名', impact: { strategy: 8, legacy: 8 }, next: 'b1_france' },
            { text: '我要为科西嘉的独立而战斗', impact: { humanity: 10, loyalty: 5 }, next: 'b1_corsica' },
            { text: '先积累实力，再做决断', impact: { strategy: 12, diplomacy: 5 }, next: 'b1_wait' },
          ]
        },
        { id: 'b1_france', speaker: '帕斯卡尔·保利', text: '务实的选择。法兰西是一个舞台，有志者自能在其中书写历史。去吧，创造你的命运！', portraitColor: '#4a3a6a' },
        { id: 'b1_corsica', speaker: '帕斯卡尔·保利', text: '这颗爱国之心令我动容。科西嘉的自由值得为之奋斗，但形势比人强，须审时度势。', portraitColor: '#4a3a6a' },
        { id: 'b1_wait', speaker: '帕斯卡尔·保利', text: '谨慎而睿智。时机未到时的蛰伏，是为了更好的出击。你有大将之风。', portraitColor: '#4a3a6a' },
      ],
    };
    return dialogues[dialogueId] || [];
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(npc => npc.animator && npc.animator.update(delta));
  }

  dispose() {
    this.npcs = [];
  }
}
