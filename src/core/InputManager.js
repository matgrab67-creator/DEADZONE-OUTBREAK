export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.fire = false;
    this.ads = false;
    this.enabled = false;
    this.sensitivity = 0.0022;
    this.seq = 0;
    this.onAction = () => {};
    this.onLockChange = () => {};
    addEventListener('keydown', (e) => {
      if (!this.enabled || !this.locked) return;
      if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft'].includes(e.code))
        e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Escape') this.onAction({ type: 'pause' });
      if (e.code === 'KeyR') this.onAction({ type: 'reload' });
      if (e.code === 'KeyG') this.onAction({ type: 'grenade' });
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code))
        this.onAction({ type: 'switch', slot: Number(e.code.slice(-1)) - 1 });
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch - e.movementY * this.sensitivity));
      this.deltaX += e.movementX;
      this.deltaY += e.movementY;
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked || !this.enabled) return;
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.ads = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.ads = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (!this.locked) this.clear();
      this.onLockChange(this.locked);
    });
    addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clear();
        document.exitPointerLock?.();
      }
    });
  }
  get locked() {
    return document.pointerLockElement === this.canvas;
  }
  lock() {
    const result = this.canvas.requestPointerLock?.();
    result?.catch(() => this.onLockChange(false));
  }
  clear() {
    this.keys.clear();
    this.fire = false;
    this.ads = false;
  }
  sample(active = true) {
    const on = active && this.enabled && this.locked;
    return {
      seq: ++this.seq,
      yaw: this.yaw,
      pitch: this.pitch,
      forward: on && this.keys.has('KeyW'),
      back: on && this.keys.has('KeyS'),
      left: on && this.keys.has('KeyA'),
      right: on && this.keys.has('KeyD'),
      jump: on && this.keys.has('Space'),
      crouch: on && (this.keys.has('ControlLeft') || this.keys.has('KeyC')),
      walk: on && this.keys.has('ShiftLeft'),
      fire: on && this.fire,
      ads: on && this.ads,
      deltaX: this.deltaX,
      deltaY: this.deltaY,
    };
  }
  endFrame() {
    this.deltaX = 0;
    this.deltaY = 0;
  }
}
