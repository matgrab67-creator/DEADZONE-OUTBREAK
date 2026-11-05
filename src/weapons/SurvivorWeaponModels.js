import * as THREE from 'three';
import { meta, grip, scope, boxMagazine, ringSight, cutProfile } from './RealWeaponModels.js';

function handgun(b, id) {
  const classic = id === 'm1911',
    cz = id === 'cz75',
    slide = b.assembly('slide'),
    mag = b.assembly('magazine');
  const length = classic ? 0.225 : 0.205,
    y = cz ? 0.03 : 0.04;
  b.profile(
    [
      [-length + 0.04, 0.008],
      [-length + 0.04, -0.02],
      [-0.055, -0.034],
      [-0.02, -0.15],
      [0.04, -0.145],
      [0.028, -0.02],
      [0.038, 0.008],
    ],
    0.034,
    'steel',
  );
  b.profile(
    [
      [-length + 0.025, 0.008],
      [-length + 0.025, y],
      [-length + 0.04, y + 0.013],
      [0.035, y + 0.013],
      [0.045, y],
      [0.045, 0.008],
    ],
    0.032,
    'slide',
    slide,
  );
  b.tube(0, 0.023, -length * 0.5, 0.007, length * 0.83);
  b.box(0.018, 0.03, -0.065, 0.002, 0.018, 0.045, 'dark', slide);
  for (const side of [-1, 1]) {
    b.profile(
      [
        [-0.018, -0.043],
        [0.019, -0.042],
        [0.039, -0.134],
        [0.004, -0.142],
      ],
      0.003,
      classic ? 'wood' : 'rubber',
      b.root,
    ).position.x = side * 0.018;
    for (let i = 0; i < 7; i++)
      b.box(side * 0.017, 0.027, 0.03 - i * 0.004, 0.002, 0.025, 0.0018, 'dark', slide);
    for (const gy of [-0.065, -0.117]) b.screw(side * 0.021, gy, 0.014, side);
  }
  b.triggerGuard(-0.058, -0.045);
  b.box(0, -0.1, 0.012, 0.024, 0.085, 0.034, 'dark', mag);
  b.box(0, -0.15, 0.025, 0.035, 0.009, 0.046, 'steel', mag);
  b.box(0, 0.03, 0.052, 0.013, 0.023, 0.016, 'steel');
  b.box(-0.022, -0.012, 0.008, 0.006, 0.01, 0.025, 'dark');
  b.ironSights(0.031, -length + 0.04, y + 0.024, slide);
  b.hand('rightHand', 0.014, -0.08, 0.025);
  b.hand('supportHand', -0.025, -0.08, 0, true);
  b.marking(
    classic ? 'COLT M1911A1' : cz ? 'CZ 75 B' : 'SIG P226',
    classic ? '.45 ACP' : '9x19',
    -0.018,
    0.028,
    -0.09,
    0.075,
    0.014,
    -1,
    slide,
  );
  b.muzzle(-length + 0.016, 0.023);
  return meta(y + 0.024, 0, {
    hip: [0.2, -0.18, -0.39],
    adsZ: -0.36,
    inspect: [0.08, -0.075, -0.53],
    recoilScale: classic ? 1.05 : 0.8,
  });
}
function smg(b, vector) {
  const z = vector ? -0.11 : -0.09;
  if (vector) {
    b.profile(
      [
        [-0.26, 0.07],
        [-0.26, -0.045],
        [-0.15, -0.08],
        [-0.115, -0.19],
        [0.015, -0.19],
        [0.045, -0.08],
        [0.06, 0.075],
      ],
      0.065,
      'polymer',
    );
    b.box(0, -0.12, -0.07, 0.07, 0.16, 0.12, 'steel');
    boxMagazine(b, -0.16, 0.04, 0.18, 0.031);
  } else {
    b.box(0, 0.035, -0.07, 0.055, 0.09, 0.23, 'steel');
    b.box(0, -0.01, -0.13, 0.045, 0.04, 0.1, 'polymer');
    boxMagazine(b, 0.005, 0.035, 0.19, 0.027);
  }
  grip(b, 0.025);
  b.tube(0, 0.028, vector ? -0.315 : -0.235, 0.01, vector ? 0.12 : 0.13);
  b.rail(-0.1, 0.091, 0.21, 0.034);
  const bolt = b.assembly('bolt');
  b.box(0.035, 0.04, -0.035, 0.018, 0.012, 0.045, 'dark', bolt);
  b.box(0, 0.105, -0.045, 0.022, 0.025, 0.025, 'steel', bolt);
  for (const side of [-1, 1]) {
    b.box(side * 0.028, -0.015, 0.15, 0.012, 0.02, 0.22, 'steel', b.root, 0.003, [
      0,
      0,
      side * 0.1,
    ]);
    b.box(side * 0.035, -0.045, 0.25, 0.013, 0.09, 0.025, 'dark');
  }
  b.box(0, -0.03, 0.265, 0.063, 0.12, 0.018, 'rubber');
  b.ironSights(0.025, vector ? -0.25 : -0.16, 0.115);
  b.hand('supportHand', -0.023, -0.065, z - 0.04, true);
  b.muzzle(vector ? -0.38 : -0.3, 0.028);
  b.marking(vector ? 'KRISS VECTOR' : 'IWI UZI PRO', '.45 / 9mm', -0.035, 0.043, -0.09, 0.09, 0.02);
  return meta(0.115, 0, {
    hip: [0.2, -0.2, -0.43],
    adsZ: -0.39,
    inspect: [0.07, -0.07, -0.65],
    recoilScale: vector ? 0.65 : 0.9,
  });
}
function shotgun(b, benelli) {
  b.profile(
    [
      [-0.19, 0.026],
      [-0.19, -0.045],
      [0.07, -0.056],
      [0.1, -0.02],
      [0.07, 0.035],
    ],
    0.048,
    'steel',
  );
  b.cylinder(0, 0.018, -0.38, 0.014, 0.44, 'steel');
  b.tube(0, 0.018, -0.605, 0.015, 0.06);
  b.cylinder(0, -0.034, -0.355, 0.014, 0.42, 'dark');
  const pump = benelli ? b.root : b.assembly('pump');
  b.box(0, -0.025, -0.28, 0.059, 0.065, 0.18, benelli ? 'polymer' : 'wood', pump, 0.006);
  for (let i = 0; i < 9; i++)
    b.box(0, -0.024, -0.36 + i * 0.017, 0.062, 0.071, 0.003, 'dark', pump);
  const bolt = b.assembly('bolt');
  b.box(0.025, 0.01, -0.06, 0.003, 0.028, 0.09, 'dark', bolt);
  b.cylinder(0.04, 0.012, -0.045, 0.007, 0.035, 'steel', bolt, 'x');
  if (benelli) {
    grip(b, 0.035);
    b.cylinder(0, -0.015, 0.15, 0.014, 0.23, 'steel');
    b.box(0, -0.05, 0.265, 0.062, 0.13, 0.025, 'rubber');
    b.rail(-0.04, 0.047, 0.15, 0.03);
  } else
    b.profile(
      [
        [0.06, -0.03],
        [0.06, -0.075],
        [0.18, -0.105],
        [0.28, -0.11],
        [0.3, -0.06],
        [0.16, -0.016],
      ],
      0.045,
      'wood',
    );
  if (!benelli) {
    b.triggerGuard(-0.07, 0.045);
    b.hand('rightHand', 0.012, -0.075, 0.07);
  }
  b.hand('supportHand', -0.02, -0.078, -0.28, true);
  b.ironSights(0.055, -0.58, 0.06);
  b.muzzle(-0.64, 0.018);
  b.marking(benelli ? 'BENELLI M4' : 'REMINGTON 870', '12 GA', -0.026, 0.01, -0.08, 0.11, 0.018);
  return meta(0.06, 0, {
    hip: [0.21, -0.2, -0.45],
    adsZ: -0.43,
    inspect: [0.08, -0.08, -0.78],
    recoilScale: 1.7,
    reloadStyle: 'shells',
  });
}
function rifle(b, id) {
  const fal = id === 'fal',
    sniper = id === 'axmc',
    g36 = id === 'g36';
  const muzzle = sniper ? -0.88 : fal ? -0.79 : -0.58;
  b.profile(
    [
      [-0.3, 0.045],
      [-0.3, -0.035],
      [-0.12, -0.055],
      [0.06, -0.036],
      [0.08, 0.04],
    ],
    sniper ? 0.065 : 0.055,
    'steel',
  );
  grip(b, 0.025);
  boxMagazine(
    b,
    -0.14,
    sniper ? 0.085 : 0.065,
    sniper ? 0.095 : 0.15,
    sniper ? 0.047 : 0.034,
    g36 ? 'tan' : 'dark',
  );
  if (g36) {
    cutProfile(
      b,
      [
        [0.045, 0.062],
        [0.035, 0.14],
        [-0.27, 0.14],
        [-0.29, 0.065],
      ],
      [
        [
          [0.007, 0.082],
          [0.005, 0.116],
          [-0.24, 0.116],
          [-0.245, 0.082],
        ],
      ],
      0.027,
      'polymer',
    );
    cutProfile(
      b,
      [
        [0.075, 0.02],
        [0.3, 0.015],
        [0.31, -0.1],
        [0.23, -0.11],
        [0.1, -0.03],
      ],
      [
        [
          [0.12, -0.005],
          [0.265, -0.01],
          [0.27, -0.065],
          [0.23, -0.065],
        ],
      ],
      0.037,
      'polymer',
    );
    b.box(0, 0.005, -0.37, 0.055, 0.065, 0.2, 'polymer');
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++)
        b.box(side * 0.029, 0.015, -0.43 + i * 0.037, 0.002, 0.021, 0.021, 'dark');
    b.ironSights(0.015, -0.46, 0.158);
  } else if (fal) {
    b.box(0, -0.018, 0.18, 0.052, 0.09, 0.23, 'polymer', b.root, 0.005, [0.05, 0, 0]);
    b.box(0, -0.03, 0.3, 0.057, 0.13, 0.02, 'rubber');
    b.profile(
      [
        [-0.28, 0.015],
        [-0.29, -0.05],
        [-0.61, -0.025],
        [-0.6, 0.015],
      ],
      0.05,
      'polymer',
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++)
        b.box(side * 0.026, -0.004, -0.34 - i * 0.037, 0.003, 0.014, 0.015, 'dark');
    b.cylinder(0, 0.037, -0.54, 0.008, 0.41, 'steel');
    b.ironSights(0.02, -0.65, 0.068);
  } else {
    cutProfile(
      b,
      [
        [0.07, 0.04],
        [0.32, 0.04],
        [0.32, -0.11],
        [0.2, -0.11],
        [0.15, -0.035],
      ],
      [
        [
          [0.18, 0.015],
          [0.29, 0.015],
          [0.29, -0.07],
          [0.22, -0.07],
        ],
      ],
      0.06,
      'tan',
    );
    b.box(0, -0.003, -0.38, 0.055, 0.07, 0.29, 'tan');
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++)
        b.box(side * 0.029, 0.003, -0.27 - i * 0.045, 0.002, 0.022, 0.022, 'dark');
    scope(b, 0.085, -0.24, 0.13, 0.029);
    const bolt = b.assembly('bolt');
    b.cylinder(0.042, 0.015, -0.01, 0.006, 0.075, 'steel', bolt, 'x');
    b.sphere(0.081, -0.008, -0.01, 0.014, 0.014, 0.014, 'dark', bolt);
  }
  b.tube(0, 0.019, (muzzle - 0.45) / 2, 0.012, Math.abs(muzzle + 0.45));
  b.tube(0, 0.019, muzzle, 0.017, 0.055);
  b.hand('supportHand', -0.022, -0.075, -0.32, true);
  b.muzzle(muzzle - 0.04, 0.019);
  b.marking(
    sniper ? 'AI AXMC' : fal ? 'FN FAL' : 'HK G36C',
    sniper ? '.338 LM' : fal ? '7.62 NATO' : '5.56 NATO',
    -0.03,
    0.022,
    -0.12,
    0.12,
    0.019,
  );
  return meta(sniper ? 0.13 : g36 ? 0.158 : 0.068, 0, {
    hip: [0.22, -0.21, -0.46],
    adsZ: -0.44,
    inspect: [0.065, -0.07, sniper ? -0.91 : -0.8],
    recoilScale: sniper ? 2.2 : fal ? 1.4 : 0.95,
    reloadStyle: sniper ? 'bolt' : 'magazine',
  });
}
export const SURVIVOR_WEAPON_MODELS = {
  m1911: (b) => handgun(b, 'm1911'),
  p226: (b) => handgun(b, 'p226'),
  cz75: (b) => handgun(b, 'cz75'),
  uzi: (b) => smg(b, false),
  vector: (b) => smg(b, true),
  benelli: (b) => shotgun(b, true),
  r870: (b) => shotgun(b, false),
  fal: (b) => rifle(b, 'fal'),
  g36: (b) => rifle(b, 'g36'),
  axmc: (b) => rifle(b, 'axmc'),
};
