import * as THREE from 'three';

// Distinct silhouettes built from manufacturer side profiles, in viewmodel metres.
function meta(sightHeight, _muzzle, options = {}) {
  return {
    sightHeight,
    hip: [0.205, -0.19, -0.43],
    adsZ: -0.4,
    recoilScale: 1,
    reloadStyle: 'magazine',
    inspect: [0.08, -0.08, -0.67],
    ...options,
  };
}
function cutProfile(b, outline, holes, width, material, parent = b.root) {
  const rounded = (path, points, radius) => {
    const corners = points.map(([z, y], i) => {
      const previous = new THREE.Vector2(...points[(i + points.length - 1) % points.length]);
      const current = new THREE.Vector2(z, y);
      const next = new THREE.Vector2(...points[(i + 1) % points.length]);
      const entry = current
        .clone()
        .lerp(previous, Math.min(0.3, radius / current.distanceTo(previous)));
      const leave = current.clone().lerp(next, Math.min(0.3, radius / current.distanceTo(next)));
      return { current, entry, leave };
    });
    path.moveTo(corners[0].entry.x, corners[0].entry.y);
    for (const { current, entry, leave } of corners) {
      path.lineTo(entry.x, entry.y);
      path.quadraticCurveTo(current.x, current.y, leave.x, leave.y);
    }
    path.closePath();
  };
  const shape = new THREE.Shape();
  rounded(shape, outline, 0.018);
  for (const points of holes) {
    const path = new THREE.Path();
    rounded(path, points, 0.012);
    shape.holes.push(path);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.002,
    bevelThickness: 0.002,
    steps: 1,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -width / 2);
  geometry.rotateY(-Math.PI / 2);
  return b.mesh(geometry, material, 0, 0, 0, parent);
}
function ringSight(b, z, y, radius = 0.015) {
  b.mesh(new THREE.TorusGeometry(radius, 0.003, 6, 24), 'steel', 0, y, z);
  b.box(0, y - radius * 0.6, z, 0.003, radius, 0.006, 'steel');
  b.box(0, y - radius - 0.008, z, 0.018, 0.018, 0.018, 'steel');
}
function grip(b, z = 0.035, material = 'polymer') {
  b.profile(
    [
      [z - 0.027, -0.025],
      [z + 0.017, -0.025],
      [z + 0.046, -0.139],
      [z + 0.007, -0.151],
      [z - 0.008, -0.103],
    ],
    0.035,
    material,
  );
  b.triggerGuard(-0.064, z - 0.049);
  b.hand('rightHand', 0.014, -0.083, z + 0.017);
}
function scope(b, rear, front, y, radius = 0.024) {
  for (const z of [rear - 0.025, front + 0.04]) {
    b.box(0, y - 0.035, z, 0.033, 0.035, 0.024, 'dark');
    b.mesh(new THREE.TorusGeometry(radius + 0.002, 0.005, 6, 20), 'steel', 0, y, z);
  }
  b.cylinder(0, y, (rear + front) / 2, radius * 0.75, rear - front, 'dark');
  for (const z of [rear, front]) {
    b.cylinder(0, y, z, radius, 0.04, 'steel', b.root, 'z', radius, true);
    const direction = z === rear ? 1 : -1;
    b.mesh(
      new THREE.RingGeometry(radius * 0.82, radius, 24),
      'dark',
      0,
      y,
      z + direction * 0.021,
      b.root,
      direction === 1 ? [0, 0, 0] : [0, Math.PI, 0],
    );
    b.mesh(
      new THREE.CircleGeometry(radius * 0.8, 24),
      'bore',
      0,
      y,
      z + direction * 0.01,
      b.root,
      direction === 1 ? [0, 0, 0] : [0, Math.PI, 0],
    );
    b.cylinder(0, y, z + (z === rear ? 0.022 : -0.022), radius * 0.82, 0.002, 'lens');
  }
  const center = (rear + front) / 2;
  b.cylinder(0, y + 0.03, center, 0.012, 0.024, 'steel', b.root, 'y');
  b.cylinder(0.027, y, center, 0.012, 0.026, 'steel', b.root, 'x');
}
function boxMagazine(b, z, depth, length, width = 0.028, material = 'dark') {
  const mag = b.assembly('magazine');
  b.box(0, -0.047 - length / 2, z, width, length, depth, material, mag, 0.003, [-0.08, 0, 0]);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      b.box(
        side * (width / 2 + 0.001),
        -0.05 - length / 2,
        z - depth / 3 + (i * depth) / 3,
        0.002,
        length * 0.72,
        0.003,
        'steel',
        mag,
      );
  b.box(0, -0.047 - length, z - 0.004, width + 0.007, 0.011, depth + 0.006, 'rubber', mag);
  return mag;
}

