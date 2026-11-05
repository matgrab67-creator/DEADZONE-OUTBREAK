import { PointerLook } from '../player/PointerLook.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.fire = false;
    this.firePressed = false;
    this.ads = false;
    this.enabled = false;
    this.sensitivity = 0.0022;
    this.seq = 0;
    this.look = new PointerLook();
    this.onAction = () => {};
    this.onLockChange = () => {};
    addEventListener('keydown', (e) => {
      if (!this.enabled || !this.locked) return;
      if (
        ['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft', 'ControlRight'].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Escape') this.onAction({ type: 'pause' });
      if (e.code === 'KeyR') this.onAction({ type: 'reload' });
      if (e.code === 'KeyE') this.onAction({ type: 'interact' });
      if (e.code === 'KeyG') this.onAction({ type: 'grenade' });
      if (e.code === 'KeyF') this.onAction({ type: 'knifeToggle' });
      if (e.code === 'KeyV') this.onAction({ type: 'inspect' });
      if (e.code === 'KeyB') this.onAction({ type: 'shop' });
      if (e.code === 'KeyN') this.onAction({ type: 'skins' });
      if (e.code === 'KeyL') this.onAction({ type: 'flashlight' });
      if (e.code === 'KeyH') this.onAction({ type: 'equipment', item: 'medkit' });
      if (e.code === 'KeyJ') this.onAction({ type: 'equipment', item: 'molotov' });
      if (e.code === 'KeyT') this.onAction({ type: 'equipment', item: 'trap' });
      if (e.code === 'KeyO') this.onAction({ type: 'equipment', item: 'lantern' });
      if (e.code === 'KeyK') this.onAction({ type: 'craftMenu' });
      if (e.code === 'KeyP') this.onAction({ type: 'trainingMenu' });
      if (e.code === 'KeyM') this.onAction({ type: 'map' });
      if (e.code === 'KeyU') this.onAction({ type: 'trainingReset' });
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code))
        this.onAction({ type: 'switch', slot: Number(e.code.slice(-1)) - 1 });
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.look.apply(this, e.movementX, e.movementY, this.sensitivity, performance.now());
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked || !this.enabled) return;
      if (e.button === 0) {
        this.fire = true;
        this.firePressed = true;
      }
      if (e.button === 2) this.ads = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.ads = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.look.reset(performance.now());
      this.deltaX = 0;
      this.deltaY = 0;
      if (!this.locked) this.clear();
      this.onLockChange(this.locked);
    });
    addEventListener('blur', () => {
      this.clear();
      this.look.reset(performance.now());
    });
    addEventListener('focus', () => this.look.reset(performance.now()));
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
    this.firePressed = false;
    this.ads = false;
    this.deltaX = 0;
    this.deltaY = 0;
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
      crouch:
        on &&
        (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC')),
      walk: on && this.keys.has('ShiftLeft'),
      fire: on && (this.fire || this.firePressed),
      ads: on && this.ads,
      deltaX: this.deltaX,
      deltaY: this.deltaY,
    };
  }
  endFrame() {
    this.deltaX = 0;
    this.deltaY = 0;
    this.look.endFrame();
  }
  consumeFire() {
    this.firePressed = false;
  }
}
