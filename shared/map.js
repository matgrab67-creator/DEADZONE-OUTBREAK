export const SECTORS = [
  { id: 'courtyard', name: 'SPAWN COURTYARD', x: -18, z: 10, tint: 0x9abb98, number: '01' },
  { id: 'security', name: 'SECURITY CHECKPOINT', x: 0, z: 10, tint: 0xddb66c, number: '02' },
  { id: 'lab', name: 'RESEARCH LABORATORY', x: 18, z: 10, tint: 0x72cdd0, number: '03' },
  { id: 'tunnels', name: 'UNDERGROUND TUNNELS', x: -18, z: -10, tint: 0xd27650, number: '04' },
  { id: 'armory', name: 'ARMORY', x: 0, z: -10, tint: 0xabc88a, number: '05' },
  { id: 'reactor', name: 'REACTOR CHAMBER', x: 18, z: -10, tint: 0x7fc89d, number: '06' },
];
export const DOORS = [
  { id: 'd1', x: -9, z: 10, axis: 'x', a: 'courtyard', b: 'security', price: 750 },
  { id: 'd2', x: 9, z: 10, axis: 'x', a: 'security', b: 'lab', price: 1250 },
  { id: 'd3', x: -18, z: 0, axis: 'z', a: 'courtyard', b: 'tunnels', price: 1000 },
  { id: 'd4', x: 0, z: 0, axis: 'z', a: 'security', b: 'armory', price: 1500 },
  { id: 'd5', x: 9, z: -10, axis: 'x', a: 'armory', b: 'reactor', price: 2000 },
  { id: 'd6', x: 18, z: 0, axis: 'z', a: 'lab', b: 'reactor', price: 2000 },
];
export const STATIONS = [
  {
    id: 'ammo1',
    type: 'ammo',
    name: 'AMMUNITION',
    x: -24.8,
    z: 14,
    price: 250,
    sector: 'courtyard',
  },
  {
    id: 'raven',
    type: 'weapon',
    weapon: 'raven',
    name: 'RAVEN-47',
    x: -11.2,
    z: 17.5,
    price: 1000,
    sector: 'courtyard',
  },
  {
    id: 'repair1',
    type: 'repair',
    name: 'REPAIR BARRICADE',
    x: -24,
    z: 2.1,
    price: 0,
    sector: 'courtyard',
  },
  {
    id: 'vortex',
    type: 'weapon',
    weapon: 'vortex',
    name: 'VORTEX-9',
    x: -5,
    z: 17.7,
    price: 850,
    sector: 'security',
  },
  {
    id: 'heart',
    type: 'perk',
    perk: 'heart',
    name: 'IRON HEART',
    x: 5,
    z: 3,
    price: 1500,
    sector: 'security',
  },
  {
    id: 'armor',
    type: 'armor',
    name: 'ARMOR PLATES',
    x: 6.7,
    z: 16.5,
    price: 500,
    sector: 'security',
  },
  {
    id: 'spectre',
    type: 'weapon',
    weapon: 'spectre',
    name: 'M4-SPECTRE',
    x: 24.5,
    z: 17,
    price: 1600,
    sector: 'lab',
  },
  {
    id: 'hands',
    type: 'perk',
    perk: 'hands',
    name: 'QUICK HANDS',
    x: 24.8,
    z: 4,
    price: 1200,
    sector: 'lab',
  },
  {
    id: 'iron',
    type: 'weapon',
    weapon: 'iron',
    name: 'IRON-12',
    x: -24.8,
    z: -6,
    price: 1200,
    sector: 'tunnels',
  },
  {
    id: 'ghost',
    type: 'perk',
    perk: 'ghost',
    name: 'GHOST STEP',
    x: -12,
    z: -17,
    price: 1400,
    sector: 'tunnels',
  },
  {
    id: 'box',
    type: 'mystery',
    name: 'MYSTERY CACHE',
    x: -1,
    z: -16,
    price: 950,
    sector: 'armory',
  },
  {
    id: 'lynx',
    type: 'weapon',
    weapon: 'lynx',
    name: 'LYNX-50',
    x: 6.5,
    z: -5,
    price: 2200,
    sector: 'armory',
  },
  {
    id: 'deadeye',
    type: 'perk',
    perk: 'deadeye',
    name: 'DEADEYE',
    x: -6,
    z: -5,
    price: 1800,
    sector: 'armory',
  },
  {
    id: 'upgrade',
    type: 'upgrade',
    name: 'RESONANCE FORGE',
    x: 18,
    z: -16,
    price: 2500,
    sector: 'reactor',
  },
  {
    id: 'rapid',
    type: 'perk',
    perk: 'rapid',
    name: 'RAPID FIRE',
    x: 24.5,
    z: -5,
    price: 1800,
    sector: 'reactor',
  },
  { id: 'ammo2', type: 'ammo', name: 'AMMUNITION', x: 11, z: -15, price: 250, sector: 'reactor' },
];
export const COLLECTIBLES = [
  {
    id: 'log1',
    x: -12,
    z: 3,
    title: 'LOG 01 / THE ARRIVAL',
    text: 'Day 0. Six transport trucks. No manifests. We were told not to open the containers.',
  },
  {
    id: 'log2',
    x: 22,
    z: 13,
    title: 'LOG 02 / THE SIGNAL',
    text: 'The reactor is not powering the facility. The facility is feeding the reactor.',
  },
  {
    id: 'log3',
    x: 13,
    z: -3,
    title: 'LOG 03 / OUTBREAK',
    text: 'Containment failed at 03:17. If anyone finds this: do not follow the voices below Sector 06.',
  },
];
const box = (id, x, y, z, w, h, d, kind = 'wall') => ({ id, x, y, z, w, h, d, kind });
export const WALLS = [
  box('west', -27, 3, 0, 0.6, 6, 40),
  box('east', 27, 3, 0, 0.6, 6, 40),
  box('north', 0, 3, -20, 54, 6, 0.6),
  box('south', 0, 3, 20, 54, 6, 0.6),
];
for (const x of [-9, 9]) {
  for (const z of [-10, 10]) {
    const door = DOORS.find((d) => d.axis === 'x' && d.x === x && d.z === z);
    if (door) {
      WALLS.push(
        box(`wall${x}${z}a`, x, 3, z - 5.9, 0.5, 6, 8.2),
        box(`wall${x}${z}b`, x, 3, z + 5.9, 0.5, 6, 8.2),
        box(`lintel${x}${z}`, x, 4.7, z, 0.5, 2.6, 3.6),
      );
    } else WALLS.push(box(`wall${x}${z}`, x, 3, z, 0.5, 6, 20));
  }
}
for (const x of [-18, 0, 18])
  WALLS.push(
    box(`cross${x}a`, x - 5.4, 3, 0, 7.2, 6, 0.5),
    box(`cross${x}b`, x + 5.4, 3, 0, 7.2, 6, 0.5),
    box(`cross${x}top`, x, 4.7, 0, 3.6, 2.6, 0.5),
  );
