/**
 * CharacterBuilder - 程序化生成精细人物模型
 * 使用Three.js几何体组合构建人形角色（避免使用简单圆柱体）
 */
import * as THREE from 'three';

const SKIN_COLOR = 0xf0c8a0;
const HAIR_DARK = 0x2a1a0a;

/**
 * 创建平滑球形关节连接
 */
function jointSphere(radius, color) {
  const geo = new THREE.SphereGeometry(radius, 12, 10);
  const mat = new THREE.MeshStandardMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

/**
 * 创建躯干（使用BoxGeometry配合弯曲）
 */
function buildTorso(color) {
  const group = new THREE.Group();
  // 主躯干 - 梯形形状用两个box叠加
  const bodyGeo = new THREE.BoxGeometry(0.38, 0.48, 0.22, 2, 4, 2);
  // 略微变形使其更具人形
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const scale = 0.85 + y * 0.3; // 上宽下窄
    pos.setX(i, pos.getX(i) * scale);
  }
  pos.needsUpdate = true;
  bodyGeo.computeVertexNormals();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  return group;
}

/**
 * 创建头部（精细化：有鼻子、耳朵）
 */
function buildHead(skinColor) {
  const group = new THREE.Group();

  // 头骨
  const headGeo = new THREE.SphereGeometry(0.13, 16, 14);
  // 略微拉伸使更椭圆
  headGeo.scale(1, 1.1, 0.95);
  const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const head = new THREE.Mesh(headGeo, headMat);
  group.add(head);

  // 鼻子
  const noseGeo = new THREE.ConeGeometry(0.018, 0.04, 8);
  const noseMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.01, 0.13);
  group.add(nose);

  // 左耳
  const earGeo = new THREE.SphereGeometry(0.028, 8, 6);
  earGeo.scale(0.6, 1, 0.4);
  const earMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.135, 0, 0);
  group.add(leftEar);

  // 右耳
  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.135, 0, 0);
  group.add(rightEar);

  // 眼睛
  const eyeGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.045, 0.03, 0.118);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.045, 0.03, 0.118);
  group.add(rightEye);

  // 眼白
  const eyeWhiteGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const lEW = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  lEW.position.set(-0.045, 0.03, 0.115);
  group.add(lEW);
  const rEW = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  rEW.position.set(0.045, 0.03, 0.115);
  group.add(rEW);

  return group;
}

/**
 * 创建手臂（上臂+前臂+手）
 */
function buildArm(side, clothColor, skinColor) {
  const group = new THREE.Group();
  const x = side === 'left' ? -1 : 1;

  // 上臂
  const upperArmGeo = new THREE.CapsuleGeometry(0.055, 0.18, 6, 10);
  const clothMat = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.7 });
  const upperArm = new THREE.Mesh(upperArmGeo, clothMat);
  upperArm.position.y = -0.11;
  upperArm.rotation.z = x * 0.12;
  group.add(upperArm);

  // 肘关节
  const elbowJ = jointSphere(0.058, clothColor);
  elbowJ.position.y = -0.24;
  group.add(elbowJ);

  // 前臂
  const foreArmGeo = new THREE.CapsuleGeometry(0.048, 0.16, 6, 10);
  const foreArm = new THREE.Mesh(foreArmGeo, clothMat);
  foreArm.position.y = -0.35;
  foreArm.rotation.z = x * 0.08;
  group.add(foreArm);

  // 手
  const handGeo = new THREE.SphereGeometry(0.05, 10, 8);
  handGeo.scale(0.9, 0.7, 0.6);
  const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.position.y = -0.46;
  group.add(hand);

  return group;
}

/**
 * 创建腿（大腿+小腿+脚）
 */
function buildLeg(side, pantColor, bootColor) {
  const group = new THREE.Group();
  const x = side === 'left' ? -1 : 1;

  const pantMat = new THREE.MeshStandardMaterial({ color: pantColor, roughness: 0.8 });
  const bootMat = new THREE.MeshStandardMaterial({ color: bootColor, roughness: 0.4, metalness: 0.1 });

  // 大腿
  const thighGeo = new THREE.CapsuleGeometry(0.07, 0.2, 6, 10);
  const thigh = new THREE.Mesh(thighGeo, pantMat);
  thigh.position.y = -0.14;
  group.add(thigh);

  // 膝盖
  const kneeJ = jointSphere(0.065, pantColor);
  kneeJ.position.y = -0.3;
  group.add(kneeJ);

  // 小腿
  const shinGeo = new THREE.CapsuleGeometry(0.058, 0.18, 6, 10);
  const shin = new THREE.Mesh(shinGeo, bootMat);
  shin.position.y = -0.44;
  group.add(shin);

  // 脚
  const footGeo = new THREE.BoxGeometry(0.1, 0.05, 0.18);
  const foot = new THREE.Mesh(footGeo, bootMat);
  foot.position.set(x * 0.01, -0.58, 0.04);
  group.add(foot);

  return group;
}

/**
 * 拿破仑帽子（标志性双角帽 bicorne）
 */
