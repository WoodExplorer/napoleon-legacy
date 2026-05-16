/**
 * CharacterAnimator - 处理角色行走、待机、说话动画
 */
export class CharacterAnimator {
  constructor(characterRoot) {
    this.root = characterRoot;
    this.time = 0;
    this.state = 'idle'; // 'idle' | 'walk' | 'talk'
    this.talkTimer = 0;
  }

  setState(state) { this.state = state; }

  update(delta) {
    this.time += delta;
    const t = this.time;

    switch (this.state) {
      case 'idle':  this._animateIdle(t); break;
      case 'walk':  this._animateWalk(t); break;
      case 'talk':  this._animateTalk(t); break;
    }
  }

  _animateIdle(t) {
    // 轻微呼吸起伏
    if (this.root.rightArm) {
      this.root.rightArm.rotation.x = Math.sin(t * 1.2) * 0.03;
    }
    // 帽子微微晃动
    if (this.root.hat) {
      this.root.hat.rotation.z = Math.sin(t * 0.8) * 0.01;
    }
    // 身体轻微上下
    this.root.position.y = Math.sin(t * 1.2) * 0.005;
  }

  _animateWalk(t) {
    const speed = 6;
    const swing = 0.35;

    if (this.root.leftLeg) {
      this.root.leftLeg.rotation.x = Math.sin(t * speed) * swing;
    }
    if (this.root.rightLeg) {
      this.root.rightLeg.rotation.x = Math.sin(t * speed + Math.PI) * swing;
    }
    if (this.root.rightArm) {
      this.root.rightArm.rotation.x = Math.sin(t * speed + Math.PI) * 0.25;
    }
    // 身体左右轻微摇摆
    this.root.rotation.z = Math.sin(t * speed) * 0.02;
    this.root.position.y = Math.abs(Math.sin(t * speed)) * 0.02;
  }

  _animateTalk(t) {
    // 说话时手臂有节奏地摆动
    if (this.root.rightArm) {
      this.root.rightArm.rotation.x = Math.sin(t * 3) * 0.15;
      this.root.rightArm.rotation.z = -0.2 + Math.sin(t * 3) * 0.1;
    }
    // 头部轻微点头
    this.root.position.y = Math.sin(t * 2) * 0.005;
  }
}
