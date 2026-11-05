import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { terrainMesh, terrainHeight } from '../../shared/Forest.js';

const v = new THREE.Vector3(),
  q = new THREE.Quaternion(),
  inverse = new THREE.Quaternion(),
  worldPos = new THREE.Vector3();
const vector = (p) => ({ x: p.x, y: p.y, z: p.z });
export class RagdollWorld {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -16, z: 0 });
    this.world.timestep = 1 / 60;
    this.world.numSolverIterations = 6;
    this.floor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(220, 0.2, 220)
        .setTranslation(0, -0.2, 0)
        .setCollisionGroups(0x00010002),
    );
    this.active = new Map();
    this.proxies = new Map();
    this.terrain = new Map();
    this.accumulator = 0;
    this.syncAt = 0;
    this.seed = null;
    this.obstacles = [];
    this.impacts = [];
  }
  setEnvironment(obstacles, seed = null) {
    if (this.obstacles === obstacles && this.seed === seed) return;
    this.obstacles = obstacles || [];
    if (this.seed !== seed) {
      for (const c of this.terrain.values()) this.world.removeCollider(c, true);
      this.terrain.clear();
      this.seed = seed;
    }
    this.syncAt = 0;
  }
  spawn(model, info = {}) {
    while (this.active.size >= 28) this.freeze(this.active.keys().next().value);
    model.root.updateMatrixWorld(true);
    // The neck is a sibling of the head. Preserve its transform relative to the
    // head so it follows the corpse instead of remaining at the death position.
    const neckPosition = model.head.worldToLocal(model.neck.getWorldPosition(new THREE.Vector3()));
    const neckRotation = model.head
      .getWorldQuaternion(new THREE.Quaternion())
      .invert()
      .multiply(model.neck.getWorldQuaternion(new THREE.Quaternion()));
    const factor = model.root.scale.x,
      parts = [],
      byBone = new Map();
    const add = (bone, offset, radius, half, mass) => {
      const local = new THREE.Vector3(...offset);
      bone.getWorldQuaternion(q);
      v.copy(local).applyMatrix4(bone.matrixWorld);
      const desc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(v.x, v.y, v.z)
        .setRotation(q)
        .setLinearDamping(0.16)
        .setAngularDamping(1.6)
        .setCcdEnabled(true);
      const body = this.world.createRigidBody(desc);
      this.world.createCollider(
        RAPIER.ColliderDesc.capsule(half * factor, radius * factor)
          .setMass(mass * factor)
          .setFriction(0.85)
          .setRestitution(0.06)
          .setCollisionGroups(0x00020001),
        body,
      );
      const part = { bone, body, offset: local.multiplyScalar(factor) };
      parts.push(part);
      byBone.set(bone, part);
      return part;
    };
    const torso = add(model.chest, [0, -0.035, 0], 0.16, 0.12, 14),
      pelvis = add(model.pelvis, [0, 0, 0], 0.13, 0.045, 10),
      head = add(model.head, [0, 0, 0], 0.115, 0.045, 4);
    const anchor = (part, point) => {
      const r = part.body.rotation();
      inverse.set(r.x, r.y, r.z, r.w).invert();
      const p = part.body.translation();
      return vector(
        new THREE.Vector3(point.x - p.x, point.y - p.y, point.z - p.z).applyQuaternion(inverse),
      );
    };
    const joint = (a, b, bone) => {
      bone.getWorldPosition(v);
      const data = RAPIER.JointData.spherical(anchor(a, v), anchor(b, v));
      this.world.createImpulseJoint(data, a.body, b.body, true).setContactsEnabled(false);
    };
    joint(torso, pelvis, model.pelvis);
    joint(torso, head, model.neck);
    for (let i = 0; i < 2; i++) {
      const arm = add(model.arms[i], [0, -0.145, 0], 0.055, 0.09, 2.2),
        forearm = add(model.elbows[i], [0, -0.135, 0], 0.045, 0.09, 1.6);
      const thigh = add(model.legs[i], [0, -0.185, 0], 0.08, 0.105, 5),
        shin = add(model.knees[i], [0, -0.155, 0], 0.06, 0.095, 3.2);
      joint(torso, arm, model.arms[i]);
      joint(arm, forearm, model.elbows[i]);
      joint(pelvis, thigh, model.legs[i]);
      joint(thigh, shin, model.knees[i]);
    }
    const d = info.direction || { x: Math.sin(info.seed || 1), z: Math.cos(info.seed || 1) },
      len = Math.hypot(d.x, d.z) || 1,
      force = 0.8 + (info.impulse || 0.3) * 1.9;
    for (const p of parts)
      p.body.setLinvel({ x: (d.x / len) * force, y: 0.1, z: (d.z / len) * force }, true);
    torso.body.setAngvel({ x: (d.z / len) * 1.8, y: 0.13, z: (-d.x / len) * 1.8 }, true);
    if (info.head) head.body.setAngvel({ x: 1.5, y: 0.3, z: (info.seed % 2 ? 1 : -1) * 1.7 }, true);
    this.active.set(model, {
      model,
      parts,
      torso,
      neckPosition,
      neckRotation,
      age: 0,
      impact: false,
    });
    model.ragdoll = true;
    this.syncStatics();
    return true;
  }
  syncStatics() {
    const boxes = new Map(),
      chunks = new Map();
    for (const rag of this.active.values()) {
      const p = rag.torso.body.translation();
      for (const b of this.obstacles.query?.(p.x, p.z, 7) || this.obstacles)
        if (Math.abs(p.x - b.x) < b.w / 2 + 7 && Math.abs(p.z - b.z) < b.d / 2 + 7)
          boxes.set(b.id, b);
      if (this.seed !== null) {
        const cx = Math.round(p.x / 24),
          cz = Math.round(p.z / 24);
        for (let z = cz - 1; z <= cz + 1; z++)
          for (let x = cx - 1; x <= cx + 1; x++) chunks.set(`${x}:${z}`, { x, z });
      }
    }
    for (const [id, c] of this.proxies)
      if (!boxes.has(id)) {
        this.world.removeCollider(c, true);
        this.proxies.delete(id);
      }
    for (const [id, b] of boxes)
      if (!this.proxies.has(id))
        this.proxies.set(
          id,
          this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2)
              .setTranslation(b.x, b.y, b.z)
              .setCollisionGroups(0x00010002),
          ),
        );
    for (const [id, c] of this.terrain)
      if (!chunks.has(id)) {
        this.world.removeCollider(c, true);
        this.terrain.delete(id);
      }
    for (const [id, { x, z }] of chunks)
      if (!this.terrain.has(id)) {
        const m = terrainMesh(this.seed, x, z);
        this.terrain.set(
          id,
          this.world.createCollider(
            RAPIER.ColliderDesc.trimesh(m.vertices, m.indices).setCollisionGroups(0x00010002),
          ),
        );
      }
  }
  update(dt) {
    if (!this.active.size) return;
    this.syncAt -= dt;
    if (this.syncAt <= 0) {
      this.syncAt = 0.4;
      this.syncStatics();
    }
    this.accumulator += Math.min(dt, 0.0667);
    let steps = 0;
    while (this.accumulator >= 1 / 60 && steps++ < 4) {
      const velocities = new Map([...this.active].map(([m, r]) => [m, r.torso.body.linvel().y]));
      this.world.step();
      this.accumulator -= 1 / 60;
      for (const [m, r] of this.active) {
        const p = r.torso.body.translation(),
          before = velocities.get(m);
        if (!r.impact && before < -1.4 && r.torso.body.linvel().y > before * 0.4) {
          r.impact = true;
          this.impacts.push({
            x: p.x,
            y: this.seed === null ? 0.04 : terrainHeight(this.seed, p.x, p.z) + 0.04,
            z: p.z,
            force: Math.abs(before),
          });
        }
      }
    }
    for (const [m, r] of this.active) {
      r.age += dt;
      // Parent bones are updated before their children; every transform comes from Rapier.
      for (const p of r.parts) {
        const rot = p.body.rotation();
        q.set(rot.x, rot.y, rot.z, rot.w);
        v.copy(p.offset).applyQuaternion(q);
        const pos = p.body.translation();
        worldPos.set(pos.x - v.x, pos.y - v.y, pos.z - v.z);
        p.bone.parent.updateWorldMatrix(true, false);
        p.bone.position.copy(p.bone.parent.worldToLocal(worldPos));
        p.bone.parent.getWorldQuaternion(inverse).invert();
        p.bone.quaternion.copy(inverse.multiply(q));
        p.bone.updateWorldMatrix(false, true);
      }
      worldPos.copy(r.neckPosition).applyMatrix4(m.head.matrixWorld);
      m.head.getWorldQuaternion(q).multiply(r.neckRotation);
      m.neck.parent.updateWorldMatrix(true, false);
      m.neck.position.copy(m.neck.parent.worldToLocal(worldPos));
      m.neck.parent.getWorldQuaternion(inverse).invert();
      m.neck.quaternion.copy(inverse.multiply(q));
      m.neck.updateWorldMatrix(false, true);
      if (r.age > 3.5) this.freeze(m);
    }
  }
  freeze(model) {
    const rag = this.active.get(model);
    if (!rag) return;
    for (const part of rag.parts) this.world.removeRigidBody(part.body);
    this.active.delete(model);
  }
  takeImpacts() {
    return this.impacts.splice(0);
  }
  reset() {
    for (const m of [...this.active.keys()]) this.freeze(m);
    for (const c of [...this.proxies.values(), ...this.terrain.values()])
      this.world.removeCollider(c, true);
    this.proxies.clear();
    this.terrain.clear();
    this.impacts = [];
    this.accumulator = 0;
  }
  dispose() {
    this.reset();
    this.world.free();
  }
}
