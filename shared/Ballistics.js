import { clamp, random, WEAPONS } from './config.js';

export const ACCURACY = {
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
  return { aim: cone, pellets: w.pellets > 1 ? 0.045 : 0 };
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
