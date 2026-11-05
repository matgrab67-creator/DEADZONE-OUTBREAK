import * as THREE from 'three';
import { ModelBuilder } from './ModelBuilder.js';
import { REAL_WEAPON_MODELS } from './RealWeaponModels.js';
import { applyWeaponSkin } from './SkinMaterials.js';
import { SURVIVOR_WEAPON_MODELS } from './SurvivorWeaponModels.js';

function pistol(b) {
  const slide = b.assembly('slide'),
    mag = b.assembly('magazine');
  b.profile(
    [
      [-0.158, 0.012],
      [-0.15, -0.018],
      [-0.072, -0.027],
      [-0.031, -0.043],
      [0.007, -0.142],
      [0.06, -0.135],
      [0.035, -0.025],
      [0.058, -0.008],
      [0.05, 0.012],
    ],
    0.031,
    'polymer',
  );
  b.profile(
    [
      [-0.177, 0.009],
      [-0.177, 0.035],
      [-0.168, 0.046],
      [0.043, 0.046],
      [0.055, 0.038],
      [0.055, 0.009],
    ],
    0.033,
    'slide',
    slide,
  );
  b.tube(0, 0.023, -0.106, 0.007, 0.157);
  // A recessed ejection port, chamber hood and separate slide serrations.
  b.box(0.0176, 0.03, -0.044, 0.0016, 0.019, 0.039, 'dark', slide);
  b.box(0.0185, 0.029, -0.046, 0.001, 0.011, 0.025, 'steel', slide);
  b.box(0, 0.0465, -0.044, 0.024, 0.001, 0.032, 'dark', slide);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++)
      b.box(side * 0.0176, 0.026, 0.043 - i * 0.0048, 0.0015, 0.025, 0.0018, 'dark', slide, 0.0004);
    for (let i = 0; i < 4; i++)
      b.box(side * 0.0176, 0.026, -0.155 + i * 0.005, 0.0015, 0.025, 0.0017, 'dark', slide, 0.0004);
    b.box(side * 0.017, -0.079, 0.016, 0.003, 0.071, 0.031, 'rubber', b.root, 0.001, [0.2, 0, 0]);
    b.screw(side * 0.019, -0.045, 0.006, side);
  }
  b.box(-0.021, -0.009, -0.009, 0.009, 0.007, 0.029, 'steel');
  b.box(-0.02, -0.036, 0.012, 0.007, 0.009, 0.009, 'steel');
  b.box(0, -0.031, -0.106, 0.027, 0.008, 0.058, 'dark');
  b.rail(-0.115, -0.038, 0.046, 0.028);
  b.triggerGuard(-0.043, -0.035);
  b.profile(
    [
      [0.003, -0.055],
      [0.028, -0.055],
      [0.049, -0.134],
      [0.016, -0.141],
    ],
    0.024,
    'steel',
    mag,
  );
  b.box(0, -0.145, 0.035, 0.036, 0.01, 0.049, 'rubber', mag, 0.003, [0.15, 0, 0]);
  b.ironSights(0.035, -0.159, 0.058, slide);
  b.marking('VX–9', 'DZ  //  9×21', -0.018, 0.028, -0.093, 0.063, 0.016, -1, slide);
  b.hand('rightHand', 0.013, -0.073, 0.025);
  b.hand('supportHand', -0.027, -0.077, -0.004, true);
  b.muzzle(-0.189, 0.023);
  return {
    sightHeight: 0.058,
    hip: [0.19, -0.175, -0.38],
    adsZ: -0.36,
    recoilScale: 0.7,
    reloadStyle: 'magazine',
    inspect: [0.1, -0.085, -0.49],
  };
}

