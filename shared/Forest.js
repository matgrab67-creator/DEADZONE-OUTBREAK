import { SPECIAL_WEAPONS, BLUEPRINT_ANCHORS } from './WeaponProgression.js';
import { CAMP_STRUCTURES } from './CampSystems.js';
// Pure, versioned world data. No Three.js, DOM or client random state.
export const FOREST_VERSION = 2;
export const CHUNK_SIZE = 24;
export const MAX_FOREST_RING = 8;
export const CAMP = { x: 0, z: 0, w: 54, d: 40 };
export const forestChapterDefinition = (number) => ({
  name: ['THE LOST FOREST', 'WHISPERING PINES', 'THE HOLLOW WOODS'][(Math.max(1, number) - 1) % 3],
  subtitle: 'Wyprawa trwa. Obóz i odkryte miejsca pozostają na swoim miejscu.',
});
export const chunkKey = (x, z) => `${x}:${z}`;
export function forestRandom(seed, x, z, salt = 0) {
  let h =
    (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 1442695041)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
export function forestNoise(seed, x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = smooth(x - ix),
    v = smooth(z - iz);
  const a = forestRandom(seed, ix, iz),
    b = forestRandom(seed, ix + 1, iz);
  const c = forestRandom(seed, ix, iz + 1),
    d = forestRandom(seed, ix + 1, iz + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
export function forestRing(wave = 1) {
  if (wave < 4) return 1;
  if (wave < 7) return 2;
  if (wave < 11) return 3;
  if (wave < 16) return 4;
  return Math.min(MAX_FOREST_RING, 5 + Math.floor((wave - 16) / 5));
}
export const forestBounds = (ring) => {
  const edge = (ring + 0.5) * CHUNK_SIZE;
  return { minX: -edge, maxX: edge, minZ: -edge, maxZ: edge, cellSize: 1.5 };
};
export const inCamp = (x, z, margin = 0) => Math.abs(x) < 27 + margin && Math.abs(z) < 20 + margin;
export function pathDistance(x, z) {
  // Broad cardinal paths connect every region; narrower trails connect POIs.
  return Math.min(Math.abs(x), Math.abs(z), Math.abs(x - z) * 0.707);
}
export function terrainHeight(seed, x, z) {
  const edge = Math.max(Math.abs(x) - 29, Math.abs(z) - 22, 0);
  return smooth(Math.min(1, edge / 12)) * (0.08 + forestNoise(seed, x / 19, z / 19) * 0.42);
}
export function terrainMesh(seed, cx, cz, divisions = 12) {
  const vertices = [],
    indices = [];
  for (let z = 0; z <= divisions; z++)
    for (let x = 0; x <= divisions; x++) {
      const wx = cx * CHUNK_SIZE - 12 + (x / divisions) * CHUNK_SIZE;
      const wz = cz * CHUNK_SIZE - 12 + (z / divisions) * CHUNK_SIZE;
      vertices.push(wx, terrainHeight(seed, wx, wz), wz);
      if (x < divisions && z < divisions) {
        const i = z * (divisions + 1) + x,
          n = i + divisions + 1;
        indices.push(i, n, i + 1, i + 1, n, n + 1);
      }
    }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
export const forestBox = (id, x, y, z, w, h, d, kind = 'wood') => ({ id, x, y, z, w, h, d, kind });
export const CAMP_DEFENSES = [
  { id: 'def-n', x: 0, z: -20, axis: 'z', name: 'PÓŁNOCNA BARYKADA' },
  { id: 'def-s', x: 0, z: 20, axis: 'z', name: 'POŁUDNIOWA BARYKADA' },
  { id: 'def-w', x: -27, z: 0, axis: 'x', name: 'ZACHODNIA BARYKADA' },
  { id: 'def-e', x: 27, z: 0, axis: 'x', name: 'WSCHODNIA BARYKADA' },
];
export const initialDefenses = () =>
  CAMP_DEFENSES.map((d) => ({ ...d, hp: 300, maxHp: 300, level: 1 }));
export function campObstacles() {
  const boxes = [];
  for (const x of [-27, 27])
    for (const z of [-11.5, 11.5])
      boxes.push(forestBox(`camp-wall-${x}-${z}`, x, 1.55, z, 0.65, 3.1, 17));
  for (const z of [-20, 20])
    for (const x of [-15, 15])
      boxes.push(forestBox(`camp-wall-${x}-${z}`, x, 1.55, z, 24, 3.1, 0.65));
  // Solid proxies agree with the rendered shelters, wrecks and storage.
  boxes.push(forestBox('camp-shelter', -20, 1.1, 7, 4, 2.2, 3));
  boxes.push(forestBox('camp-wreck', 0, 0.7, 8, 4.5, 1.4, 1.7, 'metal'));
  boxes.push(forestBox('camp-stock', 0, 0.6, -9, 3, 1.2, 2));
  for (const s of CAMP_STRUCTURES)
    boxes.push(forestBox(`camp-${s.id}`, s.x, s.h / 2, s.z, s.w, s.h, s.d));
  return boxes;
}
export function generateForestChunk(seed, cx, cz) {
  const key = chunkKey(cx, cz),
    trees = [],
    rocks = [],
    grass = [],
    props = [],
    obstacles = [];
  const rng = (n) => forestRandom(seed, cx, cz, n);
  const center = { x: cx * 24, z: cz * 24 };
  const outside = !inCamp(center.x, center.z, 14);
  const poiType = ['cabin', 'camp', 'wreck', 'tower', 'ruins'][Math.floor(rng(500) * 5)];
  const guaranteed = BLUEPRINT_ANCHORS[key];
  const poi =
    guaranteed || (outside && rng(501) < 0.56)
      ? { ...center, id: `poi:${key}`, type: guaranteed === 'barrett' ? 'cabin' : poiType }
      : null;
  const excluded = (x, z, margin = 0) =>
    inCamp(x, z, 2) ||
    pathDistance(x, z) < 3 + margin ||
    (poi && Math.abs(x - poi.x) < 6 + margin && Math.abs(z - poi.z) < 6 + margin);
  for (let i = 0; i < 42; i++) {
    const x = center.x + (rng(i * 7 + 1) - 0.5) * 23,
      z = center.z + (rng(i * 7 + 2) - 0.5) * 23;
    if (excluded(x, z, 0.4) || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
    const h = 7 + rng(i * 7 + 3) * 9,
      radius = 0.22 + rng(i * 7 + 4) * 0.24;
    const tree = {
      x,
      z,
      y: terrainHeight(seed, x, z),
      h,
      radius,
      angle: rng(i * 7 + 5) * 6.28,
      old: rng(i * 7 + 6) > 0.78,
    };
    trees.push(tree);
    obstacles.push(
      forestBox(`tree:${key}:${i}`, x, tree.y + 2.5, z, radius * 2, 5, radius * 2, 'bark'),
    );
  }
  for (let i = 0; i < 6; i++) {
    const x = center.x + (rng(700 + i * 3) - 0.5) * 22,
      z = center.z + (rng(701 + i * 3) - 0.5) * 22;
    if (excluded(x, z, 1)) continue;
    const r = 0.55 + rng(702 + i * 3) * 1.1,
      y = terrainHeight(seed, x, z);
    rocks.push({ x, z, y, r, angle: rng(850 + i) * 6 });
    obstacles.push(
      forestBox(`rock:${key}:${i}`, x, y + r * 0.45, z, r * 1.5, r * 0.9, r * 1.4, 'stone'),
    );
  }
  for (let i = 0; i < 135; i++) {
    const x = center.x + (rng(1000 + i * 3) - 0.5) * 24,
      z = center.z + (rng(1001 + i * 3) - 0.5) * 24;
    if (excluded(x, z, -0.6)) continue;
    grass.push({
      x,
      z,
      y: terrainHeight(seed, x, z),
      h: 0.3 + rng(1002 + i * 3) * 0.65,
      angle: rng(1600 + i) * 6,
    });
  }
  if (poi?.type === 'cabin' || poi?.type === 'ruins') {
    const { x, z } = poi,
      y = terrainHeight(seed, x, z);
    for (const dx of [-3.5, 3.5])
      obstacles.push(forestBox(`${poi.id}:side${dx}`, x + dx, y + 1.4, z, 0.24, 2.8, 7));
    obstacles.push(forestBox(`${poi.id}:back`, x, y + 1.4, z - 3.5, 7, 2.8, 0.24));
    for (const dx of [-2.5, 2.5])
      obstacles.push(forestBox(`${poi.id}:front${dx}`, x + dx, y + 1.4, z + 3.5, 2, 2.8, 0.24));
    props.push({ ...poi, y });
  } else if (poi) {
    const y = terrainHeight(seed, poi.x, poi.z);
    props.push({ ...poi, y });
    if (poi.type === 'wreck')
      obstacles.push(forestBox(`${poi.id}:wreck`, poi.x, y + 0.7, poi.z, 4.5, 1.4, 1.7, 'metal'));
    if (poi.type === 'camp')
      for (const dx of [-2.4, 2.4])
        obstacles.push(
          forestBox(`${poi.id}:tent${dx}`, poi.x + dx, y + 0.7, poi.z, 2, 1.4, 2.5, 'cloth'),
        );
    if (poi.type === 'tower')
      for (const dx of [-1, 1])
        for (const dz of [-1, 1])
          obstacles.push(
            forestBox(`${poi.id}:post${dx}:${dz}`, poi.x + dx, y + 2.4, poi.z + dz, 0.2, 4.8, 0.2),
          );
  }
  const fallen =
    trees.length > 5 ? { x: trees[2].x + 1, z: trees[2].z + 1.3, y: trees[2].y } : null;
  if (fallen)
    obstacles.push(
      forestBox(`log:${key}`, fallen.x, fallen.y + 0.24, fallen.z, 4, 0.42, 0.48, 'bark'),
    );
  const cache = poi
    ? {
        id: `cache:${key}`,
        type: 'cache',
        name: 'UKRYTE ZAPASY',
        x:
          poi.x +
          (poi.type === 'camp' ? 0 : poi.type === 'wreck' ? 3.5 : poi.type === 'tower' ? 2.2 : 1.8),
        z:
          poi.z +
          (poi.type === 'camp' ? 2.5 : poi.type === 'wreck' ? 2 : poi.type === 'tower' ? 2.4 : 1),
        price: 0,
        blueprint:
          guaranteed ||
          (Math.max(Math.abs(cx), Math.abs(cz)) >= 4 && rng(1801) > 0.65
            ? 'barrett'
            : SPECIAL_WEAPONS[Math.floor(rng(1802) * (SPECIAL_WEAPONS.length - 1))]),
      }
    : null;
  return { key, cx, cz, trees, rocks, grass, props, obstacles, cache, poi, fallen };
}
export class ForestWorld {
  constructor(seed = 1973, ring = 1) {
    this.seed = seed;
    this.ring = ring;
    this.chunks = new Map();
    this.ensure(ring);
  }
  ensure(ring) {
    this.ring = Math.min(MAX_FOREST_RING, Math.max(this.ring, ring));
    for (let z = -this.ring; z <= this.ring; z++)
      for (let x = -this.ring; x <= this.ring; x++) {
        const key = chunkKey(x, z);
        if (!this.chunks.has(key)) this.chunks.set(key, generateForestChunk(this.seed, x, z));
      }
  }
  routes(open = []) {
    return [...this.chunks.values()]
      .filter((c) => c.poi?.type === 'cabin' && !open.includes(`route:${c.key}`))
      .map((c) => ({
        id: `route:${c.key}`,
        type: 'route',
        name: 'ZAMKNIĘTA CHATA / USUŃ BARYKADĘ',
        x: c.poi.x,
        z: c.poi.z + 3.5,
        price: 0,
      }));
  }
  obstacles(defenses = [], open = []) {
    const edge = (this.ring + 0.5) * 24;
    return [
      ...campObstacles(),
      ...[...this.chunks.values()].flatMap((c) => c.obstacles),
      ...this.routes(open).map((d) =>
        forestBox(d.id, d.x, terrainHeight(this.seed, d.x, d.z) + 1.2, d.z, 3, 2.4, 0.22),
      ),
      ...defenses
        .filter((d) => d.hp > 0)
        .map((d) =>
          forestBox(
            d.id,
            d.x,
            0.58,
            d.z,
            d.axis === 'z' ? 4.5 : 0.28,
            1.16,
            d.axis === 'x' ? 4.5 : 0.28,
          ),
        ),
      ...[-1, 1].flatMap((s) => [
        forestBox(`forest-edge-x${s}`, s * edge, 25, 0, 0.4, 50, edge * 2 + 1, 'boundary'),
        forestBox(`forest-edge-z${s}`, 0, 25, s * edge, edge * 2 + 1, 50, 0.4, 'boundary'),
      ]),
    ];
  }
  caches(claimed = []) {
    const used = new Set(claimed);
    return [...this.chunks.values()].map((c) => c.cache).filter((c) => c && !used.has(c.id));
  }
  snapshot(claimed, defenses, revision, routes = []) {
    return {
      version: FOREST_VERSION,
      seed: this.seed,
      ring: this.ring,
      revision,
      claimed: [...claimed],
      routes: [...routes],
      defenses: defenses.map((d) => ({ ...d })),
    };
  }
}
export function forestWeather(seed, time) {
  const phase = ((time + 95) % 480) / 480;
  const daylight = Math.max(0.08, Math.sin(phase * Math.PI * 2) * 0.5 + 0.48);
  const stormPeriod = Math.floor(time / 150),
    wet = forestRandom(seed, stormPeriod, 0, 81) > 0.55;
  const envelope = Math.min(1, (time % 150) / 12, (150 - (time % 150)) / 12);
  const rain = wet ? Math.max(0, envelope) : 0;
  const thunder = rain > 0.8 && time % 19 > 18.7;
  return { daylight, rain, thunder, phase, wind: 0.5 + rain * 0.6 };
}