function buildNapoleonHat() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });

  // 帽檐 - 椭圆形
  const brimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32);
  brimGeo.scale(1, 1, 0.5);
  const brim = new THREE.Mesh(brimGeo, mat);
  group.add(brim);

  // 帽身
  const crownGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 32);
  crownGeo.scale(0.9, 1, 0.55);
  const crown = new THREE.Mesh(crownGeo, mat);
  crown.position.y = 0.08;
  group.add(crown);

  // 帽徽（金色）
  const emblemGeo = new THREE.CircleGeometry(0.025, 8);
  const emblemMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.6, roughness: 0.3 });
  const emblem = new THREE.Mesh(emblemGeo, emblemMat);
  emblem.position.set(0, 0.09, 0.1);
  emblem.rotation.y = Math.PI;
  group.add(emblem);

  return group;
}

/**
 * 建造完整的拿破仑角色
 */
export function buildNapoleonCharacter() {
  const root = new THREE.Group();
  root.name = 'napoleon';

  const UNIFORM_BLUE = 0x1a3a5c;
  const PANT_WHITE = 0xe8e0d0;
  const BOOT_BLACK = 0x1a1a1a;
  const GOLD_TRIM = 0xc9a84c;

  // 躯干（军服上衣）
  const torso = buildTorso(UNIFORM_BLUE);
  torso.position.y = 0.85;
  root.add(torso);

  // 金色肩章
  const epauletMat = new THREE.MeshStandardMaterial({ color: GOLD_TRIM, metalness: 0.6, roughness: 0.3 });
  [-0.21, 0.21].forEach(x => {
    const epGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.04, 12);
    const ep = new THREE.Mesh(epGeo, epauletMat);
    ep.position.set(x, 1.05, 0);
    ep.rotation.z = x > 0 ? -Math.PI / 6 : Math.PI / 6;
    root.add(ep);
  });

  // 头部
  const head = buildHead(SKIN_COLOR);
  head.position.y = 1.22;
  root.add(head);

  // 帽子
  const hat = buildNapoleonHat();
  hat.position.y = 1.38;
  hat.rotation.y = Math.PI / 2; // 双角帽侧面朝前
  root.add(hat);
  root.hat = hat;

  // 左臂
  const leftArm = buildArm('left', UNIFORM_BLUE, SKIN_COLOR);
  leftArm.position.set(-0.23, 1.05, 0);
  root.add(leftArm);

  // 右臂
  const rightArm = buildArm('right', UNIFORM_BLUE, SKIN_COLOR);
  rightArm.position.set(0.23, 1.05, 0);
  root.add(rightArm);
  root.rightArm = rightArm;

  // 骨盆
  const pelvisGeo = new THREE.BoxGeometry(0.32, 0.1, 0.2);
  const pelvisMat = new THREE.MeshStandardMaterial({ color: PANT_WHITE, roughness: 0.8 });
  const pelvis = new THREE.Mesh(pelvisGeo, pelvisMat);
  pelvis.position.y = 0.62;
  root.add(pelvis);

  // 左腿
  const leftLeg = buildLeg('left', PANT_WHITE, BOOT_BLACK);
  leftLeg.position.set(-0.1, 0.6, 0);
  root.add(leftLeg);
  root.leftLeg = leftLeg;

  // 右腿
  const rightLeg = buildLeg('right', PANT_WHITE, BOOT_BLACK);
  rightLeg.position.set(0.1, 0.6, 0);
  root.add(rightLeg);
  root.rightLeg = rightLeg;

  // 剑（腰间）
  const swordGeo = new THREE.BoxGeometry(0.015, 0.45, 0.008);
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.1 });
  const sword = new THREE.Mesh(swordGeo, swordMat);
  sword.position.set(-0.18, 0.72, 0.1);
  sword.rotation.z = 0.3;
  root.add(sword);

  root.castShadow = true;
  root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

  return root;
}

/**
 * 通用NPC角色构建器（支持自定义颜色）
 */
export function buildNPCCharacter(config = {}) {
  const {
    clothColor = 0x5c3a1a,
    pantColor = 0x4a3020,
    bootColor = 0x1a1212,
    skinColor = SKIN_COLOR,
    hatColor = null,
    name = 'npc',
  } = config;

  const root = new THREE.Group();
  root.name = name;

  // 躯干
  const torso = buildTorso(clothColor);
  torso.position.y = 0.85;
  root.add(torso);

  // 头部
  const head = buildHead(skinColor);
  head.position.y = 1.22;
  root.add(head);

  // 简单帽子
  if (hatColor) {
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 });
    const hatGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.38;
    root.add(hat);
  }

  // 手臂
  const leftArm = buildArm('left', clothColor, skinColor);
  leftArm.position.set(-0.23, 1.05, 0);
  root.add(leftArm);
  const rightArm = buildArm('right', clothColor, skinColor);
  rightArm.position.set(0.23, 1.05, 0);
  root.add(rightArm);

  // 骨盆
  const pelvisGeo = new THREE.BoxGeometry(0.3, 0.1, 0.18);
  const pelvisMat = new THREE.MeshStandardMaterial({ color: pantColor, roughness: 0.8 });
  const pelvis = new THREE.Mesh(pelvisGeo, pelvisMat);
  pelvis.position.y = 0.62;
  root.add(pelvis);

  // 腿
  const leftLeg = buildLeg('left', pantColor, bootColor);
  leftLeg.position.set(-0.1, 0.6, 0);
  root.add(leftLeg);
  const rightLeg = buildLeg('right', pantColor, bootColor);
  rightLeg.position.set(0.1, 0.6, 0);
  root.add(rightLeg);

  root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return root;
}
