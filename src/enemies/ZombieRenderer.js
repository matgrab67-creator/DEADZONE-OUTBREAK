import * as THREE from 'three';
import { ZOMBIES } from '../../shared/config.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1),
  sphereGeometry = new THREE.SphereGeometry(1, 10, 8);
function part(parent, geometry, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function createHumanoid(type = 'normal', teammate = false) {
  const def = ZOMBIES[type],
    root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const h = def.height / 1.8;
  const skin = new THREE.MeshStandardMaterial({
    color: teammate ? 0xb8a38a : def.color,
    roughness: 0.94,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: teammate ? 0x6e7c5e : type === 'runner' ? 0x5a342b : 0x33463b,
    roughness: 0.85,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2926, roughness: 0.7, metalness: 0.25 });
  const eye = new THREE.MeshStandardMaterial({
    color: teammate ? 0x85d3c3 : type === 'boss' ? 0xffb57a : 0xd7e8a2,
    emissive: teammate ? 0x548a89 : 0xc8d780,
    emissiveIntensity: 3,
  });
  part(body, boxGeometry, cloth, 0, 1.08, 0, 0.5, 0.62, 0.28);
  part(body, sphereGeometry, skin, 0, 1.17, -0.015, 0.28, 0.31, 0.18);
  part(body, boxGeometry, cloth, 0, 0.83, 0.015, 0.4, 0.27, 0.29);
  const head = new THREE.Group();
  head.position.set(0, 1.56, -0.035);
  body.add(head);
  part(head, sphereGeometry, skin, 0, 0, 0, 0.18, 0.235, 0.175);
  part(head, boxGeometry, dark, 0, -0.1, -0.151, 0.12, 0.045, 0.04);
  part(head, sphereGeometry, eye, -0.068, 0.033, -0.152, 0.026, 0.018, 0.02);
  part(head, sphereGeometry, eye, 0.068, 0.033, -0.152, 0.026, 0.018, 0.02);
  if (teammate || type === 'armored') {
    part(head, sphereGeometry, dark, 0, 0.09, 0.005, 0.205, 0.18, 0.19);
    part(body, boxGeometry, dark, 0, 1.16, -0.17, 0.58, 0.5, 0.13);
    for (const side of [-1, 1])
      part(body, boxGeometry, dark, side * 0.34, 1.29, 0, 0.19, 0.19, 0.35);
  }
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.32, 0);
    body.add(arm);
    part(arm, boxGeometry, cloth, 0, -0.17, 0, 0.16, 0.35, 0.17);
    const lower = new THREE.Group();
    lower.position.set(0, -0.35, 0);
    arm.add(lower);
    part(lower, boxGeometry, skin, 0, -0.15, -0.02, 0.13, 0.3, 0.13);
    part(lower, sphereGeometry, skin, 0, -0.32, -0.035, 0.085, 0.115, 0.065);
    lower.rotation.x = -0.35;
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.135, 0.79, 0);
    body.add(leg);
    part(leg, boxGeometry, cloth, 0, -0.19, 0, 0.19, 0.38, 0.2);
    part(leg, boxGeometry, dark, 0, -0.52, 0.02, 0.15, 0.32, 0.15);
    part(leg, boxGeometry, dark, 0, -0.72, -0.07, 0.19, 0.13, 0.29);
    legs.push(leg);
  }
  if (type === 'exploder') {
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.25;
      part(
        body,
        sphereGeometry,
        eye,
        Math.sin(angle) * 0.24,
        1 + Math.cos(angle) * 0.2,
        -0.16,
        0.1,
        0.13,
        0.1,
      );
    }
  }
  if (type === 'boss') {
    part(body, sphereGeometry, skin, -0.32, 1.27, 0.05, 0.35, 0.3, 0.3);
    part(body, sphereGeometry, skin, 0.35, 1.2, 0, 0.3, 0.4, 0.28);
    part(body, boxGeometry, dark, 0, 1.03, -0.2, 0.3, 0.4, 0.1);
  }
  root.scale.setScalar(h);
  if (type === 'crawler') {
    root.scale.set(0.8, 0.55, 0.8);
    body.rotation.x = -0.8;
    body.position.y = 0.17;
  }
  return {
    root,
    body,
    head,
    arms,
    legs,
    type,
    materials: [skin, cloth, dark, eye],
    phase: Math.random() * 6,
  };
}
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
  update(zombies, players, localId, time, dt) {
    const ids = new Set();
    for (const z of zombies) {
      ids.add(z.id);
      let model = this.entities.get(z.id);
      if (!model) {
        model = this.acquire(z.type);
        model.root.visible = true;
        model.root.rotation.set(0, 0, 0);
        model.body.rotation.z = 0;
        this.entities.set(z.id, model);
        this.scene.add(model.root);
        model.root.position.set(z.x, 0, z.z);
      }
      const root = model.root;
      root.position.x = THREE.MathUtils.damp(root.position.x, z.x, 20, dt);
      root.position.z = THREE.MathUtils.damp(root.position.z, z.z, 20, dt);
      root.rotation.y = z.yaw;
      const speed = ZOMBIES[z.type].speed,
        phase = time * speed * 4 + model.phase;
      const attack = time - z.lastAttack < 0.35;
      model.body.position.y = Math.sin(phase * 2) * 0.025;
      model.body.rotation.z = Math.sin(phase) * 0.04;
      model.head.rotation.z = Math.sin(time + model.phase) * 0.08;
      model.legs[0].rotation.x = Math.sin(phase) * 0.45;
      model.legs[1].rotation.x = -Math.sin(phase) * 0.45;
      model.arms[0].rotation.x = attack ? -1.8 : -0.95 + Math.sin(phase) * 0.15;
      model.arms[1].rotation.x = attack ? -1.6 : -1.1 - Math.sin(phase) * 0.15;
      if (time - z.hitAt < 0.12) model.body.rotation.x = -0.12;
      else model.body.rotation.x = z.type === 'crawler' ? -0.8 : 0;
    }
    for (const [id, model] of this.entities)
      if (!ids.has(id)) {
        this.entities.delete(id);
        this.corpses.push({ model, age: 0 });
      }
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.age += dt;
      c.model.root.rotation.x = THREE.MathUtils.damp(c.model.root.rotation.x, -Math.PI / 2, 8, dt);
      c.model.root.position.y = -Math.max(0, c.age - 2) * 0.8;
      if (c.age > 3) {
        this.scene.remove(c.model.root);
        c.model.root.position.y = 0;
        if (!this.pool.has(c.model.type)) this.pool.set(c.model.type, []);
        this.pool.get(c.model.type).push(c.model);
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
      model.root.position.lerp(
        new THREE.Vector3(p.x, p.downed ? 0.2 : p.y, p.z),
        Math.min(1, dt * 15),
      );
      model.root.rotation.y = p.yaw;
      model.root.rotation.z = p.downed ? Math.PI / 2 : 0;
      const phase = time * 10;
      model.legs[0].rotation.x = Math.sin(phase) * Math.min(0.5, Math.hypot(p.vx, p.vz) * 0.1);
      model.legs[1].rotation.x = -model.legs[0].rotation.x;
      model.arms.forEach((a) => (a.rotation.x = -1.4));
    }
    for (const [id, model] of this.peers)
      if (!peers.has(id)) {
        this.scene.remove(model.root);
        this.peers.delete(id);
        model.materials.forEach((m) => m.dispose());
      }
  }
  reset() {
    for (const model of [
      ...this.entities.values(),
      ...this.corpses.map((c) => c.model),
      ...this.peers.values(),
      ...[...this.pool.values()].flat(),
    ]) {
      this.scene.remove(model.root);
      model.materials.forEach((m) => m.dispose());
    }
    this.entities.clear();
    this.corpses = [];
    this.peers.clear();
    this.pool.clear();
  }
}
