import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter3Scene {
  constructor() {
    this.id = 'chapter3'; this.index = 2;
    this.title = '执政府的崛起'; this.year = '1799年';
    this.npcs = []; this.scene = null;
  }
  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x5a7ab5, 0xd4c8a0);
    SceneBuilder.addFog(scene, 0xc8c0a8, 30, 70);
    scene.add(SceneBuilder.createGround(0x8a7a60, 50));
    this._buildPalace(scene);
    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const talleyrand = buildNPCCharacter({ clothColor: 0x2a2a6a, pantColor: 0x1a1a4a, name: 'talleyrand' });
    talleyrand.position.set(4, 0, -2);
    talleyrand.rotation.y = -Math.PI / 3;
    scene.add(talleyrand);
    this.npcs.push({ mesh: talleyrand, name: '塔列朗', animator: new CharacterAnimator(talleyrand), dialogueId: 'talleyrand', interactDist: 2.5 });

    const josephine = buildNPCCharacter({ clothColor: 0xd4748c, pantColor: 0xb45870, skinColor: 0xf5d5c0, name: 'josephine' });
    josephine.position.set(-4, 0, 1);
    josephine.rotation.y = Math.PI / 4;
    scene.add(josephine);
    this.npcs.push({ mesh: josephine, name: '约瑟芬', animator: new CharacterAnimator(josephine), dialogueId: 'josephine', interactDist: 2.5 });
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
  }

  getDialogue(dialogueId) {
    const d = {
      talleyrand: [
        { id: 'start', speaker: '塔列朗', text: '将军，雾月十八日的政变已经成功。法国现在需要一位强有力的领袖。', portraitColor: '#2a2a6a' },
        { id: 'q1', speaker: '拿破仑', text: '塔列朗，欧洲各国对我们的新政府将如何反应？', portraitColor: '#1a3a5c',
          choices: [
            { text: '展示强硬姿态，让欧洲诸王害怕法国的力量', impact: { strategy: 10, legacy: 8 }, next: 'a1_strong' },
            { text: '寻求外交途径，签订和平协议以稳定局势', impact: { diplomacy: 15, humanity: 8 }, next: 'a1_peace' },
            { text: '暗中分化反法同盟，各个击破', impact: { strategy: 12, diplomacy: 8 }, next: 'a1_divide' },
          ]
        },
        { id: 'a1_strong', speaker: '塔列朗', text: '强权即公理。但长期的战争会耗尽法国的元气，将军，请三思。', portraitColor: '#2a2a6a' },
        { id: 'a1_peace', speaker: '塔列朗', text: '明智之举！《吕内维尔和约》将为法国赢得喘息之机，我会全力推进。', portraitColor: '#2a2a6a' },
        { id: 'a1_divide', speaker: '塔列朗', text: '精妙！外交上分而治之，历来是强国制胜的法宝。将军深谙此道。', portraitColor: '#2a2a6a' },
      ],
      josephine: [
        { id: 'start', speaker: '约瑟芬', text: '拿破仑，巴黎的沙龙都在谈论你。你现在是法国最有权势的人了。', portraitColor: '#d4748c' },
        { id: 'q1', speaker: '拿破仑', text: '约瑟芬，权力意味着责任。我想知道，民众真正需要什么？', portraitColor: '#1a3a5c',
          choices: [
            { text: '制定《拿破仑法典》，用法律保障公民权利', impact: { legacy: 15, humanity: 10 }, next: 'b1_law' },
            { text: '优先重建经济，让法国人过上好日子', impact: { humanity: 12, loyalty: 8 }, next: 'b1_economy' },
            { text: '建立教育体系，提升国民素质', impact: { legacy: 12, humanity: 10 }, next: 'b1_education' },
          ]
        },
        { id: 'b1_law', speaker: '约瑟芬', text: '《法典》将是你留给历史最伟大的礼物，拿破仑。比任何战役都要持久。', portraitColor: '#d4748c' },
        { id: 'b1_economy', speaker: '约瑟芬', text: '民以食为天，你的仁心令我动容。百姓会永远记住这位关心他们的第一执政。', portraitColor: '#d4748c' },
        { id: 'b1_education', speaker: '约瑟芬', text: '启蒙之光照亮法兰西！你的远见将惠泽后世数百年。', portraitColor: '#d4748c' },
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
