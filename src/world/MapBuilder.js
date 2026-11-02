import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMaterials, labelTexture } from '../rendering/Materials.js';
import { SECTORS, WALLS, PROPS, DOORS, STATIONS, COLLECTIBLES, doorBox } from '../../shared/map.js';
import { random } from '../../shared/config.js';

export class MapBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mat = makeMaterials();
    this.batches = new Map();
    this.doors = new Map();
    this.lights = [];
    this.collectibles = new Map();
    this.stationLights = [];
    this.build();
  }
  mesh(geo, mat, x, y, z, rotation = null, batch = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rotation) m.rotation.set(...rotation);
    m.castShadow = true;
    m.receiveShadow = true;
    if (batch) {
      m.updateMatrix();
      geo.applyMatrix4(m.matrix);
      if (!this.batches.has(mat)) this.batches.set(mat, []);
      this.batches.get(mat).push(geo);
    } else this.group.add(m);
    return m;
  }
  box(x, y, z, w, h, d, mat = this.mat.steel, rotation = null, batch = true) {
    return this.mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rotation, batch);
  }
  cylinder(x, y, z, r, len, mat = this.mat.steel, rot = null) {
    return this.mesh(new THREE.CylinderGeometry(r, r, len, 10), mat, x, y, z, rot);
  }
  sign(text, sub, x, y, z, w = 3, h = 0.75, rotation = 0, color = '#c8d6b3') {
    const mat = new THREE.MeshBasicMaterial({
      map: labelTexture(text, sub, color),
      side: THREE.DoubleSide,
    });
    return this.mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, [0, rotation, 0], false);
  }
  lamp(x, y, z, color = 0xb8dbb5) {
    this.box(x, y, z, 1.4, 0.08, 0.22, this.mat.glow);
    const light = new THREE.PointLight(color, 14, 15, 2);
    light.position.set(x, y - 0.2, z);
    this.scene.add(light);
    this.lights.push({ light, base: 14, seed: x + z });
  }
  build() {
    const m = this.mat;
    // Repeated floor plates are instanced: the whole facility costs one draw call.
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1.98, 0.12, 1.98), m.floor, 540);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let x = -26; x < 27; x += 2)
      for (let z = -19; z < 20; z += 2) {
        matrix.makeTranslation(x, -0.06, z);
        tiles.setMatrixAt(index++, matrix);
      }
    tiles.receiveShadow = true;
    this.group.add(tiles);
    for (const wall of WALLS) {
      this.box(wall.x, wall.y, wall.z, wall.w, wall.h, wall.d, m.wall);
      if (wall.h > 4) {
        this.box(wall.x, 0.35, wall.z, wall.w + 0.03, 0.7, wall.d + 0.03, m.dark);
        this.box(wall.x, 2.9, wall.z, wall.w + 0.04, 0.09, wall.d + 0.04, m.amber);
      }
    }
    for (const s of SECTORS) {
      if (s.id !== 'courtyard') this.box(s.x, 5.95, s.z, 17.6, 0.18, 19.6, m.dark);
      for (const dx of [-7.5, 7.5]) {
        for (const dz of [-8, 0, 8]) this.box(s.x + dx, 2.8, s.z + dz, 0.32, 5.6, 0.38, m.steel);
        this.cylinder(s.x + dx, 4.8, s.z, 0.12, 19, m.steel, [Math.PI / 2, 0, 0]);
        this.cylinder(s.x + dx + 0.35, 4.8, s.z, 0.07, 19, m.red, [Math.PI / 2, 0, 0]);
      }
      for (const dz of [-6, 1, 8]) {
        this.box(s.x, 5.2, s.z + dz, 16, 0.2, 0.22, m.steel);
        this.box(s.x, 5.3, s.z + dz, 16, 0.05, 0.6, m.dark);
      }
      this.lamp(s.x - 4, 4.4, s.z - 4, s.tint);
      this.lamp(s.x + 4, 4.4, s.z + 5, s.tint);
      this.sign(
        `${s.number} / ${s.name}`,
        'BLACKSITE–13   //   RESTRICTED ACCESS',
        s.x,
        3.6,
        s.z - 9.68,
        6,
        1.1,
        0,
      );
      this.sign(
        'CAUTION',
        'BIOLOGICAL HAZARD',
        s.x - 7,
        1.9,
        s.z + 9.64,
        1.5,
        0.65,
        Math.PI,
        '#e1bc65',
      );
      // Drain channels and painted directional markings.
      this.box(s.x - 6, 0.008, s.z, 0.15, 0.015, 18, m.dark);
      this.box(s.x + 6, 0.008, s.z, 0.15, 0.015, 18, m.dark);
      for (let i = 0; i < 7; i++)
        this.box(s.x + 5.4, 0.018, s.z - 6 + i * 1.7, 0.05, 0.02, 0.8, m.amber);
      for (let i = 0; i < 7; i++) {
        const x = s.x + (random(i + 17 * s.x) - 0.5) * 13,
          z = s.z + (random(i + 23 * s.z) - 0.5) * 15;
        this.box(
          x,
          0.03,
          z,
          0.15 + random(i) * 0.5,
          0.04,
          0.18 + random(i + 33) * 0.3,
          i % 3 ? m.wall : m.dark,
          [0, random(i + 5) * 6, 0],
        );
      }
      const alarm = new THREE.PointLight(0xe75432, 5, 7);
      alarm.position.set(s.x - 7, 2.8, s.z - 8);
      this.scene.add(alarm);
      this.lights.push({ light: alarm, base: 5, seed: s.x * 3, alarm: true });
      this.cylinder(s.x - 7, 2.8, s.z - 8, 0.12, 0.25, m.redGlow);
    }
    for (const p of PROPS) {
      const mat = m[p.kind] || m.steel;
      if (p.kind === 'reactor') {
        this.cylinder(p.x, 1.7, p.z, 1.35, 3.4, m.dark);
        this.cylinder(p.x, 2, p.z, 0.85, 3.8, m.cyan);
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          this.box(
            p.x + Math.cos(angle) * 1.4,
            2,
            p.z + Math.sin(angle) * 1.4,
            0.18,
            4,
            0.18,
            m.steel,
          );
        }
        for (const y of [0.4, 1.2, 2.8, 3.6]) this.cylinder(p.x, y, p.z, 1.6, 0.16, m.steel);
        const glow = new THREE.PointLight(0x78f2bf, 35, 16);
        glow.position.set(p.x, 3, p.z);
        this.scene.add(glow);
        this.lights.push({ light: glow, base: 35, seed: 0 });
      } else if (p.kind === 'pipes') {
        for (let i = 0; i < 3; i++)
          this.cylinder(p.x + (i - 1) * 0.8, 1.5, p.z, 0.37, p.d, m.steel, [Math.PI / 2, 0, 0]);
        this.box(p.x, 0.4, p.z, p.w, 0.8, p.d, m.dark);
      } else {
        this.box(p.x, p.y, p.z, p.w, p.h, p.d, mat);
        this.box(p.x, p.y + p.h / 2 + 0.035, p.z, p.w + 0.08, 0.07, p.d + 0.08, m.steel);
        if (p.kind === 'container') {
          for (let i = -1.8; i <= 1.8; i += 0.3)
            this.box(p.x + i, p.y, p.z + p.d / 2 + 0.025, 0.045, p.h, 0.06, m.steel);
          this.sign(
            'B–13',
            'MILITARY RESEARCH  //  KEEP SEALED',
            p.x,
            p.y,
            p.z + p.d / 2 + 0.07,
            2,
            0.6,
          );
          this.box(p.x, p.h + 0.12, p.z, 4.1, 0.15, 3.1, m.dark);
        }
        if (p.kind === 'crate') {
          for (const dx of [-p.w * 0.35, p.w * 0.35])
            this.box(p.x + dx, p.y, p.z, 0.1, p.h + 0.08, p.d + 0.08, m.dark);
        }
        if (p.kind === 'lab' || p.kind === 'desk') {
          for (let i = 0; i < 2; i++) {
            const x = p.x - p.w / 3 + i * p.w * 0.6;
            this.box(x, p.h + 0.35, p.z, 0.7, 0.5, 0.09, m.dark, [0, 0, 0]);
            this.sign(
              i ? 'CONTAINMENT LOST' : 'SYSTEM OFFLINE',
              '// SIGNAL INTERRUPTED',
              x,
              p.h + 0.35,
              p.z + 0.052,
              0.64,
              0.4,
              0,
              '#7fc7b3',
            );
            this.box(x, p.h + 0.05, p.z + 0.4, 0.65, 0.04, 0.22, m.dark);
          }
        }
        if (p.kind === 'server') {
          for (let i = 0; i < 8; i++) {
            this.box(
              p.x,
              p.y - p.h / 2 + 0.2 + i * 0.26,
              p.z + p.d / 2 + 0.01,
              p.w * 0.9,
              0.12,
              0.04,
              m.dark,
            );
            this.box(
              p.x - 0.5,
              p.y - p.h / 2 + 0.2 + i * 0.26,
              p.z + p.d / 2 + 0.04,
              0.06,
              0.04,
              0.04,
              i % 3 ? m.glow : m.redGlow,
            );
          }
        }
      }
    }
    for (const d of DOORS) {
      const b = doorBox(d);
      const mesh = this.box(b.x, b.y, b.z, b.w, b.h, b.d, m.dark, null, false);
      this.doors.set(d.id, { mesh, open: false, start: b.y });
      if (d.axis === 'x') {
        for (const dz of [-1.9, 1.9]) this.box(d.x, 1.8, d.z + dz, 0.7, 3.6, 0.18, m.steel);
        this.box(d.x, 3.55, d.z, 0.7, 0.16, 4, m.amber);
        this.sign(
          'LOCKDOWN',
          `${d.price} PTS / ACCESS CONTROL`,
          d.x - 0.26,
          2,
          d.z,
          2.7,
          0.6,
          -Math.PI / 2,
          '#e7b15f',
        );
      } else {
        for (const dx of [-1.9, 1.9]) this.box(d.x + dx, 1.8, d.z, 0.18, 3.6, 0.7, m.steel);
        this.box(d.x, 3.55, d.z, 4, 0.16, 0.7, m.amber);
        this.sign(
          'LOCKDOWN',
          `${d.price} PTS / ACCESS CONTROL`,
          d.x,
          2,
          d.z + 0.26,
          2.7,
          0.6,
          0,
          '#e7b15f',
        );
      }
    }
    for (const s of STATIONS) {
      const perk = s.type === 'perk',
        up = s.type === 'upgrade',
        wide = s.type === 'weapon' || s.type === 'mystery';
      const width = wide ? 1.7 : 1;
      this.box(
        s.x,
        perk ? 1 : 0.55,
        s.z,
        width,
        perk ? 2 : 1.1,
        0.65,
        perk ? m.red : up ? m.lab : m.dark,
      );
      this.box(
        s.x,
        perk ? 1.85 : 1.02,
        s.z + 0.34,
        width * 0.85,
        0.08,
        0.06,
        up ? m.cyan : perk ? m.redGlow : m.glow,
      );
      this.sign(
        s.name,
        `${s.price ? `${s.price} PTS` : '+25 PTS'}  /  [ E ]`,
        s.x,
        perk ? 1.4 : 0.68,
        s.z + 0.333,
        width * 0.9,
        perk ? 0.65 : 0.48,
        0,
        perk ? '#e0b29b' : '#c9dfaa',
      );
      if (wide) {
        this.box(s.x, 1.2, s.z, 1.1, 0.12, 0.18, m.steel);
        this.box(s.x + 0.15, 1.08, s.z, 0.15, 0.35, 0.2, m.steel, [0, 0, 0.2]);
        this.cylinder(s.x - 0.55, 1.2, s.z, 0.04, 0.4, m.steel, [0, 0, Math.PI / 2]);
      }
      if (s.type === 'repair') {
        for (let i = 0; i < 4; i++)
          this.box(s.x, 0.5 + i * 0.4, s.z - 0.2, 2, 0.17, 0.1, m.crate, [
            0,
            0,
            i % 2 ? 0.1 : -0.1,
          ]);
      }
    }
    for (const c of COLLECTIBLES) {
      const mesh = this.box(c.x, 0.2, c.z, 0.3, 0.12, 0.4, m.cyan, null, false);
      this.collectibles.set(c.id, mesh);
    }
    // Courtyard floodlight, fencing, overhead cables and a damaged containment warning.
    this.sign(
      'BLACKSITE–13',
      'DEPARTMENT OF ADVANCED BIOLOGICAL RESEARCH',
      -18,
      4.55,
      0.29,
      8,
      1.15,
    );
    this.sign(
      'NO ONE LEAVES',
      'QUARANTINE PROTOCOL ACTIVE',
      -26.67,
      1.7,
      10,
      3,
      0.8,
      Math.PI / 2,
      '#c87961',
    );
    for (let i = 0; i < 14; i++) {
      const z = 2 + i * 1.2;
      this.box(-26.4, 4.5, z, 0.05, 2.5, 0.05, m.steel);
    }
    for (let i = 0; i < 3; i++) this.box(-26.4, 3.4 + i, -0 + 10, 0.05, 0.035, 18, m.steel);
    for (let i = 0; i < 15; i++) {
      const angle = random(i * 5) * Math.PI * 2,
        r = random(i + 87) * 1.4;
      this.mesh(
        new THREE.CircleGeometry(0.2 + random(i + 7) * 0.45, 9),
        m.blood,
        -22 + Math.cos(angle) * r,
        0.014,
        12 + Math.sin(angle) * r,
        [-Math.PI / 2, 0, angle],
      );
    }
    this.box(-13.5, 0.18, 6, 1.6, 0.3, 0.55, m.dark, [0, 0.5, 0]);
    this.mesh(new THREE.SphereGeometry(0.23, 10, 8), m.crate, -14.35, 0.22, 5.55);
    // Merge immutable detail geometry by material for low draw-call overhead.
    for (const [mat, geometries] of this.batches) {
      const merged = mergeGeometries(geometries);
      if (merged) {
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
      }
      for (const geo of geometries) geo.dispose();
    }
    this.batches.clear();
    const positions = new Float32Array(450);
    for (let i = 0; i < 450; i += 3) {
      positions[i] = (random(i) - 0.5) * 52;
      positions[i + 1] = random(i + 1) * 5;
      positions[i + 2] = (random(i + 2) - 0.5) * 38;
    }
    const dust = new THREE.BufferGeometry();
    dust.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(
      dust,
      new THREE.PointsMaterial({
        color: 0xa4b7a4,
        size: 0.025,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.scene.add(this.dust);
  }
  update(time, dt, state) {
    for (const [id, door] of this.doors) {
      const open = state?.openDoors.includes(id) || false;
      door.mesh.position.y = THREE.MathUtils.damp(
        door.mesh.position.y,
        open ? 5.3 : door.start,
        5,
        dt,
      );
      door.open = open;
    }
    for (const item of this.lights)
      item.light.intensity =
        item.base *
        (item.alarm
          ? 0.65 + Math.sin(time * 2 + item.seed) * 0.35
          : Math.sin(time * 17 + item.seed) > 0.99
            ? 0.35
            : 1);
    for (const [id, mesh] of this.collectibles) {
      mesh.visible = !state?.collected.includes(id);
      mesh.rotation.y = time * 0.5;
      mesh.position.y = 0.35 + Math.sin(time * 2) * 0.08;
    }
    this.dust.rotation.y = Math.sin(time * 0.03) * 0.02;
  }
}
