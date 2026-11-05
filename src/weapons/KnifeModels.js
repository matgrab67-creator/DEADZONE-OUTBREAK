import * as THREE from 'three';
import { ModelBuilder } from './ModelBuilder.js';
import { canonicalKnifeId } from '../../shared/Knives.js';
import { createKnifeHand } from './KnifeHand.js';
import { applyWeaponSkin } from './SkinMaterials.js';
import {
  KnifeReference,
  profileMesh,
  faceMesh,
  gripRecess,
  contourLine,
  knifeMaterials,
  wrappedGrip,
} from './KnifeGeometry.js';

// Profiles are traced in the coordinate systems of the three supplied images.
// Keeping these coordinates makes the silhouettes and relative proportions
// reviewable against the references instead of approximating them with boxes.
function karambit(b, parent) {
  const ref = new KnifeReference([300, 190], [0.54, 0.84], 0.00057);
  const blade = ref.path([
    ['M', 13, 80],
    ['C', 55, 44, 103, 27, 147, 32],
    ['C', 184, 31, 213, 46, 238, 61],
    ['Q', 253, 73, 245, 94],
    ['L', 230, 130],
    ['Q', 224, 143, 232, 153],
    ['L', 216, 146],
    ['Q', 208, 128, 186, 114],
    ['C', 138, 81, 95, 58, 13, 80],
    ['Z'],
  ]);
  profileMesh(b, blade, 0.0036, 'knifeSteel', parent, 0.00018);
  const grind = ref.path([
    ['M', 13, 80],
    ['C', 75, 47, 151, 53, 218, 103],
    ['Q', 226, 121, 220, 138],
    ['C', 169, 94, 104, 54, 13, 80],
    ['Z'],
  ]);
  for (const side of [-1, 1]) faceMesh(b, grind, 0.00203, side, 'knifeEdge', parent, 0.0017);
  const spine = ref.path([
    ['M', 15, 79],
    ['C', 84, 29, 163, 25, 227, 58],
    ['L', 222, 70],
    ['C', 157, 37, 83, 39, 15, 79],
    ['Z'],
  ]);
  for (const side of [-1, 1]) faceMesh(b, spine, 0.00212, side, 'knifeSpine', parent);

  const handle = ref.path([
    ['M', 238, 60],
    ['Q', 257, 61, 265, 76],
    ['Q', 267, 95, 296, 106],
    ['Q', 313, 111, 326, 115],
    ['C', 344, 135, 352, 162, 368, 189],
    ['L', 386, 217],
    ['Q', 392, 235, 403, 248],
    ['C', 423, 268, 418, 299, 410, 316],
    ['Q', 385, 325, 361, 312],
    ['C', 339, 301, 332, 279, 341, 253],
    ['Q', 336, 233, 321, 232],
    ['Q', 320, 211, 303, 207],
    ['Q', 294, 186, 280, 182],
    ['Q', 277, 163, 263, 159],
    ['Q', 250, 145, 233, 157],
    ['L', 225, 155],
    ['Q', 213, 143, 216, 129],
    ['Q', 229, 103, 237, 84],
    ['Q', 241, 70, 238, 60],
    ['Z'],
  ]);
  const holes = [{ name: 'finger-ring', ...ref.hole(handle, 376, 280, 27) }];
  // The inset rubber scales sit inside the narrow continuous outer rim.
  const scale = ref.path([
    ['M', 246, 69],
    ['Q', 257, 69, 259, 83],
    ['Q', 268, 104, 299, 114],
    ['L', 321, 122],
    ['C', 341, 148, 352, 180, 373, 210],
    ['L', 393, 246],
    ['Q', 384, 253, 353, 250],
    ['Q', 344, 224, 326, 225],
    ['Q', 323, 204, 306, 199],
    ['Q', 300, 181, 285, 175],
    ['Q', 281, 157, 267, 152],
    ['Q', 247, 135, 230, 146],
    ['Q', 222, 137, 226, 126],
    ['Q', 246, 91, 246, 69],
    ['Z'],
  ]);
  const recesses = [
    ref.path([
      ['M', 236, 145],
      ['C', 248, 133, 270, 133, 281, 149],
      ['Q', 287, 159, 282, 166],
      ['C', 273, 151, 254, 145, 240, 155],
      ['Z'],
    ]),
    ref.path([
      ['M', 267, 169],
      ['C', 281, 157, 298, 161, 307, 179],
      ['Q', 312, 190, 307, 195],
      ['C', 297, 178, 286, 173, 275, 179],
      ['Z'],
    ]),
    ref.path([
      ['M', 292, 199],
      ['C', 304, 185, 322, 192, 331, 211],
      ['Q', 336, 223, 330, 229],
      ['C', 318, 211, 308, 204, 299, 211],
      ['Z'],
    ]),
    ref.path([
      ['M', 318, 230],
      ['C', 333, 215, 350, 222, 357, 241],
      ['L', 350, 250],
      ['C', 340, 238, 331, 235, 326, 244],
      ['Z'],
    ]),
  ].map((shape) => {
    const points = shape.getPoints(20),
      centre = points
        .reduce((sum, p) => sum.add(p), new THREE.Vector2())
        .multiplyScalar(1 / points.length);
    const shift = ref.point(306, 188).sub(ref.point(300, 190));
    return new THREE.Shape(points.map((p) => p.clone().lerp(centre, 0.23).add(shift)));
  });
  for (const recess of recesses) {
    handle.holes.push(recess);
    scale.holes.push(recess);
  }
  profileMesh(b, handle, 0.02, 'knifeGripEdge', parent, 0.0007);
  for (const side of [-1, 1]) {
    faceMesh(b, scale, 0.0114, side, 'knifeGrip', parent);
    for (const recess of recesses) gripRecess(b, recess, side, 0.0123, 'knifeRecess', parent);
    const seam = ref.path([
      ['M', 246, 70],
      ['Q', 249, 93, 228, 130],
      ['Q', 223, 140, 231, 147],
    ]);
    contourLine(b, seam, side, 0.0117, 0.00045, 'knifeGripEdge', parent);
    const hole = ref.point(376, 280);
    b.mesh(
      new THREE.TorusGeometry(27.7 * ref.scale, 0.00065, 7, 48),
      'knifeSpine',
      side * 0.0106,
      hole.y,
      hole.x,
      parent,
      [0, Math.PI / 2, 0],
    );
    const screw = ref.point(234, 78);
    b.cylinder(side * 0.0026, screw.y, screw.x, 0.0014, 0.0013, 'knifeBolster', parent, 'x');
    // Fine jimping on the spine of the handle, following its curve.
    for (let i = 0; i < 12; i++) {
      const t = i / 11,
        p = ref.point(329 + 61 * t, 126 + 112 * t);
      b.box(
        side * 0.0108,
        p.y,
        p.x,
        0.0013,
        0.0015,
        0.0034,
        'knifeRecess',
        parent,
        0.0003,
        [0.1, 0, 0],
      );
    }
  }
  return { ref, holes, pivot: ref.point(376, 280), length: 0.23 };
}

