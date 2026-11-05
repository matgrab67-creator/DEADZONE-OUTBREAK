import { ZOMBIES, clamp } from './config.js';

export function emergenceProgress(z, time) {
  if (!Number.isFinite(z.emergeEnd) || !Number.isFinite(z.spawnAt)) return 1;
  if (time >= z.emergeEnd) return 1;
  return clamp((time - z.spawnAt) / Math.max(0.01, z.emergeEnd - z.spawnAt), 0, 1);
}
export function zombieVerticalOffset(z, time) {
  const t = emergenceProgress(z, time),
    ease = t * t * (3 - 2 * t);
  return (z.groundY || 0) + (z.y || 0) - ZOMBIES[z.type].height * 1.08 * (1 - ease);
}
