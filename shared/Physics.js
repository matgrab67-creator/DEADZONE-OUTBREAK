import RAPIER from '@dimforge/rapier3d-compat';
import { obstacles } from './map.js';
import { WEAPONS } from './config.js';

let ready;
export const initPhysics = () => (ready ||= RAPIER.init());
export class Physics {
  constructor(open = []) {
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    this.world.timestep = 1 / 60;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(28, 0.2, 21).setTranslation(0, -0.2, 0));
    this.statics = new Map();
    this.actors = new Map();
    this.actorHandles = new Set();
    for (const b of obstacles(open))
      this.statics.set(
        b.id,
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z),
        ),
      );
    this.controller = this.world.createCharacterController(0.015);
    this.controller.enableSnapToGround(0.15);
    this.controller.setSlideEnabled(true);
    this.world.step();
  }
  openDoor(id) {
    const c = this.statics.get(id);
    if (c) {
      this.world.removeCollider(c, true);
      this.statics.delete(id);
      this.world.step();
    }
  }
  add(p) {
    if (this.actors.has(p.id)) return;
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.52, 0.32).setTranslation(p.x, p.y + 0.84, p.z),
    );
    this.actors.set(p.id, { collider, crouch: false });
    this.actorHandles.add(collider.handle);
    this.world.step();
  }
  remove(id) {
    const actor = this.actors.get(id);
    if (actor) {
      this.actorHandles.delete(actor.collider.handle);
      this.world.removeCollider(actor.collider, true);
      this.actors.delete(id);
    }
  }
  move(p, input, dt) {
    this.add(p);
    const actor = this.actors.get(p.id);
    p.slideCooldown = Math.max(0, p.slideCooldown - dt);
    const horizontalSpeed = Math.hypot(p.vx, p.vz);
    const directionalInput = input.forward || input.back || input.left || input.right;
    if (
      input.crouch &&
      !actor.crouch &&
      p.grounded &&
      directionalInput &&
      !input.walk &&
      horizontalSpeed >= 3.2 &&
      p.slideCooldown === 0
    ) {
      p.slideTime = 0.72;
      p.slideCooldown = 1.15;
      const boost = Math.min(7.2, horizontalSpeed * 1.15) / (horizontalSpeed || 1);
      p.vx *= boost;
      p.vz *= boost;
    }
    p.slideTime = Math.max(0, p.slideTime - dt);
    p.sliding = p.slideTime > 0;
    let crouch = !!input.crouch || p.sliding;
    // Clearance is tested before expanding the capsule after crouching.
    if (actor.crouch && !crouch) {
      const hit = this.world.castRay(
        new RAPIER.Ray({ x: p.x, y: p.y + 0.8, z: p.z }, { x: 0, y: 1, z: 0 }),
        1,
        true,
        undefined,
        undefined,
        actor.collider,
      );
      if (hit) crouch = true;
    }
    if (actor.crouch !== crouch) {
      actor.collider.setShape(new RAPIER.Capsule(crouch ? 0.2 : 0.52, 0.32));
      actor.crouch = crouch;
    }
    p.crouch = crouch;
    const center = crouch ? 0.52 : 0.84;
    actor.collider.setTranslation({ x: p.x, y: p.y + center, z: p.z });
    const w = WEAPONS[p.inventory[p.slot]?.id] || WEAPONS.vx9;
    let speed =
      4.6 *
      w.weight *
      (p.perks.includes('ghost') ? 1.18 : 1) *
      (p.sliding ? 0 : crouch ? 0.48 : input.walk ? 0.55 : 1) *
      (input.ads ? 0.7 : 1);
    const sx = Number(input.right) - Number(input.left),
      sz = Number(input.back) - Number(input.forward),
      len = Math.hypot(sx, sz) || 1;
    const tx = ((sx * Math.cos(p.yaw) + sz * Math.sin(p.yaw)) / len) * speed,
      tz = ((-sx * Math.sin(p.yaw) + sz * Math.cos(p.yaw)) / len) * speed;
    const accel = 1 - Math.exp(-(p.sliding ? 1.4 : p.grounded ? 18 : 5) * dt);
    p.vx += (tx - p.vx) * accel;
    p.vz += (tz - p.vz) * accel;
    if (p.sliding) {
      const friction = Math.exp(-1.25 * dt);
      p.vx *= friction;
      p.vz *= friction;
    }
    if (input.jump && p.grounded && !p.jumpHeld) {
      p.vy = 6.3;
      p.grounded = false;
    }
    p.jumpHeld = input.jump;
    p.vy = Math.max(-20, p.vy - 20 * dt);
    this.controller.computeColliderMovement(
      actor.collider,
      { x: p.vx * dt, y: p.vy * dt, z: p.vz * dt },
      undefined,
      undefined,
      (c) => !this.actorHandles.has(c.handle),
    );
    const m = this.controller.computedMovement();
    p.x += m.x;
    p.y = Math.max(0, p.y + m.y);
    p.z += m.z;
    p.grounded = this.controller.computedGrounded() || p.y <= 0.03;
    if (p.grounded && p.vy < 0) p.vy = 0;
    actor.collider.setTranslation({ x: p.x, y: p.y + center, z: p.z });
  }
  step() {
    this.world.step();
  }
  dispose() {
    this.world.free();
  }
}
