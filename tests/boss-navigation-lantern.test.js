import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation } from '../shared/Simulation.js';
import { Navigation } from '../shared/Navigation.js';
import { indexObstacles } from '../shared/SpatialIndex.js';
import { blocked } from '../shared/map.js';
import { distance } from '../shared/config.js';
import { LANTERN } from '../shared/MatchRules.js';

before(async () => await initPhysics());
const enemy = (type = 'normal', x = 0, z = -2) => ({
  id: type,
  type,
  x,
  z,
  hp: 100,
  maxHp: 100,
  groundY: 0,
  emergeEnd: 0,
  approachAngle: 0,
  approachRadius: 0.6,
  approachSide: 0,
  phase: 1,
  windup: 0,
  lastAttack: -100,
  lastSpecial: -100,
  hitAt: -100,
  contributors: {},
});
function testWorld(t, boxes = []) {
  const s = new Simulation({ forest: true });
  t.after(() => s.dispose());
  const p = s.addPlayer('p');
  s.obs = indexObstacles(boxes);
  s.defenses = [];
  const bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12, cellSize: 1.5 };
  s.nav = new Navigation(s.obs, 0.43, bounds);
  s.bossNav = new Navigation(s.obs, 0.75, bounds);
  s.countdown = 10000;
  p.hp = p.maxHp = 1000;
  return { s, p };
}
test('AI routes around trunks between open grid centres and recovers locally without crossing trees', (t) => {
  const boxes = [
    { id: 'narrow-trunk', x: 0, y: 2, z: -0.75, w: 0.18, h: 4, d: 0.18 },
    { id: 'second-tree', x: 1.5, y: 2, z: 0.75, w: 0.55, h: 4, d: 0.55 },
  ];
  const { s, p } = testWorld(t, boxes);
  p.x = 5.25;
  p.z = -0.75;
  const z = enemy('normal', -5.25, -0.75);
  s.zombies.set(z.id, z);
  const a = { x: -0.75, z: -0.75 },
    b = { x: 0.75, z: -0.75 };
  assert.equal(blocked(a.x, a.z, s.obs, 0.43), false);
  assert.equal(blocked(b.x, b.z, s.obs, 0.43), false);
  assert.equal(s.nav.clearSegment(a, b), false, 'route cannot cut through a trunk between centres');
  for (let n = 0; n < 1500 && distance(z, p) > 1.2; n++) {
    s.time += 1 / 60;
    s.updateZombies(1 / 60);
    assert.equal(blocked(z.x, z.z, s.obs, 0.36), false);
  }
  assert.ok(distance(z, p) < 1.4, `enemy must arrive, got ${distance(z, p)}`);
  const displaced = { x: -0.5, z: -0.75 };
  const route = s.nav.escapeRoute(displaced, p);
  assert.ok(route.length > 0);
  let previous = displaced;
  for (const step of route) {
    assert.ok(s.nav.clearSegment(previous, step));
    previous = step;
  }
});
test('zombies break a blocking camp gate while chasing a player outside, and a lantern stops attacks near that gate', (t) => {
  const s = new Simulation({ forest: true }),
    p = s.addPlayer('p');
  t.after(() => s.dispose());
  p.x = 0;
  p.z = -28;
  p.hp = p.maxHp = 10000;
  const gate = s.defenses.find((d) => d.z < -15),
    z = enemy('normal', gate.x, gate.z + 2);
  s.zombies.set(z.id, z);
  for (let n = 0; n < 2400 && distance(z, p) > 1.2; n++) {
    s.time += 1 / 60;
    s.updateZombies(1 / 60);
  }
  assert.equal(gate.hp, 0);
  assert.ok(distance(z, p) < 1.4, 'must leave the camp and reach the player');
  gate.hp = 300;
  z.x = gate.x;
  z.z = gate.z - 2;
  p.x = gate.x;
  p.z = gate.z + 2;
  s.lanterns.push({ id: 'ward', x: gate.x, z: gate.z + 0.8, end: s.time + 180 });
  s.time += 2;
  s.updateZombies(0.1);
  assert.equal(z.afraid, true);
  assert.equal(gate.hp, 300);
});
test('final wave starts with one big boss; three guard waves shield it and must die before boss damage / chapter clear', (t) => {
  const s = new Simulation({ forest: true }),
    p = s.addPlayer('p');
  t.after(() => s.dispose());
  s.round = 14;
  s.clearedWaves = 14;
  s.countdown = 0;
  s.updateWaves(1 / 60);
  s.updateWaves(1 / 60);
  assert.equal(s.round, 15);
  assert.equal(s.toSpawn, 0);
  assert.equal(s.zombies.size, 1);
  const boss = [...s.zombies.values()][0];
  assert.ok(boss.finalBoss && boss.shielded);
  const hp = boss.hp;
  s.damageZombie(boss, 999999, p);
  assert.equal(boss.hp, hp);
  for (let stage = 1; stage <= 3; stage++) {
    s.time = Math.max(s.time, boss.summonAt, boss.emergeEnd) + 0.01;
    s.updateFinalBoss(boss);
    s.time = boss.ritualEnd + 0.01;
    for (let attempts = 0; boss.guardRemaining > 0 && attempts < 100; attempts++) {
      s.updateFinalBoss(boss);
      s.time += 0.41;
    }
    assert.equal(boss.guardRemaining, 0);
    assert.equal(boss.bossStage, stage);
    assert.ok(boss.guardians.length >= 8);
    s.damageZombie(boss, 999999, p);
    assert.equal(
      boss.hp,
      stage === 1 ? hp : stage === 2 ? hp * 0.65 : hp * 0.3,
      'guards protect boss',
    );
    for (const id of boss.guardians) s.damageZombie(s.zombies.get(id), 999999, p);
    s.updateFinalBoss(boss);
    assert.equal(boss.shielded, false);
    assert.equal(s.snapshot().zombies.find((z) => z.finalBoss).guardsAlive, 0);
    s.damageZombie(boss, 999999, p);
    if (stage < 3) assert.ok(s.zombies.has(boss.id), 'large hits cannot skip a guard stage');
  }
  assert.equal(s.zombies.size, 0);
  s.updateWaves(1 / 60);
  assert.equal(s.chapter, 2);
  assert.equal(s.phase, 'chapter');
  assert.equal(s.clearedWaves, 15);
});
test('purchased lanterns place on the ground, repel ordinary zombies, leave bosses active and expire', (t) => {
  const { s, p } = testWorld(t);
  p.x = 0;
  p.z = 4;
  p.yaw = 0;
  p.points = 1000;
  const buy = () => s.action('p', { type: 'shopBuy', item: 'lantern' });
  assert.ok(buy());
  assert.ok(buy());
  assert.equal(buy(), false);
  assert.equal(p.points, 1000 - LANTERN.price * 2);
  assert.ok(s.action('p', { type: 'equipment', item: 'lantern' }));
  assert.equal(p.equipment.lantern, 1);
  assert.equal(s.lanterns.length, 1);
  const lamp = s.lanterns[0],
    z = enemy();
  s.zombies.set(z.id, z);
  const before = distance(z, lamp);
  s.time += 1;
  s.updateZombies(0.1);
  assert.equal(z.afraid, true);
  assert.ok(distance(z, lamp) > before);
  const boss = enemy('boss');
  s.zombies.clear();
  s.zombies.set(boss.id, boss);
  const beforeBoss = distance(boss, p);
  s.updateZombies(0.1);
  assert.equal(boss.afraid, false);
  assert.ok(distance(boss, p) < beforeBoss);
  s.time += 1;
  assert.equal(s.useEquipment(p, 'lantern'), false, 'cannot stack lanterns in one spot');
  assert.equal(p.equipment.lantern, 1, 'failed placement consumes nothing');
  s.zombies.clear();
  s.time = lamp.end + 1;
  s.tick(1 / 60);
  assert.equal(s.snapshot().lanterns.length, 0);
});
test('passive healing is exactly 4 HP/s only near a visible campfire after five safe seconds; medkits still work anywhere', (t) => {
  const { s, p } = testWorld(t);
  p.hp = 50;
  p.maxHp = 100;
  p.lastDamage = 0;
  p.x = -10;
  p.z = -10;
  s.time = 6;
  s.regenerateHealth(p, 1);
  assert.equal(p.hp, 50);
  p.x = -6;
  p.z = 4;
  s.time = 4.99;
  s.regenerateHealth(p, 1);
  assert.equal(p.hp, 50);
  s.time = 5;
  s.regenerateHealth(p, 1);
  assert.equal(p.hp, 54);
  s.regenerateHealth(p, 1);
  assert.equal(p.hp, 58);
  p.lastDamage = 4;
  s.regenerateHealth(p, 1);
  assert.equal(p.hp, 58);
  p.x = 10;
  p.z = 10;
  p.hp = 10;
  s.campLevels.clinic = 2;
  assert.ok(s.useEquipment(p, 'medkit'));
  assert.equal(p.hp, 85);
});
