import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZOMBIES, random } from '../../shared/config.js';

const geometry = {
  sphere: new THREE.SphereGeometry(1, 12, 10),
  capsule: new THREE.CapsuleGeometry(1, 1, 3, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  helmet: new THREE.SphereGeometry(1, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.64),
};
// Taper the lower skull and flatten the facial plane so the face is an
// anatomical volume instead of a collection of round balls.
geometry.head = geometry.sphere.clone();
const headVertices = geometry.head.attributes.position;
for (let i = 0; i < headVertices.count; i++) {
  const x = headVertices.getX(i),
    y = headVertices.getY(i),
    z = headVertices.getZ(i);
  const jawWidth = 0.76 + 0.24 * THREE.MathUtils.smoothstep(y, -0.6, 0.2);
  headVertices.setXYZ(i, x * jawWidth, y, z < -0.45 ? -0.45 + (z + 0.45) * 0.64 : z);
}
geometry.head.computeVertexNormals();
function skinTexture() {
  const data = new Uint8Array(128 * 128 * 4);
  for (let i = 0; i < 128 * 128; i++) {
    const x = i % 128,
      y = Math.floor(i / 128),
      n = random(i + 613);
    const v = Math.floor(210 + Math.sin(x * 0.12) * Math.sin(y * 0.19) * 8 + n * 7);
    data.set([v, v, v, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, 128, 128);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
const detailTexture = skinTexture();
const skinMap = detailTexture.clone();
skinMap.colorSpace = THREE.SRGBColorSpace;
skinMap.needsUpdate = true;

function mergeBone(group) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh) continue;
    child.updateMatrix();
    const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geo.applyMatrix4(child.matrix);
    if (!buckets.has(child.material)) buckets.set(child.material, []);
    buckets.get(child.material).push(geo);
    group.remove(child);
  }
  for (const [material, geos] of buckets) {
    group.add(new THREE.Mesh(mergeGeometries(geos), material));
    geos.forEach((g) => g.dispose());
  }
}

export function createHumanoid(type = 'normal', teammate = false) {
  const crawler = type === 'crawler',
    boss = type === 'boss',
    armored = type === 'armored' || teammate;
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const standard = (color, roughness = 0.85, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const skin = standard(
    teammate ? 0xb4a28b : boss ? 0x8c8174 : type === 'runner' ? 0xa19585 : ZOMBIES[type].color,
  );
  skin.bumpMap = detailTexture;
  skin.bumpScale = 0.002;
  skin.map = skinMap;
  const cloth = standard(
    teammate ? 0x566345 : type === 'runner' ? 0x5c3a32 : type === 'exploder' ? 0x58564a : 0x3c4a40,
  );
  cloth.bumpMap = detailTexture;
  cloth.bumpScale = 0.002;
  const dark = standard(0x1b2422),
    armor = standard(0x3d4947, 0.55, 0.5),
    wound = standard(0x4e3029),
    bone = standard(0xa6aa88);
  const eye = standard(teammate ? 0x87a8a0 : boss ? 0xe9b47f : 0xb7bf8d);
  eye.emissive.setHex(teammate ? 0x29423b : boss ? 0x8c4c1c : 0x647b3a);
  eye.emissiveIntensity = 0.8;
  const sac = standard(0x8c9964, 0.42);
  sac.emissive.setHex(0x46582b);
  sac.emissiveIntensity = 0.4;
  const materials = [skin, cloth, dark, armor, wound, bone, eye, sac];
  const group = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const part = (parent, kind, material, x, y, z, sx, sy, sz, rotation) => {
    const mesh = new THREE.Mesh(geometry[kind], material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent, mat, x, y, z, sx, sy, sz) =>
    part(parent, 'sphere', mat, x, y, z, sx, sy, sz);
  const box = (parent, mat, x, y, z, sx, sy, sz, rotation) =>
    part(parent, 'box', mat, x, y, z, sx, sy, sz, rotation);
  const limb = (parent, mat, x, y, z, r, length, rz = r) =>
    part(parent, 'capsule', mat, x, y, z, r, length / 3, rz);
  const pelvis = group(body, 0, crawler ? 0.32 : 0.84, crawler ? 0.29 : 0.015);
  ball(pelvis, cloth, 0, 0, 0, 0.215, 0.15, 0.15);
  box(pelvis, dark, 0, 0.07, -0.015, 0.43, 0.045, 0.29);
  box(pelvis, armor, 0.015, 0.07, -0.169, 0.065, 0.038, 0.015);
  const chest = group(body, 0, crawler ? 0.43 : 1.17, crawler ? -0.015 : 0);
  ball(chest, skin, 0, 0, 0, boss ? 0.33 : 0.25, crawler ? 0.16 : 0.3, crawler ? 0.33 : 0.17);
  // Torn clothing follows the chest instead of hiding the anatomy in a box.
  ball(chest, cloth, -0.055, 0.022, 0.01, 0.235, crawler ? 0.17 : 0.29, crawler ? 0.31 : 0.171);
  ball(chest, skin, 0.17, -0.045, -0.045, 0.1, 0.19, 0.13);
  box(chest, wound, 0.14, 0.045, -0.17, 0.026, 0.13, 0.008, [0, 0, -0.2]);
  for (let i = 0; i < 4; i++)
    box(chest, cloth, -0.14 + i * 0.085, -0.25 + (i % 2) * 0.027, -0.08, 0.043, 0.08, 0.035, [
      0,
      0,
      (i % 2 ? 1 : -1) * 0.18,
    ]);
  const neck = group(body, 0, crawler ? 0.49 : 1.45, crawler ? -0.3 : -0.008);
  limb(neck, skin, 0, 0, 0, 0.07, 0.16, 0.068);
  const head = group(body, 0, crawler ? 0.595 : 1.605, crawler ? -0.38 : -0.035);
  part(head, 'head', skin, 0, 0, 0, 0.142, 0.183, 0.137);
  ball(head, skin, -0.092, -0.032, -0.086, 0.035, 0.029, 0.031);
  ball(head, skin, 0.092, -0.032, -0.086, 0.035, 0.029, 0.031);
  for (const side of [-1, 1]) {
    ball(head, wound, side * 0.049, 0.019, -0.11, 0.031, 0.02, 0.019);
    ball(head, eye, side * 0.049, 0.018, -0.126, 0.009, 0.007, 0.006);
    ball(head, skin, side * 0.052, 0.047, -0.108, 0.042, 0.013, 0.018);
    ball(head, skin, side * 0.139, -0.014, 0.005, 0.018, 0.034, 0.014);
  }
  ball(head, skin, 0, -0.024, -0.124, 0.017, 0.036, 0.024);
  const jaw = group(head, 0, -0.095, -0.012);
  ball(jaw, skin, 0, -0.014, -0.032, 0.085, 0.039, 0.068);
  ball(jaw, wound, 0, 0.018, -0.093, 0.06, 0.01, 0.012);
  for (let i = 0; i < 6; i++)
    box(jaw, bone, -0.035 + i * 0.014, 0.019, -0.102, 0.008, 0.009 + (i % 2) * 0.003, 0.005);
  box(head, wound, -0.093, 0.084, -0.113, 0.006, 0.068, 0.005, [0, 0, 0.38]);
  for (let i = 0; i < 4; i++)
    box(head, dark, -0.105 + i * 0.006, 0.11 - i * 0.014, -0.116, 0.012, 0.002, 0.003, [0, 0, 0.4]);
  if (!armored) {
    part(head, 'helmet', dark, 0.008, 0.077, 0.03, 0.142, 0.134, 0.12, [0, 0, 0.13]);
    ball(head, skin, 0.056, 0.1, -0.083, 0.061, 0.048, 0.039);
  } else {
    part(head, 'helmet', armor, 0, 0.07, 0.008, 0.172, 0.154, 0.165);
    box(head, dark, 0, 0.005, -0.128, 0.3, 0.014, 0.035);
    for (const side of [-1, 1])
      box(head, dark, side * 0.12, -0.049, -0.012, 0.012, 0.137, 0.015, [0, 0, side * 0.2]);
    ball(head, dark, 0, -0.14, -0.07, 0.09, 0.015, 0.018);
    box(chest, armor, 0, 0.035, -0.174, 0.43, 0.38, 0.064);
    box(chest, dark, 0, 0.035, -0.213, 0.38, 0.31, 0.012);
    for (const side of [-1, 1]) {
      box(chest, cloth, side * 0.11, -0.055, -0.231, 0.095, 0.13, 0.055);
      box(chest, cloth, side * 0.2, 0.1, -0.05, 0.05, 0.36, 0.24, [0, 0, side * 0.13]);
    }
    box(chest, bone, 0.07, 0.13, -0.224, 0.05, 0.016, 0.004);
  }
  const arms = [],
    elbows = [],
    wrists = [],
    legs = [],
    knees = [],
    feet = [];
  for (const side of [-1, 1]) {
    const arm = group(
      body,
      side * (boss ? 0.37 : 0.285),
      crawler ? 0.43 : 1.35,
      crawler ? -0.22 : 0,
    );
    ball(arm, skin, 0, -0.025, 0, 0.105, 0.12, 0.105);
    limb(arm, cloth, 0, -0.135, 0, 0.087, 0.3, 0.09);
    if (armored) ball(arm, armor, side * 0.015, -0.04, 0.002, 0.126, 0.105, 0.12);
    const elbow = group(arm, 0, -0.29, 0);
    ball(elbow, skin, 0, 0, 0, 0.071, 0.075, 0.07);
    limb(elbow, skin, 0, -0.125, -0.013, 0.063, 0.27, 0.067);
    box(elbow, wound, side * 0.037, -0.106, -0.061, 0.024, 0.1, 0.009, [0, 0, side * 0.2]);
    const wrist = group(elbow, 0, -0.272, -0.016);
    ball(wrist, teammate ? dark : skin, 0, -0.035, -0.01, 0.061, 0.073, 0.031);
    for (let finger = 0; finger < 4; finger++) {
      limb(
        wrist,
        teammate ? dark : skin,
        -0.041 + finger * 0.026,
        -0.11,
        -0.018,
        0.011,
        0.1,
        0.012,
      );
      box(wrist, dark, -0.041 + finger * 0.026, -0.158, -0.027, 0.014, 0.017, 0.006);
    }
    limb(wrist, teammate ? dark : skin, side * 0.066, -0.027, -0.024, 0.018, 0.071, 0.019);
    const leg = group(body, side * 0.125, crawler ? 0.3 : 0.78, crawler ? 0.37 : 0.01);
    limb(leg, cloth, 0, -0.17, 0, 0.102, 0.37, 0.106);
    const knee = group(leg, 0, -0.37, 0);
    ball(knee, armored ? armor : skin, 0, 0.015, -0.025, 0.071, 0.062, 0.06);
    limb(knee, cloth, 0, -0.153, 0.008, 0.073, 0.32, 0.078);
    const foot = group(knee, 0, -0.31, -0.043);
    ball(foot, dark, 0, -0.035, -0.035, 0.085, 0.071, 0.14);
    box(foot, dark, 0, -0.075, -0.03, 0.16, 0.034, 0.24);
    if (!teammate) box(knee, wound, side * 0.036, -0.1, -0.069, 0.02, 0.13, 0.012, [0, 0, 0.1]);
    arms.push(arm);
    elbows.push(elbow);
    wrists.push(wrist);
    legs.push(leg);
    knees.push(knee);
    feet.push(foot);
  }
  const sacs = [];
  if (type === 'exploder') {
    ball(chest, skin, 0.015, -0.12, -0.08, 0.31, 0.29, 0.26);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.399;
      const growth = group(
        chest,
        Math.sin(angle) * 0.24,
        -0.1 + Math.cos(angle) * 0.19,
        -0.19 - Math.sin(i) * 0.04,
      );
      ball(growth, sac, 0, 0, 0, 0.073 + (i % 2) * 0.022, 0.09, 0.067);
      sacs.push(growth);
    }
  }
  if (boss) {
    ball(chest, skin, -0.29, 0.08, 0.02, 0.22, 0.24, 0.22);
    ball(arms[0], skin, -0.04, -0.1, 0.01, 0.17, 0.24, 0.15);
    arms[0].scale.set(1.25, 1.13, 1.2);
    box(chest, armor, -0.19, 0.06, -0.17, 0.16, 0.26, 0.1, [0, 0, -0.2]);
    for (let i = 0; i < 4; i++) {
      const growth = group(chest, 0.18 + (i % 2) * 0.07, 0.16 - i * 0.1, -0.13);
      ball(growth, sac, 0, 0, 0, 0.055, 0.07, 0.055);
      sacs.push(growth);
    }
    for (let i = 0; i < 5; i++)
      box(chest, bone, -0.09, 0.16 - i * 0.065, -0.187, 0.06, 0.012, 0.014, [0, 0, -0.25]);
  }
  if (type === 'runner') {
    box(chest, dark, 0, 0.18, 0.015, 0.15, 0.045, 0.29);
    for (const side of [-1, 1])
      box(legs[side < 0 ? 0 : 1], wound, side * 0.05, -0.16, -0.087, 0.045, 0.11, 0.012, [
        0,
        0,
        side * 0.16,
      ]);
  }
  root.scale.setScalar(crawler ? 1 : ZOMBIES[type].height / 1.8);
  const bones = [];
  root.traverse((o) => {
    if (o.isGroup) bones.push(o);
  });
  bones.forEach(mergeBone);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return {
    root,
    body,
    chest,
    pelvis,
    neck,
    head,
    jaw,
    arms,
    elbows,
    wrists,
    legs,
    knees,
    feet,
    sacs,
    type,
    teammate,
    materials,
    walkCycle: 0,
    phase: random(type.length * 61) * Math.PI * 2,
    lastSpeed: 0,
    restHead: head.position.clone(),
    restChest: chest.position.clone(),
    restPelvis: pelvis.position.clone(),
  };
}

export function disposeHumanoid(model) {
  model.root.removeFromParent();
  model.root.traverse((o) => {
    if (o.isMesh) o.geometry.dispose();
  });
  model.materials.forEach((m) => m.dispose());
}
