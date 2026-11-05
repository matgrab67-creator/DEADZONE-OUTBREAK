import { forestRandom, forestBounds, inCamp } from './Forest.js';
import { blocked, rayBox } from './map.js';
import { rayObstacles } from './SpatialIndex.js';

export function chooseForestSpawn(sim, serial, radius) {
  const players = [...sim.players.values()].filter((p) => !p.downed && !p.eliminated);
  if (!players.length) return null;
  const nav = radius > 0.43 ? sim.bossNav : sim.nav,
    bounds = forestBounds(sim.forest.ring);
  for (let attempt = 0; attempt < 180; attempt++) {
    const p = players[attempt % players.length];
    const angle = forestRandom(sim.seed, serial, attempt, 25) * Math.PI * 2;
    const r = 18 + forestRandom(sim.seed, serial, attempt, 26) * 15;
    const x = p.x + Math.cos(angle) * r,
      z = p.z + Math.sin(angle) * r;
    if (
      x < bounds.minX + 2 ||
      x > bounds.maxX - 2 ||
      z < bounds.minZ + 2 ||
      z > bounds.maxZ - 2 ||
      inCamp(x, z, 1)
    )
      continue;
    if (blocked(x, z, sim.obs, radius + 0.2)) continue;
    if (players.some((o) => Math.hypot(o.x - x, o.z - z) < 14)) continue;
    if ([...sim.zombies.values()].some((o) => Math.hypot(o.x - x, o.z - z) < radius + 1)) continue;
    if (sim.spawnDirector.history.slice(-12).some((o) => Math.hypot(o.x - x, o.z - z) < 3))
      continue;
    if (!players.some((o) => nav.field(o)[nav.cell(x, z)] >= 0)) continue;
    // Camera cone rejection for every player. Hidden by a tree / cabin is permitted.
    const visible = players.some((o) => {
      const dx = x - o.x,
        dz = z - o.z,
        len = Math.hypot(dx, dz);
      if ((dx * -Math.sin(o.yaw) + dz * -Math.cos(o.yaw)) / len < 0.45) return false;
      const origin = { x: o.x, y: 1.3, z: o.z },
        dir = { x: dx / len, y: 0, z: dz / len };
      return !rayObstacles(sim.obs, origin, dir, len).some((b) => rayBox(origin, dir, b) < len);
    });
    if (visible) continue;
    const point = { x, z, time: sim.time };
    sim.spawnDirector.history.push(point);
    if (sim.spawnDirector.history.length > 48) sim.spawnDirector.history.shift();
    return { x, z };
  }
  return null;
}
