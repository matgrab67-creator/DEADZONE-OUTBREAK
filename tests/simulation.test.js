import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation, sanitizeInput } from '../shared/Simulation.js';
import { Navigation } from '../shared/Navigation.js';
import { obstacles, blocked, slide, rayBox } from '../shared/map.js';
import { WEAPONS, makeInventory, random } from '../shared/config.js';

before(async () => await initPhysics());
const setup = () => {
  const sim = new Simulation();
  const p = sim.addPlayer('p');
  return { sim, p };
};
const step = (sim, n, input = {}) => {
  for (let i = 0; i < n; i++) {
    sim.input('p', { seq: sim.players.get('p').ack + 1, yaw: 0, pitch: 0, ...input });
    sim.tick();
  }
};

test('input rejects malformed values and excludes client damage, health and points', () => {
  assert.equal(sanitizeInput({ yaw: NaN, pitch: 0, seq: 0 }), null);
  assert.equal(sanitizeInput({ yaw: 0, pitch: Infinity, seq: 0 }), null);
  assert.equal(sanitizeInput({ yaw: 0, pitch: 0, seq: -1 }), null);
  const input = sanitizeInput({
    yaw: 100,
    pitch: 100,
    seq: 3,
    forward: true,
    fire: 'yes',
    points: 99999,
    damage: 9999,
  });
  assert.equal(input.pitch, 1.48);
  assert.equal(input.fire, false);
  assert.equal(input.points, undefined);
  assert.equal(input.damage, undefined);
});
test('Rapier capsule blocks exterior walls, interior props, and locked doors', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.x = -25;
  p.z = 15;
  step(sim, 180, { left: true });
  assert.ok(p.x > -26.4, `crossed perimeter ${p.x}`);
  p.x = -20;
  p.z = 12;
  p.vx = 0;
  p.vz = 0;
  step(sim, 160, { forward: true });
  assert.ok(p.z > 8.7, `crossed container ${p.z}`);
  p.x = -11;
  p.z = 10;
  p.vx = 0;
  p.vz = 0;
  step(sim, 100, { right: true });
  assert.ok(p.x < -9.5, `crossed door ${p.x}`);
});
test('jump and crouch remain grounded correctly', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  step(sim, 10);
  step(sim, 10, { jump: true });
  assert.ok(p.y > 0.25);
  step(sim, 100);
  assert.ok(p.y < 0.06);
  step(sim, 10, { crouch: true });
  assert.equal(p.crouch, true);
  step(sim, 10);
  assert.equal(p.crouch, false);
});
test('CTRL triggers a momentum slide while running, but not from a standstill', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  step(sim, 40, { forward: true });
  const speedBeforeSlide = Math.hypot(p.vx, p.vz);
  assert.ok(speedBeforeSlide > 3.2);
  step(sim, 2, { forward: true, crouch: true });
  assert.equal(p.sliding, true);
  assert.ok(Math.hypot(p.vx, p.vz) > speedBeforeSlide * 0.9);
  step(sim, 44, { forward: true, crouch: true });
  assert.equal(p.sliding, false);
  assert.equal(p.crouch, true);
  p.vx = 0;
  p.vz = 0;
  step(sim, 2, { crouch: true });
  assert.equal(p.sliding, false);
});
test('knife attacks damage a zombie in front and enforce attack cooldown', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  const target = sim.spawnZombie('normal');
  target.x = p.x;
  target.z = p.z - 1.5;
  assert.equal(sim.action('p', { type: 'knifeAttack' }), true);
  assert.equal(sim.zombies.has(target.id), false);
  assert.equal(p.kills, 1);
  assert.equal(sim.action('p', { type: 'knifeAttack' }), false);
});
test('zombies have a 1-in-20 chance to drop a recoverable locked weapon blueprint', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  sim.round = 1;
  const matchingSeed = (number, shouldDrop) => {
    for (let seed = 0; seed < 10000; seed++)
      if (random(seed + number * 43 + sim.round * 71) < 0.05 === shouldDrop) return seed;
    assert.fail(`could not find a deterministic ${shouldDrop ? 'drop' : 'no-drop'} seed`);
  };
  const common = sim.spawnZombie();
  sim.seed = matchingSeed(1, false);
  sim.damageZombie(common, 1000, p);
  assert.equal(sim.blueprints.length, 0);

  const dropped = sim.spawnZombie();
  dropped.x = p.x;
  dropped.z = p.z;
  sim.seed = matchingSeed(2, true);
  sim.damageZombie(dropped, 1000, p);
  assert.equal(sim.blueprints.length, 1);
  assert.equal(sim.snapshot().blueprints.length, 1);
  const drop = sim.blueprints[0];
  assert.equal(sim.nearest(p).id, drop.id);
  assert.equal(sim.interact(p), true);
  assert.ok(p.unlockedWeapons.includes(drop.weapon));
  assert.equal(sim.blueprints.length, 0);
  assert.equal(sim.snapshot().blueprints.length, 0);
});
test('authoritative weapon hits head, awards points and enforces fire rate', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  const z = sim.spawnZombie('normal');
  z.x = p.x;
  z.z = p.z - 3;
  z.hp = 70;
  sim.fire(p, { ads: true });
  assert.equal(sim.zombies.has(z.id), false);
  assert.equal(p.kills, 1);
  assert.equal(p.headshots, 1);
  assert.equal(p.points, 650);
  assert.equal(p.inventory[0].ammo, 13);
  sim.fire(p, { ads: true });
  assert.equal(p.inventory[0].ammo, 13);
});
test('walls occlude hitscan damage', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.x = -20;
  p.z = 12;
  const z = sim.spawnZombie('normal');
  z.x = -20;
  z.z = 4;
  const hp = z.hp;
  sim.fire(p, { ads: true });
  assert.equal(z.hp, hp);
});
test('reload transfers reserve rounds and switching cancels it', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.inventory[0].ammo = 0;
  assert.ok(sim.action('p', { type: 'reload' }));
  step(sim, 90);
  assert.equal(p.inventory[0].ammo, 14);
  assert.equal(p.inventory[0].reserve, 98);
  p.inventory.push(makeInventory('raven'));
  p.inventory[0].ammo = 0;
  sim.action('p', { type: 'reload' });
  sim.action('p', { type: 'switch', slot: 1 });
  assert.equal(p.reloadEnd, 0);
  assert.equal(p.slot, 1);
  assert.equal(sim.action('p', { type: 'switch', slot: 40 }), false);
});
test('purchases use server positions and points; unlocks update collision', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  assert.equal(sim.action('p', { type: 'purchase', points: 99999, item: 'd1' }), false);
  p.x = -10.8;
  p.z = 10;
  p.points = 500;
  assert.equal(sim.action('p', { type: 'interact' }), false);
  assert.equal(p.points, 500);
  sim.time += 0.4;
  p.points = 800;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.deepEqual(sim.openDoors, ['d1']);
  assert.equal(p.points, 50);
  step(sim, 90, { right: true });
  assert.ok(p.x > -8.4, `door still blocked: ${p.x}`);
});
test('weapon purchase, perk and upgrade have real effects and no double charges', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.points = 10000;
  p.x = -11.2;
  p.z = 16;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.deepEqual(p.unlockedWeapons, ['vx9', 'raven']);
  assert.equal(p.points, 10000);
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'weapon:raven' }));
  assert.equal(p.inventory[p.slot].id, 'raven');
  assert.equal(p.points, 9000);
  sim.time += 0.5;
  p.x = 5;
  p.z = 4.5;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.equal(p.maxHp, 180);
  assert.equal(p.points, 7500);
  sim.time += 0.5;
  assert.equal(sim.action('p', { type: 'interact' }), false);
  assert.equal(p.points, 7500);
  sim.time += 0.5;
  p.x = 18;
  p.z = -14.5;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.equal(p.inventory[p.slot].upgraded, true);
  assert.equal(p.inventory[p.slot].ammo, 45);
});
test('AI routes around a container without entering solid geometry', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.x = -20;
  p.z = 12;
  const z = sim.spawnZombie('normal');
  z.x = -20;
  z.z = 3;
  let closest = 100;
  for (let i = 0; i < 1200; i++) {
    sim.nav.fields.clear();
    sim.updateZombies(1 / 60);
    sim.time += 1 / 60;
    assert.equal(blocked(z.x, z.z, sim.obs, 0.34), false);
    closest = Math.min(closest, Math.hypot(z.x - p.x, z.z - p.z));
  }
  assert.ok(closest < 1.3, `did not navigate: closest ${closest}`);
  assert.ok(p.hp < 100 || p.downed);
});
test('zombies approach from different angles instead of following one line', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.x = -20;
  p.z = 12;
  const zombies = Array.from({ length: 8 }, () => sim.spawnZombie('normal'));
  for (const z of zombies) {
    z.x = -20;
    z.z = 3;
  }
  sim.updateZombies(1 / 60);
  const headings = zombies.map((z) => Math.atan2(z.x + 20, 3 - z.z));
  const spread = Math.max(...headings) - Math.min(...headings);
  assert.ok(spread > 0.5, `approach headings were too similar: ${headings.join(', ')}`);
});
test('zombie kills player and solo ends', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.armor = 0;
  sim.damagePlayer(p, 110, { x: 0, z: 0 });
  sim.tick();
  assert.equal(sim.state, 'over');
  assert.equal(p.downed, true);
});
test('cleared waves advance and every fifth round spawns boss', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  sim.countdown = 0;
  sim.tick();
  assert.equal(sim.round, 1);
  assert.equal(sim.phase, 'wave');
  sim.toSpawn = 0;
  sim.zombies.clear();
  sim.tick();
  assert.equal(sim.phase, 'prepare');
  assert.ok(sim.countdown > 11);
  sim.round = 4;
  sim.countdown = 0;
  sim.tick();
  assert.equal(sim.round, 5);
  assert.ok([...sim.zombies.values()].some((z) => z.type === 'boss'));
});
test('teammates revive only at close range and eliminated players return between waves', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  const q = sim.addPlayer('q');
  sim.damagePlayer(q, 1000, p);
  assert.ok(q.downed);
  for (let i = 0; i < 190; i++) {
    sim.action('p', { type: 'interact' });
    sim.tick();
  }
  assert.equal(q.downed, false);
  assert.ok(q.hp > 0);
  q.downed = true;
  q.eliminated = true;
  sim.phase = 'wave';
  sim.toSpawn = 0;
  sim.zombies.clear();
  sim.tick();
  assert.equal(q.eliminated, false);
  assert.equal(q.hp, 100);
});
test('repair rewards are limited, grenades consume inventory, and all six weapons function', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  p.x = -24;
  p.z = 3.5;
  const points = p.points;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.equal(p.points, points + 25);
  sim.time += 0.5;
  assert.equal(sim.action('p', { type: 'interact' }), false);
  p.x = -18;
  p.z = 15;
  assert.ok(sim.action('p', { type: 'grenade' }));
  assert.equal(p.grenades, 1);
  assert.equal(sim.action('p', { type: 'grenade' }), false);
  for (const id of Object.keys(WEAPONS)) {
    p.inventory = [makeInventory(id)];
    p.slot = 0;
    p.lastFire = -100;
    sim.fire(p, { ads: false });
    assert.equal(p.inventory[0].ammo, WEAPONS[id].magazine - 1);
  }
});
test('navigation cannot cross locked sector wall', () => {
  const obs = obstacles(),
    nav = new Navigation(obs),
    z = { x: -11, z: 10 },
    target = { x: 0, z: 10 };
  for (let i = 0; i < 200; i++) {
    const dir = nav.direction(z, target);
    slide(z, dir.x * 0.05, dir.z * 0.05, obs);
  }
  assert.ok(z.x < -9.5);
  assert.ok(
    rayBox(
      { x: -10, y: 1, z: 10 },
      { x: 1, y: 0, z: 0 },
      obs.find((b) => b.id === 'd1'),
    ) < 2,
  );
});