export function glock17(b) {
  b.m.slide.color.setHex(0x262c30);
  const slide = b.assembly('slide'),
    magazine = b.assembly('magazine');
  b.profile(
    [
      [-0.165, 0.006],
      [-0.165, -0.019],
      [-0.052, -0.027],
      [-0.024, -0.052],
      [0.011, -0.144],
      [0.058, -0.134],
      [0.033, -0.022],
      [0.046, 0.006],
    ],
    0.03,
    'polymer',
  );
  b.profile(
    [
      [-0.177, 0.01],
      [-0.177, 0.036],
      [-0.169, 0.043],
      [0.035, 0.043],
      [0.044, 0.034],
      [0.044, 0.01],
    ],
    0.027,
    'slide',
    slide,
  );
  b.tube(0, 0.024, -0.12, 0.006, 0.12);
  b.box(0.0145, 0.032, -0.025, 0.001, 0.017, 0.033, 'bore', slide);
  b.box(0, 0.044, -0.025, 0.019, 0.002, 0.031, 'steel', slide);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++)
      b.box(side * 0.0145, 0.027, 0.032 - i * 0.004, 0.0015, 0.025, 0.0016, 'dark', slide, 0.0003);
    b.box(side * 0.016, -0.088, 0.025, 0.002, 0.068, 0.033, 'rubber', b.root, 0.002, [0.24, 0, 0]);
  }
  b.box(-0.019, -0.008, 0.006, 0.006, 0.006, 0.024, 'steel');
  b.box(-0.018, -0.034, 0.006, 0.003, 0.009, 0.01, 'dark');
  b.triggerGuard(-0.041, -0.036);
  b.box(0, -0.143, 0.035, 0.034, 0.009, 0.042, 'rubber', magazine);
  b.box(0, -0.088, 0.023, 0.023, 0.102, 0.031, 'steel', magazine, 0.002, [0.22, 0, 0]);
  b.ironSights(0.029, -0.162, 0.054, slide);
  b.marking('GLOCK 17', '9 × 19', -0.015, 0.028, -0.09, 0.071, 0.014, -1, slide);
  b.hand('rightHand', 0.013, -0.075, 0.027);
  b.hand('supportHand', -0.027, -0.08, -0.003, true);
  b.muzzle(-0.185, 0.024);
  return meta(0.054, -0.185, {
    hip: [0.18, -0.17, -0.37],
    adsZ: -0.35,
    recoilScale: 0.6,
    inspect: [0.09, -0.075, -0.47],
  });
}

