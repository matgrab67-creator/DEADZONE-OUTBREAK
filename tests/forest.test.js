import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation, blankInput } from '../shared/Simulation.js';
import {
  ForestWorld,
  forestRing,
  terrainMesh,
  terrainHeight,
  generateForestChunk,
  inCamp,
  pathDistance,
  MAX_FOREST_RING,
} from '../shared/Forest.js';
import { blocked, rayBox } from '../shared/map.js';
import { indexObstacles, rayObstacles } from '../shared/SpatialIndex.js';
import { WORKBENCH } from '../shared/Survival.js';
import { WEAPONS, makeInventory } from '../shared/config.js';
import { spreadFor } from '../shared/Ballistics.js';

before(async () => await initPhysics());
function setup(t, seed = 12873) {
  const sim = new Simulation({ seed, forest: true }),
    p = sim.addPlayer('p');
  sim.countdown = 10000;
  t.after(() => sim.dispose());
  return { sim, p };
}
test('forest data is seeded, persistent, bounded, seamless and leaves roads / buildings clear', () => {
  const a = new ForestWorld(821),
    b = new ForestWorld(821),
    other = new ForestWorld(12);
  assert.deepEqual([...a.chunks], [...b.chunks]);
  assert.notDeepEqual([...a.chunks], [...other.chunks]);
  const initial = structuredClone(a.chunks.get('1:0'));
  a.ensure(forestRing(16));
  assert.deepEqual(a.chunks.get('1:0'), initial);
  assert.deepEqual([1, 4, 7, 11, 16, 21, 31, 10000].map(forestRing), [1, 2, 3, 4, 5, 6, 8, 8]);
  a.ensure(10000);
  assert.equal(a.chunks.size, (MAX_FOREST_RING * 2 + 1) ** 2);
  for (const c of a.chunks.values())
    for (const tree of c.trees) {
      assert.equal(inCamp(tree.x, tree.z, 2), false);
      assert.ok(pathDistance(tree.x, tree.z) >= 3.4);
      if (c.poi) assert.ok(Math.abs(tree.x - c.poi.x) >= 6.4 || Math.abs(tree.z - c.poi.z) >= 6.4);
    }
  const left = terrainMesh(821, 2, 1),
    right = terrainMesh(821, 3, 1);
  for (let row = 0; row <= 12; row++)
    for (let axis = 0; axis < 3; axis++)
      assert.equal(left.vertices[(row * 13 + 12) * 3 + axis], right.vertices[row * 13 * 3 + axis]);
});
test('forest broad phase never loses ray or point collisions', () => {
  const boxes = indexObstacles(new ForestWorld(821, 3).obstacles());
  for (let i = 0; i < 150; i++) {
    const origin = { x: Math.sin(i * 2.1) * 70, y: 1, z: Math.cos(i * 3.4) * 70 },
      dir = { x: Math.sin(i), y: 0, z: Math.cos(i) },
      len = 35;
    const full = Math.min(len, ...boxes.map((b) => rayBox(origin, dir, b))),
      fast = Math.min(
        len,
        ...rayObstacles(boxes, origin, dir, len).map((b) => rayBox(origin, dir, b)),
      );
    assert.equal(fast, full);
    assert.equal(
      blocked(origin.x, origin.z, boxes, 0.7),
      blocked(origin.x, origin.z, [...boxes], 0.7),
    );
  }
});
test('expansion moves actual collision, retains old trees and chapter 15 keeps the camp / routes / skins', (t) => {
  const { sim, p } = setup(t);
  const oldCollider = sim.physics.statics.get('camp-shelter'),
    oldTrees = structuredClone(sim.forest.chunks.get('1:0').trees);
  sim.expandForest(4);
  assert.equal(sim.forest.ring, 2);
  assert.equal(sim.physics.statics.get('forest-edge-x1').translation().x, 60);
  assert.equal(sim.physics.statics.get('camp-shelter'), oldCollider);
  assert.deepEqual(sim.forest.chunks.get('1:0').trees, oldTrees);
  sim.claimedCaches.push('cache:2:0');
  sim.openDoors.push('route:2:0');
  p.skins = { raven: 'sovereign' };
  p.inventory = [makeInventory('barrett')];
  p.perks = ['hands'];
  p.x = 8;
  p.z = 13;
  sim.round = 15;
  sim.phase = 'wave';
  sim.toSpawn = 0;
  sim.zombies.clear();
  sim.updateWaves(1 / 60);
  assert.equal(sim.chapter, 2);
  assert.equal(sim.forest.ring, 5);
  assert.equal(sim.phase, 'chapter');
  assert.deepEqual([p.x, p.z], [8, 13]);
  assert.deepEqual(sim.claimedCaches, ['cache:2:0']);
  assert.deepEqual(sim.openDoors, ['route:2:0']);
  assert.equal(p.inventory[0].id, 'barrett');
  assert.equal(p.skins.raven, 'sovereign');
  assert.deepEqual(p.perks, ['hands']);
  assert.equal(sim.physics.statics.get('camp-shelter'), oldCollider);
});
test('crafting validates distance, recipes, resource prices and applies compatible weapon effects', (t) => {
  const { sim, p } = setup(t);
  p.resources = { wood: 30, scrap: 40, parts: 30, medicine: 20 };
  const resources = structuredClone(p.resources);
  assert.equal(sim.action(p.id, { type: 'craft', recipe: 'magazine', cost: 0 }), false);
  assert.deepEqual(p.resources, resources);
  p.x = WORKBENCH.x;
  p.z = WORKBENCH.z + 1.5;
  for (const recipe of ['magazine', 'handling', 'optic', 'medkit'])
    assert.ok(sim.action(p.id, { type: 'craft', recipe }));
  const inv = p.inventory[0];
  assert.equal(sim.capacity(inv), 17);
  assert.equal(p.equipment.medkit, 2);
  inv.upgraded = true;
  assert.equal(sim.capacity(inv), 26);
  const before = structuredClone(p.resources);
  assert.equal(sim.action(p.id, { type: 'craft', recipe: 'magazine' }), false);
  assert.deepEqual(p.resources, before);
  p.vx = p.vz = 0;
  p.aimAlpha = 1;
  const cone = spreadFor(p, { ads: true }, sim.time).aim;
  inv.handling = inv.optic = false;
  assert.ok(cone < spreadFor(p, { ads: true }, sim.time).aim);
  inv.ammo = 0;
  inv.handling = true;
  sim.action(p.id, { type: 'reload' });
  assert.equal(p.reloadEnd - sim.time, WEAPONS.vx9.reload * 0.9);
});
test('zombies damage real barricades, destroying removes collision; repairs and reinforcement cost wood', (t) => {
  const { sim, p } = setup(t);
  p.x = 0;
  p.z = -15;
  const z = sim.spawnZombie('normal');
  assert.ok(z);
  Object.assign(z, { x: 0, z: -22, emergeEnd: 0 });
  sim.time = 3;
  sim.updateZombies(1 / 60);
  assert.ok(sim.defenses[0].hp < 300);
  const defense = sim.defenses[0];
  defense.hp = 1;
  sim.time += 2;
  sim.updateZombies(1 / 60);
  assert.equal(defense.hp, 0);
  assert.equal(sim.physics.statics.has(defense.id), false);
  p.x = 0;
  p.z = -18.3;
  p.resources.wood = 10;
  assert.equal(sim.nearest(p).type, 'defense');
  assert.ok(sim.interact(p));
  assert.equal(defense.hp, 150);
  assert.equal(p.resources.wood, 8);
  assert.ok(sim.physics.statics.has(defense.id));
  sim.time += 1;
  sim.interact(p);
  sim.time += 1;
  sim.interact(p);
  assert.equal(defense.maxHp, 600);
  assert.equal(defense.level, 2);
  assert.equal(p.resources.wood, 4);
});
test('shared caches cannot be farmed, cabin routes stay open, and terrain has physical support', (t) => {
  const { sim, p } = setup(t);
  sim.expandForest(7);
  const route = sim.forest.routes()[0];
  assert.ok(route);
  p.x = route.x;
  p.z = route.z + 1.6;
  const before = structuredClone(p.resources);
  assert.equal(sim.nearest(p).type, 'route');
  assert.ok(sim.interact(p));
  assert.ok(sim.openDoors.includes(route.id));
  assert.equal(sim.physics.statics.has(route.id), false);
  assert.equal(p.resources.wood, before.wood - 3);
  const c = sim.forest.caches()[0];
  p.x = c.x;
  p.z = c.z + 1.4;
  sim.time += 1;
  // Open this cabin too if the first cache belongs to a different route.
  const associated = sim.forest.routes().find((r) => Math.hypot(r.x - c.x, r.z - c.z) < 5);
  if (associated) {
    p.x = associated.x;
    p.z = associated.z + 1.6;
    sim.interact(p);
    sim.time += 1;
    p.x = c.x;
    p.z = c.z + 1.4;
  }
  assert.equal(sim.nearest(p).type, 'cache');
  assert.ok(sim.interact(p));
  assert.ok(sim.claimedCaches.includes(c.id));
  const peer = sim.addPlayer('peer');
  peer.x = p.x;
  peer.z = p.z;
  assert.notEqual(sim.nearest(peer)?.id, c.id);
  p.x = 0;
  p.z = 44;
  p.y = 1;
  p.vx = p.vz = 0;
  for (let i = 0; i < 100; i++) {
    sim.physics.move(p, blankInput(), 1 / 60);
    sim.physics.step();
  }
  assert.ok(Math.abs(p.y - terrainHeight(sim.seed, p.x, p.z)) < 0.08, `terrain feet ${p.y}`);
});
test('forest spawns are reachable, distant, varied, outside camp and never in an unobstructed view cone', (t) => {
  const { sim, p } = setup(t);
  const positions = [];
  for (let i = 0; i < 25; i++) {
    const z = sim.spawnZombie('normal');
    assert.ok(z, `spawn ${i}`);
    assert.equal(inCamp(z.x, z.z, 1), false);
    assert.ok(Math.hypot(z.x - p.x, z.z - p.z) >= 14);
    assert.equal(blocked(z.x, z.z, sim.obs, 0.6), false);
    assert.ok(sim.nav.field(p)[sim.nav.cell(z.x, z.z)] >= 0);
    positions.push([z.x, z.z]);
    sim.zombies.clear();
  }
  assert.equal(new Set(positions.map((p) => p.join(','))).size, 25);
});
test('survival equipment consumes server inventory, traps stop enemies, medkits heal and fire hurts zombies', (t) => {
  const { sim, p } = setup(t);
  p.hp = 30;
  assert.ok(sim.action(p.id, { type: 'equipment', item: 'medkit' }));
  assert.equal(p.hp, 95);
  assert.equal(p.equipment.medkit, 0);
  sim.time += 1;
  p.x = -18;
  p.z = 15;
  assert.ok(sim.action(p.id, { type: 'equipment', item: 'trap' }));
  assert.equal(sim.traps.length, 1);
  const trap = sim.traps[0],
    z = sim.spawnZombie('brute');
  Object.assign(z, { x: trap.x, z: trap.z, emergeEnd: 0 });
  sim.time += 2;
  sim.updateTraps();
  assert.equal(sim.traps.length, 0);
  assert.ok(z.trappedUntil > sim.time);
  const hp = z.hp;
  sim.addHazard(z, 'fire', 2, 7, 4);
  sim.hazards.at(-1).owner = p.id;
  sim.time += 1;
  sim.updateHazards(1 / 60);
  assert.ok(z.hp < hp);
  const snap = sim.snapshot();
  snap.forest.defenses[0].hp = 0;
  snap.players[0].resources.wood = 999;
  assert.equal(sim.defenses[0].hp, 300);
  assert.equal(p.resources.wood, 8);
});
