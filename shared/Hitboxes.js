import { ZOMBIES } from './config.js';
import { zombieVerticalOffset } from './ZombieLifecycle.js';

export function zombieHitboxes(z, time = Infinity) {
  const h = ZOMBIES[z.type].height * (z.finalBoss ? 1.35 : 1),
    sin = Math.sin(z.yaw || 0),
    cos = Math.cos(z.yaw || 0);
  const offset = Number.isFinite(time) ? zombieVerticalOffset(z, time) : z.y || 0;
  const centre = (y, forward = 0) => ({
    x: z.x - sin * forward,
    y: y + offset,
    z: z.z - cos * forward,
  });
  if (z.type === 'crawler')
    return [
      ['head', centre(0.595, 0.38), 0.15],
      ['body', centre(0.4, -0.015), 0.25],
      ['limb', centre(0.23, -0.35), 0.21],
    ];
  return [
    ['head', centre(h * 0.89, h * 0.02), h * 0.115],
    ['body', centre(h * 0.62), h * 0.2],
    ['limb', centre(h * 0.25), h * 0.19],
  ];
}
