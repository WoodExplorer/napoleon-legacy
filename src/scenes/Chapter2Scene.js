import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder.js';
import { buildNapoleonCharacter, buildNPCCharacter } from '../characters/CharacterBuilder.js';
import { CharacterAnimator } from '../characters/CharacterAnimator.js';

export class Chapter2Scene {
  constructor() {
    this.id = 'chapter2';
    this.index = 1;
    this.title = '土伦之战';
    this.year = '1793年';
    this.npcs = [];
    this.scene = null;
  }

  build(scene) {
    this.scene = scene;
    SceneBuilder.createLighting(scene);
    SceneBuilder.createSkybox(scene, 0x8b6914, 0xc8a050);
    SceneBuilder.addFog(scene, 0x9a7840, 20, 50);

    const ground = SceneBuilder.createGround(0x8b7355, 50);
    scene.add(ground);
    this._buildFortress(scene);

    this.player = buildNapoleonCharacter();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);
    this.playerAnimator = new CharacterAnimator(this.player);

    const general = buildNPCCharacter({ clothColor: 0x3a5a3a, pantColor: 0x2a402a, hatColor: 0x1a2a1a, name: 'carteaux' });
    general.position.set(4, 0, -3);
    general.rotation.y = -Math.PI / 3;
    scene.add(general);
    this.npcs.push({ mesh: general, name: '卡尔托将军', animator: new CharacterAnimator(general), dialogueId: 'general', interactDist: 2.5 });

    const officer = buildNPCCharacter({ clothColor: 0x2a4a6a, pantColor: 0x1a2a3a, name: 'junot' });
    officer.position.set(-3, 0, 2);
    officer.rotation.y = Math.PI / 4;
    scene.add(officer);
    this.npcs.push({ mesh: officer, name: '朱诺上尉', animator: new CharacterAnimator(officer), dialogueId: 'junot', interactDist: 2.5 });

    return this.player;
  }

  _buildFortress(scene) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8870, roughness: 1 });

    // 堡垒主体
    const fort = SceneBuilder.createBuilding(6, 4, 4, 0x9a8870);
    fort.position.set(8, 2, -5);
    scene.add(fort);

    // 炮台
    const battlements = SceneBuilder.createBuilding(7, 0.8, 0.5, 0x8a7860);
    battlements.position.set(8, 4.4, -3);
    scene.add(battlements);

    // 大炮（程序化）
    [-2, 0, 2].forEach(x => {
      const barrelGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 12);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.3 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(x, 1, 0);
      barrel.castShadow = true;

      const wheelGeo = new THREE.TorusGeometry(0.25, 0.05, 8, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.25, 0);
      scene.add(barrel);
      scene.add(wheel);
    });

    // 沙袋掩体
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 });
    for (let i = -3; i <= 3; i++) {
      const bagGeo = new THREE.SphereGeometry(0.3, 8, 6);
      bagGeo.scale(1.2, 0.7, 0.8);
      const bag = new THREE.Mesh(bagGeo, bagMat);
      bag.position.set(i * 0.7, 0.21, -2);
      bag.castShadow = true;
      scene.add(bag);
    }

    // 远处港口水面
    const waterGeo = new THREE.PlaneGeometry(30, 15);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a4a6a, roughness: 0.3, metalness: 0.4 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.02, -20);
    scene.add(water);
  }

  getDialogue(dialogueId) {
    const dialogues = {
      general: [
        { id: 'start', speaker: '卡尔托将军', text: '波拿巴上尉，你提出的炮兵方案太过冒进！我们没有足够的火炮。', portraitColor: '#3a5a3a' },
        { id: 'q1', speaker: '拿破仑', text: '将军，土伦港的关键在于穆格雷特高地。占领那里，英国舰队就必须撤退！', portraitColor: '#1a3a5c',
          choices: [
            { text: '请求将军全力支持，集中所有火炮强攻高地', impact: { strategy: 12, legacy: 8 }, next: 'a1_force' },
            { text: '提出迂回战术，避免正面强攻减少伤亡', impact: { strategy: 8, humanity: 10 }, next: 'a1_flank' },
            { text: '绕过将军，直接向督政府申请更多资源', impact: { diplomacy: 10, strategy: 6 }, next: 'a1_report' },
          ]
        },
        { id: 'a1_force', speaker: '卡尔托将军', text: '好吧，我批准你的计划。但如果失败，后果自负！准备进攻，波拿巴。', portraitColor: '#3a5a3a' },
        { id: 'a1_flank', speaker: '卡尔托将军', text: '迂回？需要时间，但减少伤亡是值得的。你比我想象的更沉稳，上尉。', portraitColor: '#3a5a3a' },
        { id: 'a1_report', speaker: '卡尔托将军', text: '你敢越级汇报！...但不得不说，你确实懂得如何运用政治手段。', portraitColor: '#3a5a3a' },
      ],
      junot: [
        { id: 'start', speaker: '朱诺上尉', text: '拿破仑，弟兄们都在说你的炮兵计划，大家愿意跟你冲！', portraitColor: '#2a4a6a' },
        { id: 'q1', speaker: '拿破仑', text: '朱诺，明天的战斗会很危险。你和弟兄们准备好了吗？', portraitColor: '#1a3a5c',
          choices: [
            { text: '激励士气：告诉他们此战将名垂青史', impact: { loyalty: 12, legacy: 6 }, next: 'b1_inspire' },
            { text: '务实准备：详细部署各队战术分工', impact: { strategy: 10, loyalty: 8 }, next: 'b1_plan' },
            { text: '承诺战后奖赏，提高士兵积极性', impact: { loyalty: 8, diplomacy: 6 }, next: 'b1_reward' },
          ]
        },
        { id: 'b1_inspire', speaker: '朱诺上尉', text: '将军的话让我热血沸腾！弟兄们会为你赴死的，拿破仑！', portraitColor: '#2a4a6a' },
        { id: 'b1_plan', speaker: '朱诺上尉', text: '明白！清晰的部署让弟兄们心里有底。我们会按计划执行。', portraitColor: '#2a4a6a' },
        { id: 'b1_reward', speaker: '朱诺上尉', text: '哈！物质激励也很重要。弟兄们会更有干劲的，放心吧！', portraitColor: '#2a4a6a' },
      ],
    };
    return dialogues[dialogueId] || [];
  }

  update(delta) {
    this.playerAnimator && this.playerAnimator.update(delta);
    this.npcs.forEach(n => n.animator && n.animator.update(delta));
  }

  dispose() { this.npcs = []; }
}