export function beretta92(b) {
  b.m.slide.color.setHex(0x343c42);
  const slide = b.assembly('slide'),
    mag = b.assembly('magazine');
  b.profile(
    [
      [-0.171, -0.001],
      [-0.163, -0.024],
      [-0.068, -0.03],
      [-0.025, -0.048],
      [0.001, -0.145],
      [0.052, -0.139],
      [0.036, -0.025],
      [0.059, -0.004],
    ],
    0.033,
    'steel',
  );
  // Open-top slide: the barrel remains exposed between the side rails.
  for (const side of [-1, 1]) {
    b.box(side * 0.0145, 0.017, -0.062, 0.007, 0.026, 0.222, 'slide', slide, 0.003);
    b.box(side * 0.019, -0.084, 0.023, 0.006, 0.085, 0.041, 'rubber', b.root, 0.004, [0.13, 0, 0]);
    for (const y of [-0.052, -0.115]) b.screw(side * 0.023, y, 0.019, side);
    for (let i = 0; i < 7; i++)
      b.box(side * 0.0187, 0.019, 0.043 - i * 0.0043, 0.0014, 0.025, 0.002, 'dark', slide, 0.0002);
    b.box(side * 0.023, 0.028, 0.031, 0.012, 0.007, 0.024, 'steel', slide, 0.002, [-0.2, 0, 0]);
  }
  b.box(0, 0.028, 0.02, 0.034, 0.027, 0.062, 'slide', slide);
  b.box(0, 0.027, -0.169, 0.033, 0.022, 0.015, 'slide', slide);
  b.tube(0, 0.023, -0.109, 0.0075, 0.16);
  b.cylinder(0, 0.025, -0.061, 0.009, 0.053, 'edge');
  const hammer = b.assembly('hammer');
  b.mesh(new THREE.TorusGeometry(0.01, 0.0034, 6, 16), 'steel', 0, 0.028, 0.064, hammer, [
    0,
    Math.PI / 2,
    0,
  ]);
  b.triggerGuard(-0.043, -0.038);
  b.box(-0.022, -0.009, -0.005, 0.006, 0.006, 0.04, 'steel');
  b.box(0, -0.147, 0.026, 0.037, 0.009, 0.046, 'dark', mag);
  b.box(0, -0.09, 0.017, 0.024, 0.101, 0.034, 'steel', mag, 0.002, [0.13, 0, 0]);
  b.ironSights(0.04, -0.164, 0.05, slide);
  b.marking('92FS', 'BERETTA / 9mm', -0.02, 0.016, -0.085, 0.07, 0.012, -1, slide);
  b.hand('rightHand', 0.013, -0.079, 0.024);
  b.hand('supportHand', -0.029, -0.079, -0.005, true);
  b.muzzle(-0.193, 0.023);
  return meta(0.05, -0.193, {
    hip: [0.18, -0.17, -0.37],
    adsZ: -0.35,
    recoilScale: 0.68,
    inspect: [0.09, -0.075, -0.48],
  });
}

export function mp5(b) {
  b.cylinder(0, 0.023, -0.058, 0.021, 0.31, 'steel');
  b.profile(
    [
      [-0.155, 0.018],
      [0.078, 0.018],
      [0.091, -0.025],
      [0.033, -0.051],
      [-0.099, -0.048],
      [-0.155, -0.029],
    ],
    0.039,
    'polymer',
  );
  b.profile(
    [
      [-0.306, 0.004],
      [-0.289, 0.022],
      [-0.164, 0.02],
      [-0.153, -0.036],
      [-0.291, -0.033],
    ],
    0.048,
    'polymer',
  );
  for (let i = 0; i < 8; i++) b.box(0, -0.012, -0.172 - i * 0.014, 0.05, 0.037, 0.0028, 'rubber');
  b.cylinder(0, 0.04, -0.23, 0.008, 0.18, 'dark');
  b.tube(0, 0.015, -0.326, 0.009, 0.055);
  for (const z of [-0.334, -0.344]) b.cylinder(0, 0.015, z, 0.012, 0.004, 'steel');
  ringSight(b, -0.298, 0.055);
  b.cylinder(0, 0.05, 0.053, 0.012, 0.025, 'steel', b.root, 'y');
  b.box(0, 0.045, 0.053, 0.027, 0.007, 0.026, 'dark');
  const bolt = b.assembly('bolt');
  b.cylinder(-0.034, 0.04, -0.274, 0.005, 0.035, 'steel', bolt, 'x');
  b.sphere(-0.053, 0.04, -0.274, 0.008, 0.007, 0.01, 'dark', bolt);
  for (const side of [-1, 1]) b.box(side * 0.023, 0.005, 0.145, 0.009, 0.012, 0.23, 'steel');
  b.box(0, -0.032, 0.255, 0.041, 0.115, 0.024, 'rubber', b.root, 0.007);
  grip(b, 0.04);
  const mag = b.assembly('magazine');
  b.profile(
    [
      [-0.119, -0.032],
      [-0.081, -0.032],
      [-0.077, -0.106],
      [-0.095, -0.194],
      [-0.132, -0.19],
      [-0.117, -0.103],
    ],
    0.022,
    'steel',
    mag,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 2; i++)
      b.box(
        side * 0.012,
        -0.119,
        -0.105 + i * 0.01,
        0.002,
        0.12,
        0.003,
        'dark',
        mag,
        0.0005,
        [-0.1, 0, 0],
      );
  b.box(0.022, 0.009, -0.029, 0.002, 0.015, 0.058, 'bore');
  b.marking('HK MP5', '9 × 19', -0.022, -0.009, -0.033, 0.069, 0.016);
  b.hand('supportHand', -0.01, -0.05, -0.229, true);
  b.muzzle(-0.357, 0.015);
  return meta(0.067, -0.357, { recoilScale: 0.58, inspect: [0.08, -0.08, -0.57] });
}

