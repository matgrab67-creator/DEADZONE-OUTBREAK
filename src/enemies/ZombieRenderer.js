import * as THREE from 'three';
import { createHumanoid, disposeHumanoid } from './ZombieModel.js';
import { animateHumanoid, animateDeath } from './ZombieAnimation.js';
export { createHumanoid } from './ZombieModel.js';

const angleDelta = (from, to) =>
  THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;

export class ZombieRenderer {
  constructor(scene) {
    this.scene = scene;
    this.entities = new Map();
    this.corpses = [];
    this.pool = new Map();
    this.peers = new Map();
  }
  acquire(type) {
    const list = this.pool.get(type);
    return list?.length ? list.pop() : createHumanoid(type);
  }
  place(model, z, time, dt) {
    const previousX = model.root.position.x,
      previousZ = model.root.position.z;
    model.root.position.x = THREE.MathUtils.damp(previousX, z.x, 20, dt);
    model.root.position.z = THREE.MathUtils.damp(previousZ, z.z, 20, dt);
    model.root.rotation.y +=
      angleDelta(model.root.rotation.y, z.yaw || 0) * (1 - Math.exp(-15 * dt));
    const speed =
      dt > 0
        ? Math.hypot(model.root.position.x - previousX, model.root.position.z - previousZ) / dt
        : 0;
    animateHumanoid(model, z, time, dt, speed);
  }
  update(zombies, players, localId, time, dt) {
    const ids = new Set();
    for (const z of zombies) {
      ids.add(z.id);
      let model = this.entities.get(z.id);
      if (!model) {
        model = this.acquire(z.type);
        model.root.visible = true;
        model.root.rotation.set(0, z.yaw || 0, 0);
        model.root.position.set(z.x, 0, z.z);
        model.lastSpeed = 0;
        this.entities.set(z.id, model);
        this.scene.add(model.root);
      }
      this.place(model, z, time, dt);
    }
    for (const [id, model] of this.entities)
      if (!ids.has(id)) {
        this.entities.delete(id);
        this.corpses.push({ model, age: 0 });
      }
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      corpse.age += dt;
      animateDeath(corpse.model, corpse.age, dt);
      if (corpse.age > 4) {
        this.scene.remove(corpse.model.root);
        corpse.model.root.position.y = 0;
        if (!this.pool.has(corpse.model.type)) this.pool.set(corpse.model.type, []);
        this.pool.get(corpse.model.type).push(corpse.model);
        this.corpses.splice(i, 1);
      }
    }
    const peers = new Set();
    for (const p of players) {
      if (p.id === localId || p.eliminated) continue;
      peers.add(p.id);
      let model = this.peers.get(p.id);
      if (!model) {
        model = createHumanoid('normal', true);
        this.peers.set(p.id, model);
        this.scene.add(model.root);
        model.root.position.set(p.x, p.y, p.z);
      }
      this.place(model, p, time, dt);
      model.root.position.y = p.y || 0;
      model.root.rotation.z = THREE.MathUtils.damp(
        model.root.rotation.z,
        p.downed ? Math.PI / 2 : 0,
        10,
        dt,
      );
      if (p.downed) model.root.position.y = 0.22;
    }
    for (const [id, model] of this.peers)
      if (!peers.has(id)) {
        disposeHumanoid(model);
        this.peers.delete(id);
      }
  }
  reset() {
    const all = new Set([
      ...this.entities.values(),
      ...this.corpses.map((c) => c.model),
      ...this.peers.values(),
      ...[...this.pool.values()].flat(),
    ]);
    for (const model of all) disposeHumanoid(model);
    this.entities.clear();
    this.corpses = [];
    this.peers.clear();
    this.pool.clear();
  }
}
