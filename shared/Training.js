import { forestBox } from './Forest.js';
export const TRAINING_DRILLS = {
  static: 'PRECYZJA / STAŁE CELE',
  tracking: 'TRACKING / CELE W RUCHU',
  reaction: 'REFLEKS / ZMIANA CELU',
};
export function trainingObstacles(world) {
  return [
    ...world.obstacles([]).filter((b) => !b.id.startsWith('camp-')),
    forestBox('range-backstop', 0, 2, -16, 40, 4, 0.5),
    forestBox('range-side-w', -20, 1.3, 0, 0.3, 2.6, 32),
    forestBox('range-side-e', 20, 1.3, 0, 0.3, 2.6, 32),
    forestBox('range-cover-w', -13, 0.5, 7, 2, 1, 1),
    forestBox('range-cover-e', 13, 0.5, 7, 2, 1, 1),
  ];
}
export function trainingStats(time = 0, drill = 'static') {
  return {
    drill,
    shots: 0,
    hits: 0,
    headshots: 0,
    kills: 0,
    startedAt: time,
    endAt: time + 60,
    finished: false,
    nextSpawn: time,
  };
}