test('legal pistol fire and reload clear three real waves without bypassing combat', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  for (let tick = 0; tick < 60 * 90 && sim.state === 'playing'; tick++) {
    const target = [...sim.zombies.values()]
      .filter((z) => sim.hasSight(p, z))
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    sim.input('p', {
      seq: tick + 1,
      yaw: target ? Math.atan2(-(target.x - p.x), -(target.z - p.z)) : 0,
      pitch: 0,
      fire: !!target,
      ads: true,
    });
    if (p.inventory[0].ammo === 0) sim.action('p', { type: 'reload' });
    sim.tick();
  }
  assert.ok(sim.round >= 4, `round ${sim.round}`);
  assert.ok(p.kills >= 33);
  assert.equal(sim.state, 'playing');
  assert.ok(p.inventory[0].reserve < WEAPONS.vx9.reserve);
});

test('revive cannot pass through a locked door', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  const teammate = sim.addPlayer('q');
  p.x = -10;
  p.z = 10;
  teammate.x = -8;
  teammate.z = 10;
  sim.damagePlayer(teammate, 1000, p);
  assert.notEqual(sim.nearest(p)?.type, 'revive');
  teammate.reviver = p.id;
  teammate.reviveUntil = 100;
  step(sim, 30);
  assert.equal(teammate.revive, 0);
});

test('boss navigates around containers with clearance for its larger body', (t) => {
  const { sim, p } = setup();
  t.after(() => sim.dispose());
  const boss = sim.spawnZombie('boss');
  boss.x = -20;
  boss.z = 3;
  let closest = Infinity;
  for (let tick = 0; tick < 60 * 45; tick++) {
    sim.updateZombies(1 / 60);
    sim.time += 1 / 60;
    assert.equal(blocked(boss.x, boss.z, sim.obs, 0.69), false);
    closest = Math.min(closest, Math.hypot(boss.x - p.x, boss.z - p.z));
  }
  assert.ok(closest < 2, `boss got stuck at distance ${closest}`);
  assert.ok(p.hp < 100 || p.downed);
});