function grip(b, y = -0.074, z = 0.035, mat = 'polymer') {
  b.profile(
    [
      [z - 0.024, y + 0.034],
      [z + 0.012, y + 0.034],
      [z + 0.048, y - 0.072],
      [z + 0.011, y - 0.087],
      [z - 0.003, y - 0.056],
    ],
    0.033,
    mat,
  );
  for (const side of [-1, 1]) {
    b.box(
      side * 0.018,
      y - 0.023,
      z + 0.024,
      0.002,
      0.064,
      0.026,
      'rubber',
      b.root,
      0.002,
      [-0.3, 0, 0],
    );
    b.screw(side * 0.019, y + 0.021, z + 0.004, side);
  }
  b.triggerGuard(-0.057, -0.014);
  b.hand('rightHand', 0.016, -0.085, z + 0.022);
}
function optic(b, rear, front, y, radius = 0.021) {
  const center = (rear + front) / 2,
    length = rear - front;
  for (const z of [rear, front]) {
    b.box(0, y - 0.023, z, 0.038, 0.029, 0.027, 'dark');
    b.cylinder(0, y, z, radius * 1.3, 0.026, 'steel');
    b.cylinder(0, y, z + (z === rear ? 0.014 : -0.014), radius, 0.004, 'dark');
  }
  b.cylinder(0, y, center, radius, length, 'dark');
  b.cylinder(0, y, rear + 0.017, radius * 0.78, 0.002, 'lens');
  b.cylinder(0, y, front - 0.017, radius * 0.78, 0.002, 'lens');
  b.cylinder(0, y + radius + 0.012, center, 0.011, 0.025, 'dark', b.root, 'y');
  b.cylinder(radius + 0.012, y, center, 0.011, 0.025, 'dark', b.root, 'x');
}
function rifleStock(b, { tan = false, wood = false, folding = false } = {}) {
  const mat = wood ? 'wood' : tan ? 'tan' : 'polymer';
  b.cylinder(0, 0.003, 0.152, 0.015, 0.19, 'steel');
  if (folding) {
    for (const y of [0.023, -0.04]) b.box(0, y, 0.205, 0.016, 0.013, 0.18, 'steel');
  } else
    b.profile(
      [
        [0.1, 0.029],
        [0.2, 0.036],
        [0.302, 0.022],
        [0.315, -0.083],
        [0.28, -0.088],
        [0.212, -0.035],
        [0.12, -0.032],
      ],
      0.042,
      mat,
    );
  b.box(0, -0.026, 0.31, 0.048, 0.122, 0.022, 'rubber', b.root, 0.006, [-0.08, 0, 0]);
  if (!wood && !folding) {
    b.box(0, 0.034, 0.211, 0.048, 0.018, 0.107, mat);
    b.box(0, -0.052, 0.18, 0.028, 0.008, 0.048, 'dark');
  }
  b.cylinder(-0.027, -0.045, 0.27, 0.009, 0.005, 'steel', b.root, 'x');
}
function curvedMagazine(b) {
  const mag = b.assembly('magazine');
  const outline = [
    [-0.123, -0.028],
    [-0.066, -0.028],
    [-0.071, -0.087],
    [-0.096, -0.16],
    [-0.143, -0.221],
    [-0.19, -0.2],
    [-0.148, -0.136],
    [-0.128, -0.08],
  ];
  b.profile(outline, 0.026, 'steel', mag);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const mesh = b.profile(
        [
          [-0.119 + i * 0.012, -0.048],
          [-0.116 + i * 0.012, -0.084],
          [-0.14 + i * 0.012, -0.145],
          [-0.173 + i * 0.012, -0.194],
          [-0.17 + i * 0.012, -0.198],
          [-0.137 + i * 0.012, -0.146],
          [-0.112 + i * 0.012, -0.083],
          [-0.115 + i * 0.012, -0.048],
        ],
        0.002,
        'dark',
        mag,
        0.0003,
      );
      mesh.position.x = side * 0.014;
    }
  b.box(0, -0.213, -0.168, 0.032, 0.012, 0.058, 'dark', mag, 0.002, [0.6, 0, 0]);
}
function raven(b) {
  b.profile(
    [
      [-0.205, 0.031],
      [0.075, 0.031],
      [0.094, 0.014],
      [0.075, -0.038],
      [-0.17, -0.041],
      [-0.205, -0.022],
    ],
    0.043,
    'steel',
  );
  b.cylinder(0, 0.031, -0.06, 0.022, 0.254, 'dark');
  for (const side of [-1, 1])
    for (const z of [-0.165, -0.08, 0.058]) b.screw(side * 0.023, -0.018, z, side);
  b.box(0.025, 0.004, -0.021, 0.003, 0.024, 0.106, 'bore');
  const bolt = b.assembly('bolt');
  b.cylinder(0.042, 0.006, 0.005, 0.004, 0.044, 'steel', bolt, 'x');
  b.sphere(0.066, 0.006, 0.005, 0.007, 0.007, 0.009, 'dark', bolt);
  b.box(0.026, -0.015, 0.018, 0.003, 0.008, 0.064, 'steel', b.root, 0.001, [0.14, 0, 0]);
  b.profile(
    [
      [-0.348, -0.008],
      [-0.32, 0.019],
      [-0.206, 0.015],
      [-0.19, -0.022],
      [-0.205, -0.049],
      [-0.325, -0.045],
    ],
    0.047,
    'wood',
  );
  b.cylinder(0, 0.027, -0.277, 0.015, 0.13, 'wood');
  for (let i = 0; i < 5; i++) b.box(0, -0.026, -0.216 - i * 0.023, 0.049, 0.034, 0.003, 'dark');
  b.cylinder(0, 0.012, -0.406, 0.009, 0.22, 'steel');
  b.cylinder(0, 0.04, -0.384, 0.007, 0.165, 'dark');
  b.box(0, 0.033, -0.453, 0.025, 0.047, 0.021, 'steel');
  b.tube(0, 0.012, -0.532, 0.014, 0.054);
  grip(b, -0.074, 0.035, 'wood');
  curvedMagazine(b);
  rifleStock(b, { wood: true });
  b.ironSights(-0.155, -0.452, 0.067, b.root, true);
  b.marking('AK-47', '7.62 × 39', -0.023, -0.007, -0.058, 0.084, 0.022);
  b.hand('supportHand', -0.011, -0.045, -0.27, true);
  b.muzzle(-0.564, 0.012);
  return {
    sightHeight: 0.067,
    hip: [0.205, -0.185, -0.46],
    adsZ: -0.46,
    recoilScale: 1,
    reloadStyle: 'magazine',
    inspect: [0.09, -0.09, -0.68],
  };
}
function straightMagazine(b, narrow = false, tan = false) {
  const mag = b.assembly('magazine');
  const z = narrow ? -0.091 : -0.115;
  b.profile(
    [
      [z - 0.024, -0.039],
      [z + 0.024, -0.039],
      [z + 0.023, -0.098],
      [z + 0.012, -0.177],
      [z - 0.037, -0.169],
      [z - 0.026, -0.094],
    ],
    narrow ? 0.022 : 0.027,
    tan ? 'tan' : 'steel',
    mag,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      b.box(
        side * (narrow ? 0.012 : 0.0145),
        -0.104,
        z - 0.014 + i * 0.014,
        0.002,
        0.084,
        0.004,
        'dark',
        mag,
        0.001,
        [-0.08, 0, 0],
      );
  b.box(
    0,
    -0.176,
    z - 0.012,
    narrow ? 0.028 : 0.034,
    0.012,
    0.057,
    'dark',
    mag,
    0.002,
    [-0.12, 0, 0],
  );
}
function spectre(b) {
  b.profile(
    [
      [-0.214, 0.031],
      [0.064, 0.031],
      [0.084, 0.011],
      [0.073, -0.019],
      [-0.172, -0.021],
      [-0.214, -0.009],
    ],
    0.039,
    'slide',
  );
  b.profile(
    [
      [-0.174, -0.02],
      [0.066, -0.019],
      [0.065, -0.049],
      [0.017, -0.051],
      [-0.029, -0.035],
      [-0.068, -0.065],
      [-0.13, -0.065],
      [-0.174, -0.045],
    ],
    0.037,
    'steel',
  );
  b.box(0.022, 0.007, -0.027, 0.003, 0.017, 0.061, 'bore');
  const bolt = b.assembly('bolt');
  b.box(0.024, 0.008, -0.019, 0.004, 0.011, 0.042, 'edge', bolt);
  b.box(0, 0.028, 0.085, 0.062, 0.009, 0.013, 'dark');
  const guard = b.assembly('handguard');
  b.box(0, 0.002, -0.32, 0.049, 0.067, 0.214, 'polymer', guard, 0.005);
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      b.box(side * 0.025, -0.002, -0.232 - i * 0.026, 0.001, 0.013, 0.017, 'bore', guard, 0.001);
      b.box(side * 0.026, -0.02, -0.24 - i * 0.024, 0.002, 0.004, 0.012, 'steel', guard, 0.001);
    }
  b.rail(-0.171, 0.04, 0.472, 0.036);
  b.cylinder(0, 0.011, -0.441, 0.009, 0.12, 'steel');
  b.tube(0, 0.011, -0.539, 0.023, 0.167, b.root, 'dark');
  for (const z of [-0.47, -0.485, -0.59, -0.607]) b.cylinder(0, 0.011, z, 0.024, 0.004, 'steel');
  b.marking('QUIET / 04', 'SPECTRE SUPPRESSION', -0.024, 0.01, -0.535, 0.09, 0.019);
  b.box(-0.022, -0.025, 0.016, 0.007, 0.006, 0.021, 'steel', b.root, 0.001, [0.5, 0, 0]);
  for (const side of [-1, 1])
    for (const z of [-0.155, 0.05]) b.screw(side * 0.022, -0.031, z, side);
  grip(b);
  straightMagazine(b);
  rifleStock(b);
  b.ironSights(0.04, -0.399, 0.071, b.root, true);
  b.marking('M4–SPECTRE', 'DZ ARMAMENT  //  5.6', -0.021, -0.002, -0.072, 0.083, 0.02);
  b.hand('supportHand', -0.014, -0.046, -0.314, true);
  b.muzzle(-0.627, 0.011);
  return {
    sightHeight: 0.071,
    hip: [0.2, -0.184, -0.46],
    adsZ: -0.45,
    recoilScale: 0.7,
    reloadStyle: 'magazine',
    inspect: [0.06, -0.07, -0.71],
  };
}
function vortex(b) {
  b.profile(
    [
      [-0.238, 0.033],
      [0.049, 0.033],
      [0.079, 0.011],
      [0.059, -0.035],
      [-0.19, -0.038],
      [-0.233, -0.018],
    ],
    0.042,
    'tan',
  );
  b.box(0, 0.034, -0.074, 0.043, 0.014, 0.23, 'dark');
  b.profile(
    [
      [-0.156, -0.036],
      [-0.026, -0.033],
      [0.064, -0.036],
      [0.073, -0.07],
      [0.029, -0.068],
      [-0.03, -0.06],
      [-0.09, -0.067],
      [-0.149, -0.059],
    ],
    0.035,
    'polymer',
  );
  b.box(0.023, 0.008, -0.045, 0.002, 0.018, 0.052, 'bore');
  const bolt = b.assembly('bolt');
  b.box(-0.029, 0.022, -0.115, 0.023, 0.008, 0.011, 'steel', bolt);
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++)
      b.box(side * 0.022, -0.003, -0.217 + i * 0.014, 0.002, 0.021, 0.005, 'dark');
  b.rail(-0.085, 0.047, 0.25);
  b.tube(0, 0.012, -0.27, 0.014, 0.073);
  b.cylinder(0, 0.012, -0.239, 0.02, 0.015, 'dark');
  grip(b, -0.076, 0.04);
  straightMagazine(b, true);
  rifleStock(b, { folding: true });
  b.box(0, -0.072, -0.193, 0.028, 0.06, 0.035, 'polymer', b.root, 0.004, [-0.15, 0, 0]);
  b.ironSights(0.016, -0.195, 0.077, b.root, true);
  b.marking('VORTEX–9', 'COMPACT / 9×21', -0.023, 0.012, -0.059, 0.074, 0.02);
  for (const side of [-1, 1])
    for (const z of [-0.151, 0.052]) b.screw(side * 0.024, -0.014, z, side);
  b.hand('supportHand', -0.009, -0.07, -0.19, true);
  b.muzzle(-0.31, 0.012);
  return {
    sightHeight: 0.077,
    hip: [0.195, -0.185, -0.44],
    adsZ: -0.45,
    recoilScale: 0.55,
    reloadStyle: 'magazine',
    inspect: [0.07, -0.075, -0.62],
  };
}
function iron(b) {
  b.profile(
    [
      [-0.188, 0.026],
      [0.07, 0.026],
      [0.09, 0.01],
      [0.063, -0.041],
      [-0.165, -0.046],
      [-0.19, -0.023],
    ],
    0.043,
    'slide',
  );
  b.box(0.023, 0.001, -0.042, 0.002, 0.022, 0.091, 'bore');
  const bolt = b.assembly('bolt');
  b.box(0.024, 0.001, -0.036, 0.003, 0.016, 0.062, 'edge', bolt);
  b.cylinder(0, 0.014, -0.389, 0.012, 0.44, 'steel');
  b.cylinder(0, -0.02, -0.343, 0.013, 0.348, 'dark');
  b.tube(0, 0.014, -0.606, 0.016, 0.035);
  b.cylinder(0, -0.02, -0.512, 0.016, 0.018, 'steel');
  const pump = b.assembly('pump');
  b.box(0, -0.024, -0.323, 0.05, 0.05, 0.155, 'wood', pump, 0.009);
  for (let i = 0; i < 11; i++)
    b.box(0, -0.024, -0.254 - i * 0.013, 0.053, 0.052, 0.003, 'dark', pump, 0.001);
  for (const side of [-1, 1])
    b.box(side * 0.018, -0.019, -0.191, 0.008, 0.009, 0.13, 'steel', pump);
  grip(b, -0.073, 0.032, 'wood');
  rifleStock(b, { wood: true });
  b.ironSights(0.02, -0.594, 0.045);
  // Shell saddle and visible brass shell bases distinguish the tube-fed shotgun.
  for (let i = 0; i < 4; i++) {
    const z = -0.129 + i * 0.033;
    b.cylinder(-0.034, -0.002, z, 0.009, 0.049, 'dark', b.root, 'y');
    b.cylinder(-0.034, 0.023, z, 0.0095, 0.008, 'brass', b.root, 'y');
  }
  b.marking('IRON–12', 'PUMP / 12 GA', -0.023, 0.007, 0.003, 0.052, 0.019);
  b.hand('supportHand', -0.009, -0.059, -0.32, true, pump);
  const shell = b.assembly('loadingShell');
  b.cylinder(0, 0, 0, 0.009, 0.055, 'red' in b.m ? 'red' : 'wood', shell);
  b.cylinder(0, 0, 0.028, 0.0095, 0.007, 'brass', shell);
  shell.visible = false;
  b.muzzle(-0.629, 0.014);
  return {
    sightHeight: 0.045,
    hip: [0.21, -0.182, -0.46],
    adsZ: -0.46,
    recoilScale: 1.5,
    reloadStyle: 'shells',
    inspect: [0.07, -0.075, -0.72],
  };
}
function lynx(b) {
  b.profile(
    [
      [-0.203, 0.02],
      [0.099, 0.02],
      [0.122, -0.016],
      [0.07, -0.045],
      [-0.025, -0.037],
      [-0.096, -0.068],
      [-0.18, -0.053],
      [-0.208, -0.015],
    ],
    0.048,
    'tan',
  );
  b.cylinder(0, 0.028, -0.058, 0.023, 0.282, 'steel');
  b.box(0.024, 0.026, -0.009, 0.003, 0.023, 0.082, 'bore');
  const bolt = b.assembly('bolt');
  b.cylinder(0, 0.029, 0.018, 0.018, 0.103, 'edge', bolt);
  b.cylinder(0.035, 0.024, 0.061, 0.004, 0.044, 'steel', bolt, 'x');
  b.sphere(0.058, 0.016, 0.061, 0.012, 0.012, 0.012, 'dark', bolt);
  b.box(0, -0.012, -0.288, 0.054, 0.062, 0.17, 'tan', b.root, 0.005);
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++)
      b.box(side * 0.028, -0.004, -0.23 - i * 0.029, 0.002, 0.014, 0.018, 'dark');
  b.cylinder(0, 0.028, -0.477, 0.014, 0.395, 'steel');
  b.tube(0, 0.028, -0.704, 0.022, 0.069);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      b.box(side * 0.022, 0.028, -0.683 - i * 0.015, 0.002, 0.02, 0.008, 'bore');
  b.rail(-0.056, 0.055, 0.235);
  const scope = b.assembly('scope');
  for (const z of [0.003, -0.181]) {
    b.box(0, 0.075, z, 0.034, 0.022, 0.024, 'dark', scope);
    b.cylinder(0, 0.117, z, 0.024, 0.018, 'dark', scope);
  }
  b.cylinder(0, 0.117, -0.08, 0.019, 0.226, 'dark', scope);
  b.cylinder(0, 0.117, -0.217, 0.034, 0.07, 'steel', scope, 'z', 0.019);
  b.cylinder(0, 0.117, 0.061, 0.024, 0.078, 'dark', scope);
  b.tube(0, 0.117, -0.258, 0.035, 0.021, scope, 'dark');
  b.cylinder(0, 0.117, -0.265, 0.028, 0.001, 'lens', scope);
  b.cylinder(0, 0.117, 0.106, 0.0205, 0.001, 'lens', scope);
  b.cylinder(0, 0.147, -0.073, 0.014, 0.024, 'dark', scope, 'y');
  b.cylinder(0.025, 0.117, -0.073, 0.013, 0.023, 'dark', scope, 'x');
  for (let i = 0; i < 14; i++) {
    const angle = (i * Math.PI) / 7;
    b.box(
      Math.cos(angle) * 0.014,
      0.148,
      -0.073 + Math.sin(angle) * 0.014,
      0.003,
      0.017,
      0.003,
      'steel',
      scope,
      0.0005,
    );
  }
  const mag = b.assembly('magazine');
  b.box(0, -0.073, -0.119, 0.035, 0.069, 0.064, 'dark', mag, 0.004);
  b.box(0, -0.111, -0.119, 0.041, 0.012, 0.073, 'polymer', mag);
  grip(b, -0.074, 0.048, 'tan');
  rifleStock(b, { tan: true });
  // Folded bipod legs and adjustable cheek rest.
  for (const side of [-1, 1]) {
    b.cylinder(side * 0.039, -0.051, -0.372, 0.006, 0.19, 'steel');
    b.cylinder(side * 0.039, -0.051, -0.272, 0.009, 0.023, 'rubber');
  }
  b.box(0, 0.047, 0.218, 0.048, 0.022, 0.102, 'tan');
  b.marking('LYNX–50', 'PRECISION / MK.II', -0.027, -0.012, -0.026, 0.095, 0.023);
  b.hand('supportHand', -0.011, -0.056, -0.282, true);
  b.muzzle(-0.744, 0.028);
  return {
    sightHeight: 0.117,
    hip: [0.21, -0.192, -0.49],
    adsZ: -0.46,
    recoilScale: 1.6,
    reloadStyle: 'magazine',
    inspect: [0.05, -0.07, -0.78],
  };
}