export const PROPS = [
  box('container', -20, 1.3, 7, 4, 2.6, 3, 'container'),
  box('crate1', -13.4, 0.6, 13, 1.5, 1.2, 1.5, 'crate'),
  box('crate2', -15, 0.45, 4, 1.2, 0.9, 1.2, 'crate'),
  box('checkpoint', 0, 0.65, 8, 5, 1.3, 1.3, 'desk'),
  box('securityrack', 5.8, 1.2, 12, 1.5, 2.4, 3, 'server'),
  box('labtable1', 17.5, 0.8, 7, 5, 1.6, 1.5, 'lab'),
  box('labtable2', 20, 0.8, 14, 3, 1.6, 1.4, 'lab'),
  box('tunnelpipes', -19, 1.3, -10, 2.5, 2.6, 6, 'pipes'),
  box('armorycrate', 0, 0.7, -9, 3, 1.4, 2, 'crate'),
  box('reactorcore', 18, 1.8, -9, 3.2, 3.6, 3.2, 'reactor'),
];
export const doorBox = (d) =>
  box(d.id, d.x, 1.7, d.z, d.axis === 'x' ? 0.42 : 3.6, 3.4, d.axis === 'x' ? 3.6 : 0.42, 'door');
export const STATION_BOXES = STATIONS.map((s) =>
  box(
    s.id,
    s.x,
    s.type === 'perk' ? 1 : 0.55,
    s.z,
    ['weapon', 'mystery'].includes(s.type) ? 1.7 : 1,
    s.type === 'perk' ? 2 : 1.1,
    0.65,
    'metal',
  ),
);
export function obstacles(open = []) {
  return [
    ...WALLS,
    ...PROPS,
    ...STATION_BOXES,
    ...DOORS.filter((d) => !open.includes(d.id)).map(doorBox),
  ];
}
export function sectorAt(p) {
  return SECTORS.find((s) => Math.abs(p.x - s.x) <= 9 && Math.abs(p.z - s.z) <= 10) || SECTORS[0];
}
export function accessibleSectors(open) {
  const found = new Set(['courtyard']);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of DOORS)
      if (open.includes(d.id) && (found.has(d.a) || found.has(d.b))) {
        const old = found.size;
        found.add(d.a);
        found.add(d.b);
        changed ||= old !== found.size;
      }
  }
  return SECTORS.filter((s) => found.has(s.id));
}
export function blocked(x, z, obs, radius = 0.38) {
  return obs.some(
    (b) =>
      b.y - b.h / 2 < 1 &&
      Math.abs(x - b.x) < b.w / 2 + radius &&
      Math.abs(z - b.z) < b.d / 2 + radius,
  );
}
export function slide(entity, dx, dz, obs, radius = 0.38) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
  for (let i = 0; i < n; i++) {
    if (!blocked(entity.x + dx / n, entity.z, obs, radius)) entity.x += dx / n;
    if (!blocked(entity.x, entity.z + dz / n, obs, radius)) entity.z += dz / n;
  }
}
export function rayBox(origin, dir, b) {
  let near = 0,
    far = Infinity;
  for (const [a, size] of [
    ['x', 'w'],
    ['y', 'h'],
    ['z', 'd'],
  ]) {
    const lo = b[a] - b[size] / 2,
      hi = b[a] + b[size] / 2;
    if (Math.abs(dir[a]) < 0.000001) {
      if (origin[a] < lo || origin[a] > hi) return Infinity;
    } else {
      let t1 = (lo - origin[a]) / dir[a],
        t2 = (hi - origin[a]) / dir[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      near = Math.max(near, t1);
      far = Math.min(far, t2);
      if (near > far) return Infinity;
    }
  }
  return near;
}
export function raySphere(o, d, c, r) {
  const x = o.x - c.x,
    y = o.y - c.y,
    z = o.z - c.z;
  const b = x * d.x + y * d.y + z * d.z,
    v = b * b - (x * x + y * y + z * z - r * r);
  if (v < 0) return Infinity;
  const t = -b - Math.sqrt(v);
  return t >= 0 ? t : Infinity;
}
