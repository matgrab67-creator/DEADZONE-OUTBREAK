// Shared broad phase for forest navigation, hitscan and line of sight.
export function indexObstacles(boxes, cellSize = 6) {
  const cells = new Map();
  const range = (lo, hi) => [Math.floor(lo / cellSize), Math.floor(hi / cellSize)];
  for (const b of boxes) {
    const [x0, x1] = range(b.x - b.w / 2, b.x + b.w / 2),
      [z0, z1] = range(b.z - b.d / 2, b.z + b.d / 2);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const key = `${x}:${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(b);
      }
  }
  boxes.query = (x, z, radius = 1) => {
    const found = new Set();
    const [x0, x1] = range(x - radius, x + radius),
      [z0, z1] = range(z - radius, z + radius);
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++)
        for (const b of cells.get(`${ix}:${iz}`) || []) found.add(b);
    return [...found];
  };
  boxes.ray = (o, d, length) => {
    const found = new Set();
    for (let t = 0; t <= length + cellSize; t += cellSize * 0.7) {
      for (const b of boxes.query(
        o.x + d.x * Math.min(t, length),
        o.z + d.z * Math.min(t, length),
        cellSize * 0.55,
      ))
        found.add(b);
    }
    return [...found];
  };
  return boxes;
}
export const rayObstacles = (boxes, origin, direction, length) =>
  boxes.ray?.(origin, direction, length) || boxes;
