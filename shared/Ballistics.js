import { clamp, random, WEAPONS } from './config.js';

export const ACCURACY = {
  m1911: { ads: 0.23, perShot: 0.004, max: 0.018, recovery: 0.045, delay: 0.12, aimTime: 0.16 },
  p226: { ads: 0.22, perShot: 0.0027, max: 0.016, recovery: 0.047, delay: 0.1, aimTime: 0.14 },
  cz75: { ads: 0.2, perShot: 0.0025, max: 0.015, recovery: 0.05, delay: 0.1, aimTime: 0.15 },
  uzi: { ads: 0.28, perShot: 0.0019, max: 0.025, recovery: 0.055, delay: 0.1, aimTime: 0.14 },
  vector: { ads: 0.24, perShot: 0.0012, max: 0.02, recovery: 0.06, delay: 0.09, aimTime: 0.16 },
  benelli: { ads: 0.6, perShot: 0.008, max: 0.035, recovery: 0.055, delay: 0.12, aimTime: 0.24 },
  r870: { ads: 0.6, perShot: 0.007, max: 0.025, recovery: 0.06, delay: 0.15, aimTime: 0.25 },
  fal: { ads: 0.18, perShot: 0.004, max: 0.038, recovery: 0.035, delay: 0.16, aimTime: 0.27 },
  g36: { ads: 0.2, perShot: 0.0018, max: 0.024, recovery: 0.044, delay: 0.12, aimTime: 0.19 },
  axmc: { ads: 0.02, perShot: 0.019, max: 0.045, recovery: 0.06, delay: 0.3, aimTime: 0.38 },
  glock17: { ads: 0.24, perShot: 0.0026, max: 0.014, recovery: 0.045, delay: 0.1, aimTime: 0.13 },
  beretta92: { ads: 0.22, perShot: 0.0028, max: 0.015, recovery: 0.043, delay: 0.1, aimTime: 0.15 },
  mp5: { ads: 0.25, perShot: 0.0016, max: 0.021, recovery: 0.055, delay: 0.1, aimTime: 0.15 },
  p90: { ads: 0.3, perShot: 0.0009, max: 0.012, recovery: 0.06, delay: 0.08, aimTime: 0.14 },
  scarh: { ads: 0.18, perShot: 0.0035, max: 0.033, recovery: 0.036, delay: 0.17, aimTime: 0.26 },
  aug: { ads: 0.12, perShot: 0.0017, max: 0.02, recovery: 0.04, delay: 0.13, aimTime: 0.22 },
  barrett: { ads: 0.018, perShot: 0.023, max: 0.05, recovery: 0.055, delay: 0.32, aimTime: 0.44 },
  vx9: { ads: 0.25, perShot: 0.003, max: 0.014, recovery: 0.04, delay: 0.1, aimTime: 0.14 },
  desertEagle: {
    ads: 0.48,
    perShot: 0.009,
    max: 0.045,
    recovery: 0.055,
    delay: 0.18,
    aimTime: 0.24,
  },
  tec9: { ads: 0.28, perShot: 0.002, max: 0.02, recovery: 0.04, delay: 0.1, aimTime: 0.16 },
  raven: { ads: 0.24, perShot: 0.0022, max: 0.022, recovery: 0.032, delay: 0.14, aimTime: 0.2 },
  spectre: { ads: 0.2, perShot: 0.0015, max: 0.016, recovery: 0.04, delay: 0.13, aimTime: 0.18 },
  vortex: { ads: 0.32, perShot: 0.0018, max: 0.025, recovery: 0.055, delay: 0.1, aimTime: 0.14 },
  iron: { ads: 0.6, perShot: 0.005, max: 0.012, recovery: 0.08, delay: 0.14, aimTime: 0.23 },
  lynx: { ads: 0.025, perShot: 0.014, max: 0.03, recovery: 0.06, delay: 0.24, aimTime: 0.32 },
  scout: { ads: 0.035, perShot: 0.01, max: 0.028, recovery: 0.065, delay: 0.2, aimTime: 0.26 },
  pbs1: { ads: 0.07, perShot: 0.001, max: 0.012, recovery: 0.05, delay: 0.13, aimTime: 0.2 },
};

export function recoveredBloom(inv, time) {
  const profile = ACCURACY[inv.id];
  return Math.max(
    0,
    (inv.bloom || 0) -
      Math.max(0, time - (inv.lastShot ?? -100) - profile.delay) * profile.recovery,
  );
}
export function spreadFor(player, input, time) {
  const inv = player.inventory[player.slot],
    w = WEAPONS[inv.id],
    a = ACCURACY[inv.id];
  const aim = clamp(player.aimAlpha ?? (input.ads ? 1 : 0), 0, 1),
    adsScale = 1 - (1 - a.ads) * aim;
  const movement = clamp(Math.hypot(player.vx || 0, player.vz || 0) / 4.6, 0, 1.5);
  const base = (w.pellets > 1 ? 0.006 : w.spread) * adsScale;
  const cone =
    (base +
      movement * w.moveSpread * (1 - aim * 0.22) +
      (player.grounded ? 0 : 0.055) +
      recoveredBloom(inv, time) * (1 - aim * 0.4)) *
    (player.crouch && !player.sliding ? 0.72 : 1);
  return {
    aim: cone * (inv.handling ? 0.88 : 1) * (inv.optic ? 1 - aim * 0.12 : 1),
    pellets: w.pellets > 1 ? 0.045 : 0,
  };
}
export function recordShot(inv, time) {
  const a = ACCURACY[inv.id];
  inv.bloom = Math.min(a.max, recoveredBloom(inv, time) + a.perShot);
  inv.lastShot = time;
}
export function forwardDirection(yaw, pitch) {
  const c = Math.cos(pitch);
  return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c };
}

/** Uniform circular cone, including a stable basis when looking almost vertically. */
export function sampleCone(direction, angle, seed) {
  const length = Math.hypot(direction.x, direction.z) || 1;
  const right = { x: -direction.z / length, y: 0, z: direction.x / length };
  const up = {
    x: -right.z * direction.y,
    y: right.z * direction.x - right.x * direction.z,
    z: right.x * direction.y,
  };
  const radius = Math.sqrt(random(seed)) * Math.tan(angle),
    theta = random(seed + 7) * Math.PI * 2;
  const u = Math.cos(theta) * radius,
    v = Math.sin(theta) * radius;
  const x = direction.x + right.x * u + up.x * v,
    y = direction.y + up.y * v,
    z = direction.z + right.z * u + up.z * v;
  const magnitude = Math.hypot(x, y, z);
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}