function desertEagle(b) {
  const slide = b.assembly('slide'),
    mag = b.assembly('magazine');
  b.profile(
    [
      [-0.2, 0.008],
      [-0.158, -0.025],
      [-0.05, -0.031],
      [-0.016, -0.132],
      [0.049, -0.125],
      [0.027, -0.027],
      [0.067, -0.003],
      [0.056, 0.015],
    ],
    0.04,
    'gold',
  );
  b.profile(
    [
      [-0.218, 0.008],
      [-0.209, 0.05],
      [-0.189, 0.067],
      [0.041, 0.067],
      [0.063, 0.047],
      [0.062, 0.01],
    ],
    0.045,
    'gold',
    slide,
  );
  b.tube(0, 0.033, -0.122, 0.009, 0.19, b.root, 'gold');
  b.box(0.024, 0.04, -0.054, 0.002, 0.023, 0.054, 'bore', slide);
  b.box(0, 0.068, -0.047, 0.027, 0.002, 0.032, 'dark', slide);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = -0.19 + i * 0.031;
      const stripe = b.profile(
        [
          [z, 0.061],
          [z + 0.009, 0.057],
          [z + 0.028, 0.027],
          [z + 0.023, 0.022],
          [z + 0.005, 0.045],
          [z - 0.003, 0.05],
        ],
        0.0014,
        i % 2 ? 'goldLight' : 'goldDark',
        slide,
        0.0002,
      );
      stripe.position.x = side * 0.023;
    }
    for (let i = 0; i < 5; i++)
      b.box(side * 0.023, 0.032, 0.038 - i * 0.006, 0.002, 0.028, 0.002, 'goldDark', slide);
    b.box(side * 0.022, -0.08, 0.014, 0.004, 0.084, 0.07, 'rubber', b.root, 0.006);
    b.box(side * 0.024, -0.06, 0.014, 0.003, 0.047, 0.043, 'dark');
    b.screw(side * 0.025, -0.043, 0.005, side);
    b.screw(side * 0.025, -0.079, 0.024, side);
    b.screw(side * 0.025, -0.091, -0.002, side);
  }
  for (let i = 0; i < 12; i++)
    b.box(0, 0.069, -0.188 + i * 0.018, 0.046, 0.004, 0.009, 'goldDark', slide, 0.001);
  for (let i = 0; i < 9; i++)
    for (let segment = 0; segment < 3; segment++)
      b.box(
        (segment % 2 ? 1 : -1) * 0.006,
        0.0725,
        -0.185 + i * 0.026 + segment * 0.008,
        0.008,
        0.0014,
        0.01,
        i % 2 ? 'goldLight' : 'goldDark',
        slide,
        0.0004,
        [0, 0.38, 0],
      );
  b.rail(-0.115, -0.046, 0.055, 0.032);
  b.triggerGuard(-0.04, -0.01);
  b.box(0, 0.015, 0.066, 0.044, 0.04, 0.042, 'gold');
  b.box(0, 0.044, 0.078, 0.025, 0.028, 0.026, 'goldDark');
  b.box(0, 0.026, 0.091, 0.013, 0.012, 0.018, 'goldLight');
  b.profile(
    [
      [-0.001, -0.052],
      [0.035, -0.05],
      [0.055, -0.14],
      [0.012, -0.144],
    ],
    0.03,
    'gold',
    mag,
  );
  b.box(0, -0.147, 0.032, 0.039, 0.012, 0.05, 'goldDark', mag, 0.003);
  b.ironSights(0.053, -0.19, 0.078, slide);
  b.marking('DESERT EAGLE', '.50 / HEAVY SIDEARM', -0.022, 0.039, -0.102, 0.077, 0.016, -1, slide);
  b.hand('rightHand', 0.016, -0.08, 0.027);
  b.hand('supportHand', -0.026, -0.08, -0.005, true);
  b.muzzle(-0.222, 0.033);
  return {
    sightHeight: 0.078,
    hip: [0.2, -0.18, -0.4],
    adsZ: -0.37,
    recoilScale: 1.5,
    reloadStyle: 'magazine',
    inspect: [0.1, -0.085, -0.49],
  };
}
function tec9(b) {
  const bolt = b.assembly('bolt'),
    mag = b.assembly('magazine');
  b.profile(
    [
      [-0.225, 0.03],
      [0.056, 0.03],
      [0.078, 0.008],
      [0.058, -0.034],
      [-0.164, -0.034],
      [-0.227, -0.012],
    ],
    0.041,
    'tan',
  );
  b.cylinder(0, 0.034, -0.093, 0.021, 0.25, 'dark');
  b.cylinder(0, 0.034, -0.245, 0.017, 0.12, 'steel');
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++)
      b.cylinder(side * 0.019, 0.034, -0.138 - i * 0.025, 0.0035, 0.009, 'bore');
  b.box(0.026, 0.009, -0.035, 0.003, 0.014, 0.065, 'bore');
  b.box(-0.022, 0.041, -0.066, 0.025, 0.01, 0.012, 'steel', bolt);
  b.profile(
    [
      [-0.09, -0.024],
      [-0.035, -0.027],
      [-0.039, -0.15],
      [-0.075, -0.193],
      [-0.118, -0.178],
      [-0.105, -0.094],
    ],
    0.025,
    'steel',
    mag,
  );
  b.box(0, -0.186, -0.098, 0.033, 0.012, 0.049, 'dark', mag);
  grip(b, -0.075, 0.043);
  b.ironSights(0.052, -0.29, 0.067);
  b.rail(-0.145, 0.061, 0.19, 0.03);
  b.marking('TEC-9', '9x19 / MACHINE PISTOL', -0.022, 0.008, -0.072, 0.069, 0.016);
  b.hand('supportHand', -0.009, -0.061, -0.17, true);
  b.muzzle(-0.31, 0.034);
  return {
    sightHeight: 0.067,
    hip: [0.195, -0.18, -0.42],
    adsZ: -0.43,
    recoilScale: 0.7,
    reloadStyle: 'magazine',
    inspect: [0.09, -0.08, -0.55],
  };
}
function scout(b) {
  const bolt = b.assembly('bolt');
  b.profile(
    [
      [-0.195, 0.022],
      [0.086, 0.022],
      [0.108, -0.012],
      [0.067, -0.044],
      [-0.017, -0.039],
      [-0.092, -0.064],
      [-0.18, -0.049],
      [-0.2, -0.012],
    ],
    0.043,
    'tan',
  );
  b.cylinder(0, 0.03, -0.11, 0.014, 0.34, 'steel');
  b.box(0.022, 0.026, -0.015, 0.003, 0.021, 0.081, 'bore');
  b.cylinder(0, 0.034, 0.027, 0.012, 0.085, 'edge', bolt);
  b.cylinder(0.028, 0.031, 0.061, 0.0035, 0.04, 'steel', bolt, 'x');
  b.sphere(0.05, 0.018, 0.061, 0.009, 0.009, 0.009, 'dark', bolt);
  b.rail(-0.025, 0.054, 0.25);
  optic(b, 0.071, -0.19, 0.113, 0.018);
  b.box(0, -0.008, -0.28, 0.048, 0.057, 0.16, 'tan', b.root, 0.005);
  b.box(0, -0.105, -0.105, 0.036, 0.05, 0.057, 'dark');
  b.box(0, -0.13, -0.105, 0.04, 0.011, 0.066, 'polymer');
  grip(b, -0.069, 0.049, 'tan');
  rifleStock(b, { tan: true });
  b.marking('SCOUT-9', 'LIGHT / PRECISION', -0.025, -0.008, -0.015, 0.086, 0.019);
  b.hand('supportHand', -0.01, -0.057, -0.265, true);
  b.muzzle(-0.32, 0.03);
  return {
    sightHeight: 0.113,
    hip: [0.2, -0.185, -0.46],
    adsZ: -0.44,
    recoilScale: 1.25,
    reloadStyle: 'magazine',
    inspect: [0.07, -0.07, -0.68],
  };
}
function pbs1(b) {
  b.profile(
    [
      [-0.206, 0.027],
      [0.079, 0.027],
      [0.097, 0.008],
      [0.072, -0.036],
      [-0.151, -0.04],
      [-0.207, -0.014],
    ],
    0.044,
    'steel',
  );
  b.cylinder(0, 0.031, -0.116, 0.015, 0.333, 'dark');
  b.cylinder(0, 0.031, -0.46, 0.021, 0.31, 'tan');
  b.cylinder(0, 0.031, -0.619, 0.024, 0.014, 'steel');
  b.tube(0, 0.031, -0.619, 0.014, 0.318, b.root, 'dark');
  for (const z of [-0.51, -0.56, -0.66, -0.71]) b.cylinder(0, 0.031, z, 0.025, 0.004, 'steel');
  const bolt = b.assembly('bolt');
  b.box(0.032, 0.018, -0.048, 0.021, 0.008, 0.014, 'edge', bolt);
  b.rail(-0.05, 0.055, 0.29);
  optic(b, 0.079, -0.205, 0.119, 0.02);
  grip(b, -0.072, 0.041);
  straightMagazine(b);
  rifleStock(b, { tan: true });
  b.ironSights(0.047, -0.37, 0.07, b.root, true);
  b.marking('PBS-1', 'SUPPRESSED / 7.62', -0.025, 0.008, -0.08, 0.078, 0.019);
  b.hand('supportHand', -0.011, -0.056, -0.32, true);
  b.muzzle(-0.778, 0.031);
  return {
    sightHeight: 0.119,
    hip: [0.2, -0.185, -0.46],
    adsZ: -0.45,
    recoilScale: 0.8,
    reloadStyle: 'magazine',
    inspect: [0.06, -0.07, -0.74],
  };
}

export function createWeaponModel(id, upgraded = false, skin = 'factory') {
  const builder = new ModelBuilder(id, upgraded);
  const factories = {
    ...REAL_WEAPON_MODELS,
    ...SURVIVOR_WEAPON_MODELS,
    vx9: pistol,
    desertEagle,
    tec9,
    raven,
    spectre,
    vortex,
    iron,
    lynx,
    scout,
    pbs1,
  };
  if (!factories[id]) throw new Error(`Unknown weapon model: ${id}`);
  const model = builder.finish(factories[id](builder));
  applyWeaponSkin(model, id, skin);
  return model;
}

export { createKnifeModel } from './KnifeModels.js';
