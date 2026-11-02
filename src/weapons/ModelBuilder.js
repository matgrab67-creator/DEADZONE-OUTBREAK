import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random } from '../../shared/config.js';

function grainTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = Math.floor(110 + random(i + 42) * 55);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

/** Small, original, code-native weapon meshes. Dimensions are in viewmodel metres. */
export class ModelBuilder {
  constructor(id, upgraded) {
    this.root = new THREE.Group();
    this.root.name = id;
    this.texture = grainTexture();
    const standard = (color, metalness, roughness, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 0.8, ...extra });
    this.m = {
      steel: standard(0x30383d, 0.85, 0.34),
      slide: standard(upgraded ? 0x6c7160 : 0x68737a, 0.9, 0.29),
      edge: standard(0x969fa1, 0.92, 0.3),
      dark: standard(0x161c20, 0.65, 0.42),
      polymer: standard(0x282d2c, 0.08, 0.85, { bumpMap: this.texture, bumpScale: 0.0006 }),
      tan: standard(0x82745a, 0.14, 0.72, { bumpMap: this.texture, bumpScale: 0.0004 }),
      wood: standard(0x68422e, 0.05, 0.57, { bumpMap: this.texture, bumpScale: 0.0005 }),
      rubber: standard(0x111816, 0, 0.96),
      glove: standard(0x3c4437, 0, 0.92, { bumpMap: this.texture, bumpScale: 0.0004 }),
      glovePad: standard(0x242d28, 0, 0.84),
      sleeve: standard(0x6a7057, 0, 0.98),
      brass: standard(0xa38b4e, 0.85, 0.3),
      bore: new THREE.MeshBasicMaterial({ color: 0x030606, side: THREE.DoubleSide }),
      sight: standard(0xc1d9af, 0.1, 0.45, { emissive: 0x799b59, emissiveIntensity: 0.45 }),
      accent: standard(upgraded ? 0x7dd6b1 : 0xaaa58a, 0.6, 0.45, { emissive: upgraded ? 0x2f8865 : 0x000000, emissiveIntensity: 0.65 }),
      lens: new THREE.MeshPhysicalMaterial({ color: 0x668a92, metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 }),
    };
    this.parts = {};
  }
  assembly(name, parent = this.root) {
    const group = new THREE.Group(); group.name = name; parent.add(group); this.parts[name] = group; return group;
  }
  mesh(geometry, material, x, y, z, parent = this.root, rotation) {
    const mesh = new THREE.Mesh(geometry, typeof material === 'string' ? this.m[material] : material);
    mesh.position.set(x, y, z);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }
  box(x, y, z, w, h, d, mat = 'steel', parent = this.root, radius = 0.002, rotation) {
    return this.mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)), mat, x, y, z, parent, rotation);
  }
  cylinder(x, y, z, radius, length, mat = 'steel', parent = this.root, axis = 'z', endRadius = radius, open = false) {
    const rotation = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'y' ? [0, 0, 0] : [Math.PI / 2, 0, 0];
    return this.mesh(new THREE.CylinderGeometry(radius, endRadius, length, 20, 1, open), mat, x, y, z, parent, rotation);
  }
  sphere(x, y, z, rx, ry, rz, mat, parent = this.root) {
    const mesh = this.mesh(new THREE.SphereGeometry(1, 12, 8), mat, x, y, z, parent);
    mesh.scale.set(rx, ry, rz); return mesh;
  }
  profile(points, width, mat = 'steel', parent = this.root, bevel = 0.0015) {
    const shape = new THREE.Shape();
    points.forEach(([z, y], i) => i ? shape.lineTo(z, y) : shape.moveTo(z, y));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelSegments: 1, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 8 });
    geo.translate(0, 0, -width / 2); geo.rotateY(-Math.PI / 2);
    return this.mesh(geo, mat, 0, 0, 0, parent);
  }
  tube(x, y, z, radius, length, parent = this.root, mat = 'steel') {
    this.cylinder(x, y, z, radius, length, mat, parent, 'z', radius, true);
    this.cylinder(x, y, z - length / 2 + 0.007, radius * 0.58, 0.014, 'bore', parent, 'z', radius * 0.58, true);
    this.mesh(new THREE.RingGeometry(radius * 0.58, radius, 20), 'edge', x, y, z - length / 2 - 0.0005, parent, [0, Math.PI, 0]);
    this.mesh(new THREE.CircleGeometry(radius * 0.58, 16), 'bore', x, y, z - length / 2 + 0.018, parent, [0, Math.PI, 0]);
  }
  screw(x, y, z, side = -1, parent = this.root) {
    this.cylinder(x, y, z, 0.0032, 0.002, 'edge', parent, 'x');
    this.box(x + side * 0.0013, y, z, 0.0005, 0.001, 0.004, 'dark', parent, 0.0002, [0.5, 0, 0]);
  }
  rail(z, y, length, width = 0.032, parent = this.root) {
    this.box(0, y, z, width * 0.7, 0.007, length, 'dark', parent);
    const count = Math.floor(length / 0.012);
    for (let i = 0; i < count; i++) this.box(0, y + 0.006, z - length / 2 + 0.007 + i * 0.012, width, 0.005, 0.006, 'steel', parent, 0.0007);
  }
  triggerGuard(y = -0.06, z = 0.003, parent = this.root) {
    // Hollow guard, with a separately shaped trigger inside it.
    const points = [[z - 0.039, y + 0.018], [z + 0.026, y + 0.018], [z + 0.031, y - 0.013], [z + 0.02, y - 0.021], [z - 0.025, y - 0.021], [z - 0.039, y - 0.009]];
    const shape = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
    const hole = new THREE.Path(points.map(([a, b]) => new THREE.Vector2(z + (a-z)*0.78, y + (b-y)*0.68)).reverse());
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: true, bevelSize: 0.001, bevelThickness: 0.001, bevelSegments: 1, steps: 1 });
    geo.translate(0, 0, -0.0075); geo.rotateY(-Math.PI / 2); this.mesh(geo, 'polymer', 0, 0, 0, parent);
    this.profile([[z + 0.005, y + 0.02], [z + 0.003, y + 0.003], [z - 0.004, y - 0.008], [z - 0.008, y - 0.008], [z - 0.002, y + 0.006], [z - 0.002, y + 0.02]], 0.007, 'steel', parent, 0.0005);
  }
  ironSights(rearZ, frontZ, height, parent = this.root, aperture = false) {
    this.box(0, height - 0.011, rearZ, 0.031, 0.01, 0.015, 'dark', parent);
    if (aperture) {
      this.mesh(new THREE.TorusGeometry(0.007, 0.002, 6, 16), 'dark', 0, height, rearZ, parent);
    } else {
      for (const side of [-1, 1]) {
        this.box(side * 0.01, height - 0.002, rearZ, 0.008, 0.012, 0.014, 'dark', parent);
        this.sphere(side * 0.01, height, rearZ + 0.0071, 0.0015, 0.0015, 0.0007, 'sight', parent);
      }
    }
    this.box(0, height - 0.007, frontZ, 0.006, 0.018, 0.012, 'dark', parent);
    this.sphere(0, height, frontZ + 0.0065, 0.0017, 0.0017, 0.0007, 'sight', parent);
  }
  marking(text, sub, x, y, z, width, height, side = -1, parent = this.root) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#c2c7bc'; ctx.font = 'bold 49px monospace'; ctx.fillText(text, 10, 56);
    ctx.fillStyle = '#8b958a'; ctx.font = '23px monospace'; ctx.fillText(sub, 10, 100);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.8, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -1 });
    return this.mesh(new THREE.PlaneGeometry(width, height), mat, x, y, z, parent, [0, side * Math.PI / 2, 0]);
  }
  hand(name, x, y, z, support = false, parent = this.root) {
    const group = this.assembly(name, parent); group.position.set(x, y, z);
    this.sphere(0, 0, 0, 0.031, 0.045, 0.023, 'glove', group);
    this.box(support ? -0.021 : 0.023, 0.01, 0.004, 0.012, 0.035, 0.032, 'glovePad', group, 0.004);
    for (let i = 0; i < 4; i++) {
      const finger = this.box(-0.003, 0.025 - i * 0.015, -0.022, 0.048, 0.012, 0.015, 'glove', group, 0.004);
      finger.rotation.y = -0.15;
      this.sphere(support ? -0.024 : 0.024, 0.025 - i * 0.015, -0.017, 0.009, 0.006, 0.009, 'glovePad', group);
    }
    this.box(support ? 0.021 : -0.023, 0.024, 0.005, 0.016, 0.035, 0.018, 'glove', group, 0.006, [0.2, 0, support ? -0.35 : 0.35]);
    this.cylinder(0.005, -0.058, 0.015, 0.028, 0.035, 'glovePad', group, 'y');
    const sleeve = this.cylinder(support ? -0.05 : 0.055, -0.10, 0.095, 0.034, 0.22, 'sleeve', group, 'y', 0.047);
    sleeve.rotation.set(-0.98, 0, support ? -0.4 : 0.4);
    return group;
  }
  muzzle(z, y = 0.014) {
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, y, z); muzzle.name = 'muzzle'; this.root.add(muzzle); this.parts.muzzle = muzzle;
  }
  finish(extra) {
    // Keep moving parts separate, merge rigid details by material within each assembly.
    const groups = []; this.root.traverse(o => { if (o.isGroup) groups.push(o); });
    for (const group of groups) {
      const buckets = new Map();
      for (const child of [...group.children]) {
        if (!child.isMesh || child.material.transparent) continue;
        child.updateMatrix();
        const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
        geo.applyMatrix4(child.matrix);
        if (!buckets.has(child.material)) buckets.set(child.material, []);
        buckets.get(child.material).push(geo); group.remove(child); child.geometry.dispose();
      }
      for (const [mat, geometries] of buckets) {
        const mesh = new THREE.Mesh(mergeGeometries(geometries), mat); group.add(mesh);
        geometries.forEach(g => g.dispose());
      }
    }
    return { root: this.root, parts: this.parts, materials: Object.values(this.m), texture: this.texture, ...extra };
  }
}

export function disposeWeaponModel(model) {
  if (!model) return;
  const geometries = new Set(), materials = new Set(model.materials), textures = new Set([model.texture]);
  model.root.traverse(o => { if (o.isMesh) { geometries.add(o.geometry); materials.add(o.material); } });
  materials.forEach(m => { if (m.map) textures.add(m.map); if (m.bumpMap) textures.add(m.bumpMap); m.dispose(); });
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); model.root.removeFromParent();
}
