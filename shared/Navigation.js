import { blocked } from './map.js';

// Reverse flow fields share one path search among infected chasing a player.
export class Navigation {
  constructor(obs, radius = 0.43, bounds = null) {
    this.radius = radius;
    this.setObstacles(obs, bounds);
  }
  setObstacles(obs, bounds = this.bounds || null) {
    this.bounds = bounds || { minX: -27, maxX: 27, minZ: -20, maxZ: 20, cellSize: 1 };
    this.size = this.bounds.cellSize || 1;
    this.width = Math.ceil((this.bounds.maxX - this.bounds.minX) / this.size);
    this.height = Math.ceil((this.bounds.maxZ - this.bounds.minZ) / this.size);
    this.obs = obs;
    this.walkable = new Uint8Array(this.width * this.height);
    for (let z = 0; z < this.height; z++)
      for (let x = 0; x < this.width; x++)
        this.walkable[z * this.width + x] = !blocked(
          this.worldX(x),
          this.worldZ(z),
          obs,
          this.radius,
        );
    this.fields = new Map();
    // Cell centres can lie on opposite sides of a narrow trunk. Only connect
    // cells when the whole swept capsule can actually travel between them.
    this.edges = new Uint8Array(this.walkable.length);
    for (let z = 0; z < this.height; z++)
      for (let x = 0; x < this.width; x++) {
        const cell = z * this.width + x;
        if (!this.walkable[cell]) continue;
        for (const [dx, dz, bit, reverse] of [
          [1, 0, 1, 2],
          [0, 1, 4, 8],
        ]) {
          const nx = x + dx,
            nz = z + dz,
            next = nz * this.width + nx;
          if (nx >= this.width || nz >= this.height || !this.walkable[next]) continue;
          if (
            !this.clearSegment(
              { x: this.worldX(x), z: this.worldZ(z) },
              { x: this.worldX(nx), z: this.worldZ(nz) },
            )
          )
            continue;
          this.edges[cell] |= bit;
          this.edges[next] |= reverse;
        }
      }
  }
  clearSegment(a, b) {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.22));
    for (let i = 1; i <= count; i++)
      if (
        blocked(
          a.x + ((b.x - a.x) * i) / count,
          a.z + ((b.z - a.z) * i) / count,
          this.obs,
          this.radius,
        )
      )
        return false;
    return true;
  }
  worldX(x) {
    return this.bounds.minX + (x + 0.5) * this.size;
  }
  worldZ(z) {
    return this.bounds.minZ + (z + 0.5) * this.size;
  }
  cell(x, z) {
    return (
      Math.max(0, Math.min(this.height - 1, Math.floor((z - this.bounds.minZ) / this.size))) *
        this.width +
      Math.max(0, Math.min(this.width - 1, Math.floor((x - this.bounds.minX) / this.size)))
    );
  }
  field(target) {
    let start = this.cell(target.x, target.z);
    if (!this.walkable[start]) {
      let nearest = Infinity;
      const sx = start % this.width,
        sz = Math.floor(start / this.width);
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++) {
          const x = sx + dx,
            z = sz + dz,
            n = z * this.width + x;
          if (
            x >= 0 &&
            x < this.width &&
            z >= 0 &&
            z < this.height &&
            this.walkable[n] &&
            dx * dx + dz * dz < nearest
          ) {
            nearest = dx * dx + dz * dz;
            start = n;
          }
        }
    }
    if (this.fields.has(start)) return this.fields.get(start);
    const count = this.width * this.height,
      cost = new Int32Array(count).fill(-1),
      queue = new Int32Array(count);
    let head = 0,
      tail = 1;
    queue[0] = start;
    cost[start] = 0;
    while (head < tail) {
      const cell = queue[head++],
        x = cell % this.width,
        z = Math.floor(cell / this.width);
      for (const [dx, dz, bit] of [
        [1, 0, 1],
        [-1, 0, 2],
        [0, 1, 4],
        [0, -1, 8],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          next = nz * this.width + nx;
        if (
          nx < 0 ||
          nx >= this.width ||
          nz < 0 ||
          nz >= this.height ||
          cost[next] !== -1 ||
          !this.walkable[next] ||
          !(this.edges[cell] & bit)
        )
          continue;
        cost[next] = cost[cell] + 1;
        queue[tail++] = next;
      }
    }
    if (this.fields.size >= 12) this.fields.delete(this.fields.keys().next().value);
    this.fields.set(start, cost);
    return cost;
  }
  direction(entity, target) {
    const field = this.field(target),
      cell = this.cell(entity.x, entity.z);
    let best = cell,
      cost = field[cell] < 0 ? Infinity : field[cell];
    const x = cell % this.width,
      z = Math.floor(cell / this.width);
    const neighbors =
      this.size > 1
        ? [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ]
        : [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
    for (const [dx, dz] of neighbors) {
      const nx = x + dx,
        nz = z + dz,
        n = nz * this.width + nx;
      let clear = true;
      if (this.size > 1)
        for (let t = 0.2; t <= 1; t += 0.2)
          if (
            blocked(
              entity.x + (this.worldX(nx) - entity.x) * t,
              entity.z + (this.worldZ(nz) - entity.z) * t,
              this.obs,
              this.radius,
            )
          ) {
            clear = false;
            break;
          }
      if (
        clear &&
        nx >= 0 &&
        nx < this.width &&
        nz >= 0 &&
        nz < this.height &&
        field[n] >= 0 &&
        field[n] < cost
      ) {
        best = n;
        cost = field[n];
      }
    }
    if (best === cell && field[cell] > 1) return { x: 0, z: 0 };
    const tx = field[cell] <= 1 && field[cell] >= 0 ? target.x : this.worldX(best % this.width);
    const tz =
      field[cell] <= 1 && field[cell] >= 0 ? target.z : this.worldZ(Math.floor(best / this.width));
    const dx = tx - entity.x,
      dz = tz - entity.z,
      len = Math.hypot(dx, dz) || 1;
    return { x: dx / len, z: dz / len };
  }
  escapeRoute(entity, target) {
    // A small, temporary fine grid gets a displaced enemy around a trunk or
    // corner and reconnects it to the shared route without moving it instantly.
    const size = 29,
      middle = 14,
      step = 0.5,
      start = middle * size + middle;
    const queue = [start],
      previous = new Int32Array(size * size).fill(-2);
    previous[start] = -1;
    const field = this.field(target),
      initial = field[this.cell(entity.x, entity.z)];
    const position = (n) => ({
      x: entity.x + ((n % size) - middle) * step,
      z: entity.z + (Math.floor(n / size) - middle) * step,
    });
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head],
        p = position(cell),
        cost = field[this.cell(p.x, p.z)];
      const coarse = this.cell(p.x, p.z);
      if (
        head > 3 &&
        cost >= 0 &&
        this.clearSegment(p, {
          x: this.worldX(coarse % this.width),
          z: this.worldZ(Math.floor(coarse / this.width)),
        }) &&
        (initial < 0 ||
          cost < initial ||
          (initial <= 1 &&
            Math.hypot(p.x - target.x, p.z - target.z) <
              Math.hypot(entity.x - target.x, entity.z - target.z) - 0.6))
      ) {
        const route = [];
        for (let n = cell; n !== start; n = previous[n]) route.push(position(n));
        return route.reverse();
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const x = (cell % size) + dx,
          z = Math.floor(cell / size) + dz,
          next = z * size + x;
        if (x < 0 || x >= size || z < 0 || z >= size || previous[next] !== -2) continue;
        const destination = position(next);
        if (!this.clearSegment(p, destination)) continue;
        previous[next] = cell;
        queue.push(next);
      }
    }
    return [];
  }
}