function skeleton(b, parent) {
  const ref = new KnifeReference([251, 202], [0.776, 0.631], 0.00084);
  const blank = ref.path([
    ['M', 26, 13],
    ['C', 77, 43, 123, 83, 169, 109],
    ['Q', 185, 119, 207, 114],
    ['Q', 209, 130, 225, 144],
    ['L', 270, 178],
    ['Q', 302, 204, 315, 234],
    ['Q', 322, 249, 302, 247],
    ['Q', 278, 243, 252, 225],
    ['L', 202, 185],
    ['Q', 182, 170, 166, 174],
    ['Q', 164, 157, 150, 146],
    ['C', 103, 116, 58, 67, 26, 13],
    ['Z'],
  ]);
  const holeSpecs = [
    ['finger-hole', 192, 146, 18.2],
    ['blade-hole-1', 126, 94, 2.0],
    ['blade-hole-2', 134, 101, 2.6],
    ['blade-hole-3', 144, 108, 3.0],
    ['blade-hole-4', 154, 116, 3.4],
    ['blade-hole-5', 165, 124, 4.0],
    ['lanyard-hole', 303, 235, 3.4],
  ];
  const holes = holeSpecs.map(([name, x, y, r]) => ({ name, ...ref.hole(blank, x, y, r) }));
  profileMesh(b, blank, 0.004, 'knifeSteel', parent, 0.0003);
  const bevel = ref.path([
    ['M', 26, 13],
    ['C', 61, 56, 105, 100, 150, 129],
    ['Q', 157, 134, 156, 142],
    ['C', 108, 119, 60, 69, 26, 13],
    ['Z'],
  ]);
  const swedge = ref.path([
    ['M', 27, 14],
    ['C', 75, 44, 119, 82, 167, 109],
    ['Q', 180, 118, 190, 119],
    ['C', 151, 102, 103, 66, 27, 14],
    ['Z'],
  ]);
  for (const side of [-1, 1]) {
    faceMesh(b, bevel, 0.00234, side, 'knifeEdge', parent, 0.0017);
    faceMesh(b, swedge, 0.00231, side, 'knifeSpine', parent);
    const ring = ref.point(192, 146);
    b.mesh(
      new THREE.TorusGeometry(18.6 * ref.scale, 0.00048, 7, 48),
      'knifeEdge',
      side * 0.00225,
      ring.y,
      ring.x,
      parent,
      [0, Math.PI / 2, 0],
    );
  }
  const grip = ref.path([
    ['M', 216, 151],
    ['Q', 235, 159, 255, 175],
    ['Q', 292, 203, 310, 231],
    ['Q', 314, 241, 302, 241],
    ['Q', 276, 232, 254, 216],
    ['L', 214, 183],
    ['Q', 205, 174, 205, 167],
    ['Z'],
  ]);
  ref.hole(grip, 303, 235, 3.4);
  profileMesh(b, grip, 0.006, 'knifeTapeEdge', parent, 0.0006);
  const wrap = wrappedGrip(b, 0.012, 0.101, parent, 7);
  wrap.position.y = -0.0008;
  return { ref, holes, pivot: ref.point(192, 146), length: 0.3 };
}

