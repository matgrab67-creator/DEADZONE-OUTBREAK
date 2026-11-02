import { blocked } from './map.js';

// One reverse breadth-first field per target, cached until the next navigation tick.
export class Navigation {
  constructor(obs, radius = 0.43) {
    this.width = 54;
    this.height = 40;
    this.radius = radius;
    this.setObstacles(obs);
  }
  setObstacles(obs) {
    this.obs = obs;
    this.walkable = new Uint8Array(this.width * this.height);
    for (let z = 0; z < this.height; z++)
      for (let x = 0; x < this.width; x++)
        this.walkable[z * this.width + x] = !blocked(x - 26.5, z - 19.5, obs, this.radius);
    this.fields = new Map();
  }
  cell(x, z) {
    return (
      Math.max(0, Math.min(39, Math.floor(z + 20))) * 54 +
      Math.max(0, Math.min(53, Math.floor(x + 27)))
    );
  }
  field(target) {
    const start = this.cell(target.x, target.z);
    if (this.fields.has(start)) return this.fields.get(start);
    const cost = new Int16Array(2160).fill(-1),
      queue = new Int16Array(2160);
    let head = 0,
      tail = 1;
    queue[0] = start;
    cost[start] = 0;
    while (head < tail) {
      const cell = queue[head++],
        x = cell % 54,
        z = Math.floor(cell / 54);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          next = nz * 54 + nx;
        if (nx < 0 || nx >= 54 || nz < 0 || nz >= 40 || cost[next] !== -1 || !this.walkable[next])
          continue;
        cost[next] = cost[cell] + 1;
        queue[tail++] = next;
      }
    }
    this.fields.set(start, cost);
    return cost;
  }
  direction(entity, target) {
    const field = this.field(target),
      cell = this.cell(entity.x, entity.z);
    let best = cell,
      cost = field[cell] < 0 ? Infinity : field[cell];
    const x = cell % 54,
      z = Math.floor(cell / 54);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        n = nz * 54 + nx;
      if (nx >= 0 && nx < 54 && nz >= 0 && nz < 40 && field[n] >= 0 && field[n] < cost) {
        best = n;
        cost = field[n];
      }
    }
    if (best === cell && field[cell] > 1) return { x: 0, z: 0 };
    const tx = field[cell] <= 1 && field[cell] >= 0 ? target.x : (best % 54) - 26.5,
      tz = field[cell] <= 1 && field[cell] >= 0 ? target.z : Math.floor(best / 54) - 19.5;
    const dx = tx - entity.x,
      dz = tz - entity.z,
      len = Math.hypot(dx, dz) || 1;
    return { x: dx / len, z: dz / len };
  }
}
