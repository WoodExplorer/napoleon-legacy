/**
 * InputController - 键盘/手机输入控制
 */
export class InputController {
  constructor() {
    this.keys = {};
    this.moveVector = { x: 0, y: 0 };   // 手机摇杆移动
    this.lookVector = { x: 0, y: 0 };   // 手机摇杆视角
    this.interactPressed = false;
    this._bindKeyboard();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.interactPressed = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  get forward() {
    return this.keys['ArrowUp'] || this.keys['KeyW'] || this.moveVector.y < -0.3;
  }
  get backward() {
    return this.keys['ArrowDown'] || this.keys['KeyS'] || this.moveVector.y > 0.3;
  }
  get turnLeft() {
    return this.keys['ArrowLeft'] || this.moveVector.x < -0.3;
  }
  get turnRight() {
    return this.keys['ArrowRight'] || this.moveVector.x > 0.3;
  }
  get camLeft()  { return this.keys['KeyA'] || this.lookVector.x < -0.3; }
  get camRight() { return this.keys['KeyD'] || this.lookVector.x > 0.3; }
  get camUp()    { return this.keys['KeyW'] && !this.forward ? false : this.lookVector.y < -0.3; }
  get camDown()  { return this.lookVector.y > 0.3; }
  get escape()   { return this.keys['Escape']; }

  consumeInteract() {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }
}

/**
 * MobileJoystick - 虚拟摇杆
 */
export class MobileJoystick {
  constructor(baseEl, thumbEl, onChange) {
    this.base = baseEl;
    this.thumb = thumbEl;
    this.onChange = onChange;
    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.radius = 40;
    this._bind();
  }

  _bind() {
    this.base.addEventListener('touchstart', e => {
      e.preventDefault();
      this.active = true;
      const t = e.touches[0];
      const rect = this.base.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this._update(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      if (!this.active) return;
      e.preventDefault();
      const t = e.touches[0];
      this._update(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (!this.active) return;
      this.active = false;
      this.thumb.style.transform = 'translate(-50%, -50%)';
      this.onChange(0, 0);
    });
  }

  _update(cx, cy) {
    let dx = cx - this.centerX;
    let dy = cy - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.onChange(dx / this.radius, dy / this.radius);
  }
}
