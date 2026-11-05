import * as THREE from 'three';
import { terrainHeight } from '../../shared/Forest.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.tracers = [];
    this.grenades = [];
    this.rings = [];
    this.hazardVisuals = new Map();
    this.cursor = 0;
    const geo = new THREE.SphereGeometry(1, 5, 4);
    for (let i = 0; i < 160; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(geo, material);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, life: 0, v: new THREE.Vector3() });
    }
    for (let i = 0; i < 24; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xffe6b1, transparent: true, opacity: 0.7 }),
      );
      line.visible = false;
      scene.add(line);
      this.tracers.push({ line, life: 0 });
    }
    this.tracerIndex = 0;
  }
  burst(point, color, count = 7, force = 2) {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor++ % this.pool.length];
      p.mesh.position.set(point.x, point.y, point.z);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.scale.setScalar(0.018 + Math.random() * 0.035);
      p.mesh.visible = true;
      p.life = 0.3 + Math.random() * 0.3;
      p.v.set((Math.random() - 0.5) * force, Math.random() * force, (Math.random() - 0.5) * force);
    }
  }
  shot(event) {
    for (const impact of event.impacts) {
      this.burst(
        impact,
        impact.material === 'blood' ? 0x813823 : impact.material === 'metal' ? 0xffd891 : 0xa4a89b,
        impact.material === 'blood' ? 9 : 5,
      );
      const t = this.tracers[this.tracerIndex++ % this.tracers.length];
      const a = t.line.geometry.attributes.position;
      a.setXYZ(0, event.origin.x + 0.12, event.origin.y - 0.14, event.origin.z);
      a.setXYZ(1, impact.x, impact.y, impact.z);
      a.needsUpdate = true;
      t.line.geometry.computeBoundingSphere();
      t.line.visible = true;
      t.life = 0.04;
    }
  }
  explosion(e) {
    this.burst({ x: e.x, y: 0.5, z: e.z }, 0xffb46a, 32, 9);
    const light = new THREE.PointLight(0xffa359, 80, 12);
    light.position.set(e.x, 1, e.z);
    this.scene.add(light);
    this.rings.push({ light, life: 0.4 });
  }
  grenade(e, time) {
    const mesh = new THREE.Mesh(
      e.type === 'molotov'
        ? new THREE.CylinderGeometry(0.045, 0.065, 0.25, 8)
        : new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: e.type === 'molotov' ? 0x6d4e25 : 0x45543c }),
    );
    this.scene.add(mesh);
    this.grenades.push({
      mesh,
      origin: e.origin,
      x: e.x,
      z: e.z,
      start: time,
      end: time + (e.duration || 1.6),
    });
  }
  reset() {
    for (const visual of this.hazardVisuals.values()) this.disposeHazard(visual);
    this.hazardVisuals.clear();
    for (const p of this.pool) {
      p.life = 0;
      p.mesh.visible = false;
    }
    for (const t of this.tracers) {
      t.life = 0;
      t.line.visible = false;
    }
    for (const r of this.rings) this.scene.remove(r.light);
    for (const g of this.grenades) {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    }
    this.rings = [];
    this.grenades = [];
  }
  disposeHazard(visual) {
    visual.group.removeFromParent();
    const geometries = new Set(),
      materials = new Set();
    visual.group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) materials.add(o.material);
    });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  }
  syncHazards(state, dt) {
    const active = new Set();
    for (const item of [...(state.projectiles || []), ...(state.hazards || [])]) {
      active.add(item.id);
      let visual = this.hazardVisuals.get(item.id);
      if (!visual) {
        const group = new THREE.Group(),
          projectile = item.vx !== undefined;
        const material = new THREE.MeshStandardMaterial({
          color: item.type === 'fire' ? 0xffb34b : 0x9db452,
          emissive: item.type === 'fire' ? 0xcc4d09 : 0x405e17,
          emissiveIntensity: 0.7,
          roughness: 0.3,
          transparent: true,
          opacity: projectile ? 0.95 : 0.4,
          depthWrite: false,
        });
        if (projectile) group.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 9, 7), material));
        else {
          const pool = new THREE.Mesh(new THREE.CircleGeometry(item.radius, 28), material);
          pool.rotation.x = -Math.PI / 2;
          pool.position.y = 0.033;
          group.add(pool);
          if (item.type === 'fire')
            for (let i = 0; i < 12; i++) {
              const flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.8, 5), material);
              flame.position.set(
                Math.sin(i * 2.4) * item.radius * 0.7,
                0.4,
                Math.cos(i * 2.4) * item.radius * 0.7,
              );
              group.add(flame);
            }
          if (item.type === 'gas')
            for (let i = 0; i < 3; i++) {
              const cloud = new THREE.Mesh(
                new THREE.SphereGeometry(item.radius * 0.55, 10, 7),
                material,
              );
              cloud.position.set(
                Math.sin(i * 2.4) * item.radius * 0.3,
                0.45 + i * 0.15,
                Math.cos(i * 2.4) * item.radius * 0.3,
              );
              cloud.scale.y = 0.65;
              group.add(cloud);
            }
        }
        group.position.set(
          item.x,
          (state.forest ? terrainHeight(state.forest.seed, item.x, item.z) : 0) +
            (projectile ? item.y : 0),
          item.z,
        );
        this.scene.add(group);
        visual = { group, material, projectile };
        this.hazardVisuals.set(item.id, visual);
      }
      visual.group.position.x = THREE.MathUtils.damp(visual.group.position.x, item.x, 30, dt);
      visual.group.position.z = THREE.MathUtils.damp(visual.group.position.z, item.z, 30, dt);
      if (!visual.projectile) {
        visual.material.opacity =
          (item.type === 'gas' ? 0.22 : 0.48) * Math.min(1, Math.max(0, item.end - state.time));
        visual.group.rotation.y = Math.sin(state.time + item.start) * 0.08;
        if (item.type === 'fire')
          visual.group.children.forEach((mesh, i) => {
            if (i) mesh.scale.y = 0.75 + Math.sin(state.time * 11 + i) * 0.3;
          });
      }
    }
    for (const [id, visual] of this.hazardVisuals)
      if (!active.has(id)) {
        this.disposeHazard(visual);
        this.hazardVisuals.delete(id);
      }
  }
  update(dt, time, state = null) {
    if (state) this.syncHazards(state, dt);
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.mesh.visible = p.life > 0;
      p.mesh.position.addScaledVector(p.v, dt);
      p.v.y -= 7 * dt;
      p.mesh.material.opacity = Math.min(1, p.life * 3);
      if (p.mesh.position.y < 0.025) {
        p.mesh.position.y = 0.025;
        p.v.multiplyScalar(0.7);
        p.v.y = Math.abs(p.v.y) * 0.3;
      }
    }
    for (const t of this.tracers) {
      t.life -= dt;
      t.line.visible = t.life > 0;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.light.intensity *= Math.exp(-10 * dt);
      if (r.life <= 0) {
        this.scene.remove(r.light);
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i],
        t = Math.min(1, ((state?.time ?? time) - g.start) / (g.end - g.start));
      g.mesh.position.set(
        THREE.MathUtils.lerp(g.origin.x, g.x, t),
        Math.max(0.1, g.origin.y * (1 - t) + Math.sin(t * Math.PI) * 2.3),
        THREE.MathUtils.lerp(g.origin.z, g.z, t),
      );
      if (t >= 1) {
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.grenades.splice(i, 1);
      }
    }
  }
}