export function p90(b) {
  // Through-holes define the characteristic double thumbhole / trigger loop.
  cutProfile(
    b,
    [
      [-0.295, 0.022],
      [0.21, 0.022],
      [0.245, -0.008],
      [0.24, -0.128],
      [0.18, -0.147],
      [0.015, -0.139],
      [-0.062, -0.114],
      [-0.18, -0.144],
      [-0.265, -0.133],
      [-0.298, -0.086],
    ],
    [
      [
        [-0.243, -0.052],
        [-0.176, -0.043],
        [-0.142, -0.066],
        [-0.161, -0.106],
        [-0.239, -0.1],
      ],
      [
        [-0.095, -0.043],
        [-0.026, -0.042],
        [0.015, -0.071],
        [-0.005, -0.106],
        [-0.059, -0.097],
      ],
    ],
    0.054,
    'polymer',
  );
  b.box(0, -0.064, 0.241, 0.06, 0.125, 0.016, 'rubber', b.root, 0.006);
  for (const side of [-1, 1]) {
    b.box(side * 0.025, -0.068, 0.12, 0.012, 0.113, 0.184, 'polymer', b.root, 0.005);
    b.box(side * 0.028, -0.006, -0.045, 0.008, 0.017, 0.414, 'dark', b.root, 0.003);
    b.sphere(side * 0.027, -0.116, -0.21, 0.006, 0.015, 0.057, 'rubber');
    b.sphere(side * 0.026, -0.104, -0.101, 0.006, 0.034, 0.015, 'rubber');
    for (let i = 0; i < 5; i++)
      b.box(
        side * 0.033,
        -0.08,
        0.071 + i * 0.022,
        0.0015,
        0.052,
        0.003,
        'dark',
        b.root,
        0.0005,
        [0.2, 0, 0],
      );
  }
  b.box(0, -0.039, -0.008, 0.015, 0.03, 0.014, 'steel', b.root, 0.003, [-0.3, 0, 0]);
  b.m.magazineAmber = new THREE.MeshStandardMaterial({
    color: 0x97793c,
    metalness: 0.05,
    roughness: 0.25,
    transparent: true,
    opacity: 0.63,
    depthWrite: false,
  });
  const mag = b.assembly('magazine');
  for (let i = 0; i < 23; i++)
    b.cylinder(0, 0.044, 0.16 - i * 0.012, 0.0039, 0.034, 'brass', mag, 'x');
  b.box(0, 0.045, -0.006, 0.051, 0.032, 0.377, 'magazineAmber', mag, 0.006);
  for (const z of [0.18, -0.191]) b.box(0, 0.045, z, 0.055, 0.035, 0.019, 'dark', mag);
  b.cylinder(0, 0.045, -0.16, 0.023, 0.006, 'dark', mag, 'y');
  // High integral sight bridge keeps the horizontal magazine visible below.
  for (const side of [-1, 1]) b.box(side * 0.03, 0.071, -0.182, 0.012, 0.08, 0.06, 'polymer');
  b.box(0, 0.108, -0.182, 0.075, 0.017, 0.095, 'dark');
  scope(b, -0.143, -0.228, 0.109, 0.014);
  b.tube(0, 0.006, -0.313, 0.009, 0.053);
  for (const side of [-1, 1]) {
    b.box(side * 0.033, 0.022, -0.23, 0.012, 0.014, 0.035, 'steel');
    for (const z of [0.153, -0.265]) b.screw(side * 0.029, -0.041, z, side);
  }
  const bolt = b.assembly('bolt');
  b.box(-0.039, 0.023, -0.231, 0.015, 0.012, 0.025, 'dark', bolt);
  b.box(0, -0.144, 0.097, 0.025, 0.002, 0.045, 'bore');
  b.marking('FN P90', '5.7 × 28 / 50', -0.03, -0.028, 0.117, 0.075, 0.018);
  b.hand('rightHand', 0.011, -0.084, -0.03);
  b.hand('supportHand', -0.011, -0.091, -0.206, true);
  b.muzzle(-0.343, 0.006);
  return meta(0.109, -0.343, {
    recoilScale: 0.46,
    hip: [0.2, -0.205, -0.4],
    magazineMotion: [0, 0.135, 0.015],
    inspect: [0.07, -0.07, -0.6],
  });
}

