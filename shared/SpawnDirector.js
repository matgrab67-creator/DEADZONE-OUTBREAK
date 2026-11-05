import { random } from './config.js';
import { blocked } from './map.js';

/** Stratified candidates, recent-area memory and actual navigation reachability. */
export class SpawnDirector {
  constructor(seed) {
    this.seed = seed;
    this.history = [];
  }
  reset() {
    this.history = [];
  }
  choose({ serial, sectors, players, zombies, obstacles, navigation, radius, time }) {
    if (!players.length) return null;
    const fields = players.map((p) => navigation.field(p));
    for (const minimumDistance of [6.5, 4.5, 2.8]) {
      let best = null,
        bestScore = -Infinity;
      for (let i = 0; i < 144; i++) {
        const seed = this.seed + serial * 997 + i * 131;
        const sector = sectors[(i + serial) % sectors.length];
        // Sampling across the whole floor prevents the old farthest-corner clustering.
        const x = sector.x + (random(seed + 17) - 0.5) * 15.2;
        const z = sector.z + (random(seed + 31) - 0.5) * 17.2;
        if (blocked(x, z, obstacles, radius + 0.12)) continue;
        const cell = navigation.cell(x, z);
        if (!fields.some((field) => field[cell] >= 0)) continue;
        const nearest = Math.min(...players.map((p) => Math.hypot(p.x - x, p.z - z)));
        if (nearest < minimumDistance) continue;
        if (
          zombies.some(
            (zombie) => Math.hypot(zombie.x - x, zombie.z - z) < radius + zombie.radius + 0.7,
          )
        )
          continue;
        const recent = this.history.slice(-16);
        const spacing = Math.min(12, ...recent.map((p) => Math.hypot(p.x - x, p.z - z)));
        if (minimumDistance === 6.5 && spacing < 2.8) continue;
        const visits = this.history.filter((p) => Math.hypot(p.x - x, p.z - z) < 4.2).length;
        const score =
          random(seed + 71) * 5 + spacing * 0.65 - visits * 2 + Math.min(nearest, 11) * 0.08;
        if (score > bestScore) {
          bestScore = score;
          best = { x, z };
        }
      }
      if (best) {
        this.history.push({ ...best, time });
        if (this.history.length > 48) this.history.shift();
        return best;
      }
    }
    return null; // Retry later instead of spawning inside a wall at a fixed fallback point.
  }
}
