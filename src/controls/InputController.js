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
 * MobileJoystick - 虚拟摇杆 (floating)
 *
 * Touch anywhere in the stick's zone and the visible ring re-centers under the
 * finger; you then drag from there. First touch reports zero deflection (no
 * "jump" to full), and the ring snaps back to its home corner on release.
 */
export class MobileJoystick {
  constructor(zoneEl, thumbEl, onChange) {
    this.zone = zoneEl;                                   // .joystick-container (touch zone)
    this.visual = zoneEl.querySelector('.joystick-base') || zoneEl; // ring that floats
    this.thumb = thumbEl;
    this.onChange = onChange;
    this.active = false;
    this.touchId = null;   // identifier of the finger that owns this stick
    this.radius = 40;
    this.centerX = 0;      // dynamic center = where the finger first landed
    this.centerY = 0;
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
    this.zone.addEventListener('touchstart', e => {
      if (this.active) return;            // already tracking a finger
      // An overlapping control (e.g. the interact button) owns its own touches.
      if (e.target.closest?.('#mobile-interact')) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      this.active = true;
      this.touchId = t.identifier;
      this.centerX = t.clientX;           // anchor the origin at the touch point
      this.centerY = t.clientY;
      this._floatTo(t.clientX, t.clientY);
      // Start at rest: zero deflection, so a tap never slams the stick to full.
      this.thumb.style.transform = 'translate(-50%, -50%)';
      this.onChange(0, 0);
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
      this._resetFloat();
      this.thumb.style.transform = 'translate(-50%, -50%)';
      this.onChange(0, 0);
    };
    window.addEventListener('touchend', release);
    window.addEventListener('touchcancel', release);
  }

  // Pin the ring's center under the finger. Uses container-local coordinates so
  // the ring stays position:absolute (its CSS default) and the snap-home
  // transition can animate left/top back to the home anchor on release.
  _floatTo(x, y) {
    const rect = this.zone.getBoundingClientRect();
    const v = this.visual;
    v.style.left = `${x - rect.left}px`;
    v.style.top = `${y - rect.top}px`;
    v.style.right = 'auto';
    v.style.bottom = 'auto';
    v.style.transform = 'translate(-50%, -50%)';
    v.classList.add('floating');
  }

  // Return the ring to its CSS home anchor (transition animates the snap-back).
  _resetFloat() {
    const v = this.visual;
    v.style.left = '';
    v.style.top = '';
    v.style.right = '';
    v.style.bottom = '';
    v.style.transform = '';
    v.classList.remove('floating');
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