export function scarh(b) {
  b.profile(
    [
      [-0.36, 0.049],
      [0.081, 0.049],
      [0.098, 0.026],
      [0.083, -0.032],
      [-0.335, -0.032],
      [-0.36, -0.013],
    ],
    0.049,
    'tan',
  );
  b.profile(
    [
      [-0.164, -0.027],
      [0.078, -0.027],
      [0.073, -0.063],
      [-0.035, -0.056],
      [-0.075, -0.078],
      [-0.15, -0.073],
    ],
    0.043,
    'polymer',
  );
  b.rail(-0.136, 0.054, 0.437);
  for (const side of [-1, 1]) {
    b.box(side * 0.026, 0.005, -0.27, 0.007, 0.015, 0.14, 'steel');
    for (let i = 0; i < 6; i++)
      b.box(side * 0.031, 0.007, -0.321 + i * 0.021, 0.004, 0.019, 0.008, 'dark');
    for (const z of [-0.18, -0.06, 0.069]) b.screw(side * 0.027, -0.01, z, side);
  }
  b.box(0.026, 0.025, -0.011, 0.002, 0.018, 0.089, 'bore');
  const bolt = b.assembly('bolt');
  b.box(-0.043, 0.026, -0.072, 0.04, 0.008, 0.014, 'steel', bolt);
  b.cylinder(0, 0.003, -0.428, 0.01, 0.17, 'steel');
  b.tube(0, 0.003, -0.512, 0.015, 0.055);
  b.box(0, 0.031, -0.382, 0.023, 0.051, 0.021, 'dark');
  b.ironSights(0.051, -0.38, 0.083, b.root, true);
  b.cylinder(0, 0.003, 0.099, 0.024, 0.017, 'dark');
  b.profile(
    [
      [0.106, 0.04],
      [0.24, 0.04],
      [0.31, 0.013],
      [0.317, -0.091],
      [0.27, -0.094],
      [0.201, -0.043],
      [0.106, -0.039],
    ],
    0.049,
    'tan',
  );
  b.box(0, 0.044, 0.199, 0.054, 0.026, 0.129, 'tan');
  b.box(0, -0.04, 0.315, 0.055, 0.123, 0.02, 'rubber', b.root, 0.005);
  b.box(-0.029, -0.028, 0.18, 0.004, 0.014, 0.052, 'dark');
  grip(b, 0.031);
  boxMagazine(b, -0.115, 0.073, 0.105, 0.033);
  b.hand('supportHand', -0.012, -0.064, -0.272, true);
  b.marking('FN SCAR-H', '7.62 × 51 / Mk17', -0.027, 0.026, -0.111, 0.11, 0.02);
  b.muzzle(-0.543, 0.003);
  return meta(0.083, -0.543, { recoilScale: 1.5, inspect: [0.07, -0.08, -0.72] });
}

