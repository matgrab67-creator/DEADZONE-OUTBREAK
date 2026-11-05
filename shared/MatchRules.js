export const FLASHLIGHT_BATTERY_SECONDS = 120;
export const MAX_SPARE_BATTERIES = 3;
export const CAMPFIRE = Object.freeze({ x: -6, z: 3, radius: 5 });
export const LANTERN = Object.freeze({
  price: 350,
  radius: 6,
  duration: 180,
  carry: 2,
  worldLimit: 4,
});
export const waveIntermission = (clearedRound) => Math.min(55, 20 + Math.max(1, clearedRound) * 5);
