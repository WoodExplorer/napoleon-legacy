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

  // Keyboard-only movement intent. The mobile move stick (moveVector) drives a
  // separate camera-relative path in GameEngine._handleMovement, so it must NOT
  // be folded in here or the two schemes would fight.
  get forward() {
    return this.keys['ArrowUp'] || this.keys['KeyW'];
  }
  get backward() {
    return this.keys['ArrowDown'] || this.keys['KeyS'];
  }
  get turnLeft() {
    return this.keys['ArrowLeft'];
  }
  get turnRight() {
    return this.keys['ArrowRight'];
  }
  // True while the analog move stick is pushed past its deadzone.
  get moveStickActive() {
    const v = this.moveVector;
    return Math.sqrt(v.x * v.x + v.y * v.y) >= 0.18;
  }
  // Keyboard-only camera turn. The mobile look stick (lookVector) is applied
  // separately in GameEngine._handleCamera, so it must NOT be mixed in here or
  // the right stick's rotation would be counted twice.
  get camLeft()  { return this.keys['KeyA']; }
  get camRight() { return this.keys['KeyD']; }
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
    this.touchId = null;   // identifier of the finger that owns this stick
    this.radius = 40;
    this._bind();
  }

  // Find this stick's tracked finger inside a TouchList (it may not be index 0
  // when both joysticks are held at once).
  _findTouch(touchList) {
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === this.touchId) return touchList[i];
    }
    return null;
  }

  _bind() {
    this.base.addEventListener('touchstart', e => {
      if (this.active) return;            // already tracking a finger
      e.preventDefault();
      const t = e.changedTouches[0];
      this.active = true;
      this.touchId = t.identifier;
      const rect = this.base.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this._update(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      if (!this.active) return;
      const t = this._findTouch(e.touches);
      if (!t) return;                     // this stick's finger didn't move
      e.preventDefault();
      this._update(t.clientX, t.clientY);
    }, { passive: false });

    const release = e => {
      if (!this.active || !this._findTouch(e.changedTouches)) return;
      this.active = false;
      this.touchId = null;
      this.thumb.style.transform = 'translate(-50%, -50%)';
      this.onChange(0, 0);
    };
    window.addEventListener('touchend', release);
    window.addEventListener('touchcancel', release);
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