export function aug(b) {
  b.m.tan.color.setHex(0x6b7950);
  cutProfile(
    b,
    [
      [-0.219, 0.026],
      [0.276, 0.026],
      [0.3, -0.002],
      [0.292, -0.12],
      [0.242, -0.13],
      [0.085, -0.094],
      [0.001, -0.129],
      [-0.09, -0.137],
      [-0.134, -0.11],
      [-0.143, -0.047],
      [-0.219, -0.029],
    ],
    [
      [
        [-0.103, -0.047],
        [-0.029, -0.042],
        [0.012, -0.061],
        [-0.017, -0.102],
        [-0.078, -0.106],
      ],
    ],
    0.052,
    'tan',
  );
  b.box(0, -0.051, 0.296, 0.058, 0.141, 0.014, 'rubber', b.root, 0.005);
  for (const side of [-1, 1]) {
    b.box(side * 0.025, -0.013, 0.16, 0.008, 0.042, 0.189, 'tan', b.root, 0.004);
    b.profile(
      [
        [0.286, -0.094],
        [0.231, -0.109],
        [0.08, -0.083],
        [0.073, -0.075],
        [0.232, -0.099],
        [0.286, -0.086],
      ],
      0.002,
      'dark',
    ).position.x = side * 0.028;
    b.box(side * 0.028, -0.036, 0.071, 0.008, 0.013, 0.013, 'steel');
    b.sphere(side * 0.026, -0.104, 0.017, 0.007, 0.03, 0.019, 'polymer');
  }
  b.cylinder(0, 0.023, -0.184, 0.018, 0.164, 'steel');
  b.cylinder(0, 0.023, -0.38, 0.008, 0.26, 'steel');
  b.tube(0, 0.023, -0.512, 0.012, 0.052);
  b.cylinder(-0.024, 0.026, -0.27, 0.007, 0.027, 'steel', b.root, 'x');
  b.box(0, -0.075, -0.252, 0.033, 0.119, 0.034, 'tan', b.root, 0.008, [-0.1, 0, 0]);
  for (let i = 0; i < 5; i++) b.box(0, -0.045 - i * 0.014, -0.252, 0.035, 0.003, 0.035, 'polymer');
  // Integral carry handle and cylindrical scope, instead of an AR-style rail.
  for (const z of [-0.13, 0.02]) b.box(0, 0.06, z, 0.031, 0.055, 0.032, 'steel', b.root, 0.004);
  b.box(0, 0.08, -0.059, 0.032, 0.016, 0.188, 'steel');
  scope(b, 0.061, -0.192, 0.099, 0.017);
  const bolt = b.assembly('bolt');
  b.box(-0.034, 0.034, -0.17, 0.03, 0.015, 0.02, 'polymer', bolt);
  b.box(0.028, -0.004, 0.161, 0.002, 0.024, 0.059, 'bore');
  b.m.magazineAmber = new THREE.MeshStandardMaterial({
    color: 0x68613b,
    roughness: 0.35,
    transparent: true,
    opacity: 0.77,
    depthWrite: false,
  });
  const mag = boxMagazine(b, 0.15, 0.065, 0.113, 0.029, 'magazineAmber');
  for (let i = 0; i < 9; i++) b.cylinder(0, -0.066 - i * 0.01, 0.149, 0.004, 0.046, 'brass', mag);
  for (const side of [-1, 1]) b.screw(side * 0.029, -0.034, 0.247, side);
  b.hand('rightHand', 0.013, -0.089, -0.002);
  b.hand('supportHand', -0.011, -0.083, -0.246, true);
  b.marking('STEYR AUG', '5.56 × 45', -0.03, -0.025, 0.15, 0.091, 0.018);
  b.muzzle(-0.541, 0.023);
  return meta(0.099, -0.541, {
    recoilScale: 0.85,
    inspect: [0.07, -0.07, -0.7],
    magazineMotion: [0, -0.17, 0.025],
  });
}

