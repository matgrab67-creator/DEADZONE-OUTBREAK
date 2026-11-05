import * as THREE from 'three';
import { createHumanoid, disposeHumanoid, resetHumanoid } from './ZombieModel.js';
import { RagdollWorld } from './RagdollWorld.js';
import { animateHumanoid, animateDeath, beginDeath } from './ZombieAnimation.js';
import { zombieVerticalOffset, emergenceProgress } from '../../shared/ZombieLifecycle.js';
import { random } from '../../shared/config.js';
import { PlayerWeaponRenderer } from '../multiplayer/PlayerWeaponRenderer.js';
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
    this.peerWeapons = new PlayerWeaponRenderer();
    this.ragdolls = new RagdollWorld();
    this.deaths = new Map();
    this.emergences = new Map();
    this.soilGeometry = new THREE.RingGeometry(0.1, 0.5, 16);
    this.stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
  }
  acquire(type) {
    const list = this.pool.get(type);
    const model = list?.length ? list.pop() : createHumanoid(type);
    resetHumanoid(model);
    model.ragdoll = false;
    return model;
  }
  recordDeath(event) {
    if (this.entities.has(event.zombie)) this.deaths.set(event.zombie, event);
  }
  release(model) {
    this.ragdolls.freeze(model);
    model.root.removeFromParent();
    if (!this.pool.has(model.type)) this.pool.set(model.type, []);
    const pool = this.pool.get(model.type);
    if (pool.length < 4) pool.push(model);
    else disposeHumanoid(model);
  }
  createEmergence(z) {
    const group = new THREE.Group(),
      material = new THREE.MeshStandardMaterial({
        color: 0x342b23,
        roughness: 1,
        transparent: true,
        depthWrite: false,
      });
    const ring = new THREE.Mesh(this.soilGeometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.021;
    const stones = new THREE.InstancedMesh(this.stoneGeometry, material, 8);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.399,
        radius = 0.2 + random(i + z.spawnAt) * 0.28;
      matrix.compose(
        new THREE.Vector3(Math.cos(angle) * radius, 0.035, Math.sin(angle) * radius),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, i)),
        new THREE.Vector3(0.055 + random(i) * 0.055, 0.035, 0.055),
      );
      stones.setMatrixAt(i, matrix);
    }
    group.add(ring, stones);
    group.position.set(z.x, z.groundY || 0, z.z);
    this.scene.add(group);
    this.emergences.set(z.id, { group, material, start: z.spawnAt, end: z.emergeEnd });
  }
  place(model, z, time, dt) {
    if (!model.teammate)
      model.root.scale
        .copy(model.restPose.get(model.root).scale)
        .multiplyScalar(z.finalBoss ? 1.35 : 1);
    if (!model.teammate)
      model.materials[6].emissive.setHex(z.finalBoss && z.shielded ? 0x46b7ff : 0xff6500);
    model.groundY = z.groundY || 0;
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
    if (!model.teammate) model.root.position.y = zombieVerticalOffset(z, time);
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
        model.death = null;
        for (const material of model.materials) {
          material.opacity = 1;
          material.transparent = false;
          material.depthWrite = true;
        }
        this.entities.set(z.id, model);
        this.scene.add(model.root);
        if (emergenceProgress(z, time) < 1) this.createEmergence(z);
      }
      this.place(model, z, time, dt);
    }
    for (const [id, model] of this.entities)
      if (!ids.has(id)) {
        this.entities.delete(id);
        const info = this.deaths.get(id) || {};
        if (this.corpses.length >= 28) this.release(this.corpses.shift().model);
        beginDeath(model, { ...info, seed: Number(id.replace(/\D/g, '')) || 1 });
        this.ragdolls.spawn(model, { ...info, seed: Number(id.replace(/\D/g, '')) || 1 });
        this.deaths.delete(id);
        this.corpses.push({ model, age: 0 });
      }
    this.ragdolls.update(dt);
    for (const impact of this.ragdolls.takeImpacts()) this.onImpact?.(impact);
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      corpse.age += dt;
      if (!corpse.model.ragdoll) animateDeath(corpse.model, corpse.age, dt);
      else
        for (const mat of corpse.model.materials) {
          const opacity = 1 - THREE.MathUtils.smoothstep(corpse.age, 5.5, 7);
          mat.opacity = opacity;
          mat.transparent = opacity < 1;
          mat.depthWrite = opacity > 0.65;
        }
      if (corpse.age > 7) {
        this.release(corpse.model);
        this.corpses.splice(i, 1);
      }
    }
    while (this.corpses.length > 28) this.release(this.corpses.shift().model);
    for (const [id, effect] of this.emergences) {
      const t = (time - effect.start) / Math.max(0.1, effect.end - effect.start);
      effect.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.65) / 0.65);
      effect.group.scale.setScalar(0.8 + Math.min(1, t) * 0.25);
      if (t > 1.3 || !ids.has(id)) {
        effect.group.removeFromParent();
        effect.material.dispose();
        this.emergences.delete(id);
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
      this.peerWeapons.update(p, model);
    }
    for (const [id, model] of this.peers)
      if (!peers.has(id)) {
        this.peerWeapons.remove(id);
        disposeHumanoid(model);
        this.peers.delete(id);
      }
  }
  reset() {
    this.ragdolls.reset();
    this.peerWeapons.reset();
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
    this.deaths.clear();
    for (const effect of this.emergences.values()) {
      effect.group.removeFromParent();
      effect.material.dispose();
    }
    this.emergences.clear();
  }
}