function stiletto(b, parent) {
  const ref = new KnifeReference([244, 177], [0.83, 0.558], 0.00076);
  // A long needle-point blade with a narrow single cutting bevel.
  const blade = ref.path([
    ['M', 12, 24],
    ['L', 143, 96],
    ['L', 156, 103],
    ['Q', 164, 109, 167, 117],
    ['L', 161, 132],
    ['Q', 151, 131, 142, 123],
    ['C', 101, 91, 54, 55, 12, 24],
    ['Z'],
  ]);
  const bladeHoles = [{ name: 'blade-base-hole', ...ref.hole(blade, 137, 111, 2.0) }];
  const pivot = ref.point(166, 120),
    bladePivot = b.assembly('knifeBlade', parent);
  bladePivot.position.set(0, pivot.y, pivot.x);
  const bladeBody = b.assembly('stilettoBladeBody', bladePivot);
  bladeBody.position.set(0, -pivot.y, -pivot.x);
  profileMesh(b, blade, 0.0031, 'knifeSteel', bladeBody, 0.00015);
  const grind = ref.path([
    ['M', 12, 24],
    ['C', 60, 61, 105, 91, 144, 116],
    ['L', 156, 126],
    ['L', 150, 129],
    ['C', 105, 96, 55, 57, 12, 24],
    ['Z'],
  ]);
  const spine = ref.path([
    ['M', 12, 24],
    ['L', 143, 96],
    ['L', 156, 104],
    ['L', 157, 111],
    ['C', 109, 86, 62, 53, 12, 24],
    ['Z'],
  ]);
  for (const side of [-1, 1]) {
    faceMesh(b, grind, 0.00178, side, 'knifeEdge', bladeBody, 0.0013);
    faceMesh(b, spine, 0.00176, side, 'knifeSpine', bladeBody);
  }
  const frame = ref.path([
    ['M', 172, 126],
    ['Q', 181, 126, 192, 136],
    ['L', 300, 202],
    ['L', 325, 207],
    ['Q', 337, 218, 321, 231],
    ['Q', 313, 235, 302, 226],
    ['L', 180, 151],
    ['Q', 167, 145, 168, 135],
    ['Z'],
  ]);
  profileMesh(b, frame, 0.0098, 'knifeBolster', parent, 0.0006);
  const wood = ref.path([
    ['M', 187, 138],
    ['Q', 190, 138, 196, 142],
    ['L', 300, 207],
    ['Q', 311, 216, 305, 223],
    ['Q', 302, 227, 296, 222],
    ['L', 183, 152],
    ['Q', 177, 144, 187, 138],
    ['Z'],
  ]);
  // Matching walnut scales on both sides, with the steel liner visible around them.
  const scale = profileMesh(b, wood, 0.0164, 'knifeWood', parent, 0.0011);
  scale.name = 'walnutScales';
  const bolster = ref.path([
    ['M', 158, 105],
    ['Q', 172, 108, 186, 122],
    ['L', 190, 130],
    ['Q', 187, 140, 179, 141],
    ['L', 159, 131],
    ['Q', 151, 121, 158, 105],
    ['Z'],
  ]);
  profileMesh(b, bolster, 0.019, 'knifeBolster', parent, 0.0008);
  // The small curved guard wings and visible pivot hardware are separate volumes.
  const guardA = ref.path([
    ['M', 161, 111],
    ['Q', 148, 109, 147, 121],
    ['Q', 149, 130, 159, 131],
    ['L', 162, 126],
    ['Q', 153, 124, 154, 120],
    ['Q', 154, 117, 164, 118],
    ['Z'],
  ]);
  const guardB = ref.path([
    ['M', 161, 129],
    ['Q', 167, 142, 154, 145],
    ['Q', 146, 146, 145, 139],
    ['Q', 151, 143, 156, 138],
    ['L', 156, 129],
    ['Z'],
  ]);
  profileMesh(b, guardA, 0.007, 'knifeBolster', parent, 0.0005);
  profileMesh(b, guardB, 0.007, 'knifeBolster', parent, 0.0005);
  const pommel = ref.path([
    ['M', 302, 202],
    ['L', 324, 207],
    ['Q', 334, 215, 325, 226],
    ['Q', 319, 235, 308, 228],
    ['L', 299, 221],
    ['Q', 309, 213, 302, 202],
    ['Z'],
  ]);
  profileMesh(b, pommel, 0.019, 'knifeBolster', parent, 0.0007);
  for (const side of [-1, 1]) {
    for (const [x, y, r] of [
      [173, 126, 6],
      [220, 154, 4.8],
      [275, 187, 2.9],
      [290, 199, 2.1],
    ]) {
      const p = ref.point(x, y),
        radius = r * ref.scale;
      b.cylinder(side * 0.0102, p.y, p.x, radius, 0.0015, 'knifeSpine', parent, 'x');
      b.cylinder(side * 0.011, p.y, p.x, radius * 0.73, 0.0008, 'knifeBolster', parent, 'x');
      b.box(
        side * 0.0115,
        p.y,
        p.x,
        0.0003,
        0.0007,
        radius * 1.05,
        'knifeSpine',
        parent,
        0.0001,
        [0.2, 0, 0],
      );
    }
    for (const [x, y] of [
      [196, 143],
      [314, 217],
    ]) {
      const p = ref.point(x, y);
      b.cylinder(side * 0.0105, p.y, p.x, 0.0012, 0.001, 'knifeSpine', parent, 'x');
    }
  }
  return { ref, holes: bladeHoles, pivot: ref.point(244, 177), length: 0.28 };
}

export function createKnifeModel(requestedId = 'karambit', skin = 'factory') {
  const id = canonicalKnifeId(requestedId),
    b = new ModelBuilder(`knife-${id}`, false);
  knifeMaterials(b);
  const rig = b.assembly('knifeRig'),
    body = b.assembly('knifeBody', rig);
  const data = { karambit, skeleton, stiletto }[id](b, body);
  rig.position.set(0, data.pivot.y, data.pivot.x);
  body.position.copy(rig.position).negate();

  createKnifeHand(b);
  const model = b.finish({
    knifeVariant: id,
    sightHeight: 0,
    hip: [0.17, -0.155, -0.36],
    adsZ: -0.36,
    recoilScale: 0.2,
    inspect: [0.055, -0.06, -0.42],
    reloadStyle: 'none',
    reference: {
      axis: data.ref.axis,
      scale: data.ref.scale,
      holes: data.holes,
      length: data.length,
    },
  });
  applyWeaponSkin(model, `knife:${id}`, skin);
  return model;
}
