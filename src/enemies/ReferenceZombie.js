import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZOMBIES, random } from '../../shared/config.js';
import { addInfectedDetails } from './InfectedDetails.js';

// The supplied front / side / rear reference defines this shared, faceted base rig.
function loft(sections, sides = 8, ragged = false) {
  const v = [],
    uv = [],
    idx = [];
  sections.forEach(([y, rx, rz], r) => {
    for (let n = 0; n < sides; n++) {
      const a = (n / sides) * Math.PI * 2;
      v.push(
        Math.sin(a) * rx,
        y + (ragged && r === 0 ? (n % 3 === 0 ? 0.045 : n % 3 === 1 ? -0.035 : 0) : 0),
        Math.cos(a) * rz,
      );
      uv.push(n / sides, r / (sections.length - 1));
      if (r < sections.length - 1) {
        const i = r * sides + n,
          j = r * sides + ((n + 1) % sides);
        idx.push(i, j, i + sides, j, j + sides, i + sides);
      }
    }
  });
  for (const row of [0, sections.length - 1])
    for (let n = 1; n < sides - 1; n++)
      row === 0
        ? idx.push(row * sides, row * sides + n + 1, row * sides + n)
        : idx.push(row * sides, row * sides + n, row * sides + n + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function atlas() {
  const n = 512,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const noise = random(x + y * n + 271),
        seam = x % 128 < 2 || y % 128 < 2;
      const shade = seam ? 184 : 222 + noise * 16;
      data.set([shade, shade * 0.98, shade * 0.94, 255], (y * n + x) * 4);
    }
  const t = new THREE.DataTexture(data, n, n);
  t.needsUpdate = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.name = 'reference-zombie-atlas-512';
  return t;
}
const texture = atlas();
const geometry = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 0),
  capsule: loft(
    [
      [-1.5, 0.68, 0.7],
      [-0.9, 0.95, 0.95],
      [0.5, 1, 1],
      [1.5, 0.68, 0.72],
    ],
    6,
  ),
  finger: loft(
    [
      [-1.5, 0.8, 0.8],
      [1.5, 1, 1],
    ],
    4,
  ),
  head: loft(
    [
      [-1, 0.65, 0.7],
      [0.45, 1, 1],
      [0.9, 0.78, 0.8],
    ],
    8,
  ),
  helmet: new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.65),
  spike: new THREE.ConeGeometry(1, 1, 5),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 6),
  shirt: loft(
    [
      [-0.29, 0.19, 0.125],
      [-0.06, 0.205, 0.13],
      [0.19, 0.25, 0.145],
      [0.27, 0.08, 0.075],
    ],
    6,
    true,
  ),
  sleeve: loft(
    [
      [-0.18, 0.071, 0.085],
      [0, 0.09, 0.095],
      [0.06, 0.075, 0.08],
    ],
    6,
    true,
  ),
  thigh: loft(
    [
      [-0.38, 0.085, 0.09],
      [-0.21, 0.1, 0.1],
      [0.03, 0.105, 0.11],
    ],
    6,
  ),
  shin: loft(
    [
      [-0.25, 0.073, 0.075],
      [-0.12, 0.074, 0.073],
      [0.025, 0.08, 0.08],
    ],
    6,
    true,
  ),
  tatter: loft(
    [
      [-0.5, 0.2, 0.1],
      [0.5, 0.5, 0.1],
    ],
    3,
    true,
  ),
};
function mergeBone(group) {
  const buckets = new Map();
  for (const m of [...group.children])
    if (m.isMesh) {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(
        m.matrix,
      );
      if (!buckets.has(m.material)) buckets.set(m.material, []);
      buckets.get(m.material).push(g);
      group.remove(m);
    }
  for (const [m, gs] of buckets) {
    group.add(new THREE.Mesh(mergeGeometries(gs), m));
    gs.forEach((g) => g.dispose());
  }
}
export function createReferenceZombie(type = 'normal', teammate = false) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const crawler = type === 'crawler';
  const palettes = {
    normal: [0x9c9990, 0x76766f],
    runner: [0xaaa18c, 0x655c50],
    armored: [0x8c9487, 0x4c5a4c],
    crawler: [0x8f9484, 0x625e56],
    exploder: [0x9a9b7e, 0x646345],
    boss: [0x8e8d7b, 0x4a4740],
    brute: [0x9e9585, 0x62564e],
    spitter: [0x8b9881, 0x5d6955],
    screamer: [0xa79b90, 0x70656a],
    stalker: [0x91948c, 0x3f4745],
    leaper: [0xa09a87, 0x5b604e],
    bloater: [0x9c977c, 0x72704b],
    boneguard: [0x999b8b, 0x646c60],
  };
  const [skinColor, clothColor] = palettes[type] || palettes.normal;
  const mat = (color) =>
    new THREE.MeshStandardMaterial({ color, map: texture, roughness: 0.98, flatShading: true });
  const skin = mat(teammate ? 0xb5a087 : skinColor),
    cloth = mat(teammate ? 0x516147 : clothColor),
    dark = mat(0x45413b),
    armor = mat(0x51584d),
    wound = mat(0x783b2d),
    bone = mat(0xb0a797),
    eye = mat(teammate ? 0x8f958b : 0x341800),
    sac = mat(0x7e8e51);
  if (!teammate) {
    skin.color.multiplyScalar(0.65);
    cloth.color.multiplyScalar(0.57);
  }
  eye.map = null;
  eye.emissive.setHex(teammate ? 0 : 0xff6500);
  eye.emissiveIntensity = teammate ? 0 : 1.6;
  const materials = [skin, cloth, dark, armor, wound, bone, eye, sac];
  const group = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const part = (parent, kind, material, x, y, z, sx, sy, sz, rot) => {
    const m = new THREE.Mesh(geometry[kind], material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return m;
  };
  const box = (p, m, x, y, z, sx, sy, sz, r) => part(p, 'box', m, x, y, z, sx, sy, sz, r);
  const ball = (p, m, x, y, z, sx, sy, sz) => part(p, 'sphere', m, x, y, z, sx, sy, sz);
  const limb = (p, m, x, y, z, r, len, rz = r) => part(p, 'capsule', m, x, y, z, r, len / 3, rz);
  const patch = (p, points, z) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        points.flatMap(([x, y]) => [x, y, z]),
        3,
      ),
    );
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        points.flatMap(([x, y]) => [x + 0.5, y + 0.5]),
        2,
      ),
    );
    const ids = [];
    for (let i = 1; i < points.length - 1; i++) ids.push(0, i + 1, i);
    g.setIndex(ids);
    g.computeVertexNormals();
    p.add(new THREE.Mesh(g, wound));
  };
  const pelvis = group(body, 0, crawler ? 0.32 : 0.84, crawler ? 0.29 : 0.015);
  part(pelvis, 'capsule', dark, 0, -0.005, 0, 0.19, 0.055, 0.135);
  const chest = group(body, 0, crawler ? 0.43 : 1.17, crawler ? -0.015 : 0);
  part(chest, 'shirt', cloth, 0, 0, 0, 1, 1, 1);
  patch(
    chest,
    [
      [0.08, 0.12],
      [0.14, 0.14],
      [0.14, 0.045],
      [0.1, 0.015],
      [0.1, -0.06],
      [0.055, -0.08],
      [0.06, 0.04],
    ],
    -0.147,
  );
  patch(
    chest,
    [
      [-0.1, -0.08],
      [-0.075, -0.08],
      [-0.075, -0.15],
      [-0.11, -0.18],
      [-0.1, -0.24],
      [-0.145, -0.24],
      [-0.13, -0.16],
    ],
    -0.133,
  );
  const neck = group(body, 0, crawler ? 0.49 : 1.45, crawler ? -0.3 : -0.008);
  limb(neck, skin, 0, 0, 0, 0.06, 0.15, 0.056);
  const head = group(body, 0, crawler ? 0.595 : 1.605, crawler ? -0.38 : -0.035);
  part(head, 'head', skin, 0, 0.01, 0.005, 0.132, 0.17, 0.116);
  // Angular cheek planes, a recessed black mouth and a separately hinged lower jaw.
  for (const side of [-1, 1]) {
    box(head, dark, side * 0.05, 0.028, -0.108, 0.046, 0.024, 0.013);
    box(head, eye, side * 0.05, 0.025, -0.117, 0.027, 0.016, 0.009);
    box(head, skin, side * 0.052, 0.054, -0.109, 0.061, 0.018, 0.022, [0, 0, side * -0.15]);
    ball(head, skin, side * 0.132, 0, 0.005, 0.015, 0.033, 0.018);
  }
  part(head, 'head', skin, 0, -0.013, -0.12, 0.02, 0.04, 0.025);
  box(head, dark, 0, -0.072, -0.099, 0.076, 0.08, 0.026);
  const jaw = group(head, 0, -0.102, -0.016);
  part(jaw, 'head', skin, 0, -0.013, -0.04, 0.062, 0.038, 0.054);
  box(jaw, dark, 0, 0.014, -0.085, 0.061, 0.024, 0.015);
  box(head, bone, 0, -0.039, -0.116, 0.059, 0.009, 0.005);
  box(jaw, bone, 0, 0.019, -0.098, 0.057, 0.009, 0.005);
  // Two open shirt lapels retain the V-neck and silhouette of the supplied model.
  for (const side of [-1, 1])
    box(chest, cloth, side * 0.055, 0.18, -0.096, 0.075, 0.14, 0.025, [
      0.05,
      side * 0.2,
      side * -0.3,
    ]);
  const arms = [],
    elbows = [],
    wrists = [],
    legs = [],
    knees = [],
    feet = [];
  for (const side of [-1, 1]) {
    const arm = group(body, side * 0.275, crawler ? 0.43 : 1.35, crawler ? -0.22 : 0);
    part(arm, 'sleeve', cloth, 0, -0.04, 0, 1, 1, 1);
    limb(arm, skin, 0, -0.205, 0, 0.056, 0.18, 0.057);
    const elbow = group(arm, 0, -0.29, 0);
    limb(elbow, skin, 0, -0.128, 0, 0.048, 0.27, 0.052);
    patch(
      elbow,
      [
        [-0.03, -0.04],
        [0.018, -0.06],
        [0.028, -0.12],
        [0.007, -0.14],
        [-0.014, -0.08],
      ],
      -0.052,
    );
    const wrist = group(elbow, 0, -0.27, -0.008);
    box(wrist, skin, 0, -0.036, 0, 0.075, 0.1, 0.039);
    for (let finger = 0; finger < 4; finger++) {
      const x = -0.034 + finger * 0.022,
        len = 0.068 + (finger === 1 ? 0.016 : 0);
      part(wrist, 'finger', skin, x, -0.099, -0.005, 0.008, len / 3, 0.009);
      part(wrist, 'finger', skin, x, -0.13, -0.017, 0.007, 0.025 / 3, 0.008);
    }
    part(wrist, 'finger', skin, side * 0.049, -0.03, -0.01, 0.011, 0.053 / 3, 0.012);
    const leg = group(body, side * 0.105, crawler ? 0.3 : 0.78, crawler ? 0.37 : 0.01);
    part(leg, 'thigh', dark, 0, 0, 0, 1, 1, 1);
    const knee = group(leg, 0, -0.37, 0);
    part(knee, 'shin', dark, 0, 0, 0, 1, 1, 1);
    limb(knee, skin, 0, -0.26, 0.005, 0.046, 0.13, 0.051);
    patch(
      leg,
      [
        [-0.065, -0.18],
        [-0.02, -0.15],
        [0.0, -0.22],
        [-0.037, -0.28],
      ],
      -0.095,
    );
    const foot = group(knee, 0, -0.31, -0.035);
    part(foot, 'head', skin, 0, -0.036, -0.035, 0.065, 0.055, 0.12);
    box(foot, dark, 0, -0.078, -0.035, 0.13, 0.02, 0.22);
    arms.push(arm);
    elbows.push(elbow);
    wrists.push(wrist);
    legs.push(leg);
    knees.push(knee);
    feet.push(foot);
  }
  const sacs = [];
  let extra = {};
  if (!teammate)
    extra = addInfectedDetails({
      type,
      group,
      part,
      ball,
      box,
      limb,
      chest,
      pelvis,
      head,
      jaw,
      arms,
      elbows,
      legs,
      knees,
      skin,
      cloth,
      armor,
      dark,
      bone,
      sac,
      wound,
      sacs,
    });
  if (type === 'armored' || teammate) {
    part(head, 'helmet', armor, 0, 0.08, 0.01, 0.16, 0.14, 0.14);
    box(chest, armor, 0, 0.015, -0.145, 0.39, 0.31, 0.05);
  }
  if (type === 'boss') {
    chest.scale.set(1.3, 1.12, 1.3);
    arms.forEach((a) => a.scale.set(1.25, 1.15, 1.2));
  }
  root.scale.setScalar(crawler ? 1 : ZOMBIES[type].height / 1.8);
  const restPose = new Map();
  root.traverse((o) => {
    if (o.isGroup)
      restPose.set(o, {
        position: o.position.clone(),
        quaternion: o.quaternion.clone(),
        scale: o.scale.clone(),
      });
  });
  [...restPose.keys()].forEach(mergeBone);
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
    ...extra,
    referenceModel: true,
    classicZombie: !teammate,
    eyeRest: teammate ? 0 : 1.6,
    restPose,
    walkCycle: 0,
    phase: random(type.length * 61) * Math.PI * 2,
    lastSpeed: 0,
    restHead: head.position.clone(),
    restChest: chest.position.clone(),
    restPelvis: pelvis.position.clone(),
  };
}
export function resetReferencePose(model) {
  for (const [o, r] of model.restPose || []) {
    o.position.copy(r.position);
    o.quaternion.copy(r.quaternion);
    o.scale.copy(r.scale);
  }
  model.death = null;
  model.walkCycle = 0;
  model.lastSpeed = 0;
}
export function disposeReferenceZombie(model) {
  model.root.removeFromParent();
  model.root.traverse((o) => o.geometry?.dispose());
  model.materials.forEach((m) => m.dispose());
}