export function barrett(b) {
  const barrel = b.assembly('barrel');
  b.profile(
    [
      [-0.517, 0.047],
      [0.123, 0.047],
      [0.147, 0.022],
      [0.135, -0.047],
      [-0.491, -0.047],
      [-0.517, -0.022],
    ],
    0.061,
    'steel',
  );
  b.box(0, -0.047, -0.047, 0.056, 0.024, 0.282, 'dark');
  b.rail(-0.107, 0.053, 0.441, 0.043);
  // Ventilation ports along the long upper receiver.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      b.box(side * 0.032, 0.012, -0.479 + i * 0.031, 0.002, 0.035, 0.017, 'bore');
      b.box(side * 0.033, 0.031, -0.48 + i * 0.031, 0.002, 0.002, 0.017, 'edge');
    }
    for (const z of [-0.123, 0.09]) b.screw(side * 0.032, -0.023, z, side);
  }
  b.box(0.032, 0.004, -0.037, 0.002, 0.029, 0.129, 'bore');
  const bolt = b.assembly('bolt');
  b.cylinder(0.057, -0.004, 0.023, 0.006, 0.053, 'steel', bolt, 'x');
  b.sphere(0.084, -0.004, 0.023, 0.011, 0.009, 0.015, 'dark', bolt);
  b.cylinder(0, 0.002, -0.626, 0.014, 0.41, 'steel', barrel);
  for (const z of [-0.52, -0.545]) b.cylinder(0, 0.002, z, 0.019, 0.012, 'dark', barrel);
  // Two open side baffles and a central bore form the recognisable arrowhead brake.
  for (const y of [-0.024, 0.029])
    b.profile(
      [
        [-0.947, y - 0.004],
        [-0.939, y + 0.004],
        [-0.832, y + 0.004],
        [-0.818, y - 0.004],
      ],
      0.097,
      'steel',
      barrel,
    );
  for (const z of [-0.934, -0.881, -0.829])
    b.box(0, 0.002, z, 0.094, 0.045, 0.009, 'steel', barrel);
  b.tube(0, 0.002, -0.881, 0.015, 0.137, barrel);
  b.box(0, -0.024, 0.217, 0.05, 0.047, 0.2, 'steel');
  b.box(0, 0.019, 0.219, 0.057, 0.035, 0.142, 'polymer');
  b.box(0, -0.045, 0.322, 0.064, 0.142, 0.024, 'rubber', b.root, 0.006);
  grip(b, 0.055);
  boxMagazine(b, -0.11, 0.116, 0.126, 0.047);
  scope(b, 0.113, -0.255, 0.126, 0.029);
  for (const side of [-1, 1]) {
    b.cylinder(side * 0.047, -0.055, -0.46, 0.014, 0.013, 'steel', b.root, 'x');
    b.box(side * 0.054, -0.062, -0.571, 0.014, 0.018, 0.226, 'dark', b.root, 0.003, [0.08, 0, 0]);
    b.box(side * 0.054, -0.07, -0.683, 0.035, 0.011, 0.025, 'steel');
  }
  b.marking('BARRETT M82A1', '.50 BMG', -0.034, 0.006, -0.064, 0.13, 0.024);
  b.hand('supportHand', -0.017, -0.074, -0.357, true);
  b.muzzle(-0.955, 0.002);
  return meta(0.126, -0.955, {
    recoilScale: 2.5,
    hip: [0.225, -0.22, -0.47],
    adsZ: -0.47,
    inspect: [0.05, -0.07, -0.9],
    barrelRecoil: 0.024,
  });
}

export const REAL_WEAPON_MODELS = { glock17, beretta92, mp5, p90, scarh, aug, barrett };
export { meta, cutProfile, ringSight, grip, scope, boxMagazine };
