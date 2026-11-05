import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulation } from '../shared/Simulation.js';
import { initPhysics } from '../shared/Physics.js';
import { WEAPONS, ZOMBIES, makeInventory } from '../shared/config.js';
import { NEW_INFECTED, infectedForWave } from '../shared/Infected.js';
import { zombieHitboxes } from '../shared/Hitboxes.js';
import { obstacles, blocked, DOORS } from '../shared/map.js';
import { createHumanoid, disposeHumanoid } from '../src/enemies/ZombieModel.js';
import { animateHumanoid, animateDeath, beginDeath } from '../src/enemies/ZombieAnimation.js';
import { ZombieRenderer } from '../src/enemies/ZombieRenderer.js';

before(async () => await initPhysics());
function setup(t, seed = 1973) {
  const sim = new Simulation({ seed }),
    p = sim.addPlayer('p');
  sim.countdown = 10000;
  t.after(() => sim.dispose());
  return { sim, p };
}
function ready(sim, type, x, z) {
  const zombie = sim.spawnZombie(type);
  Object.assign(zombie, { x, z, emergeEnd: sim.time });
  return zombie;
}
test('seven distinct additions unlock progressively, never before their wave', () => {
  assert.equal(Object.keys(NEW_INFECTED).length, 7);
  assert.equal(Object.keys(ZOMBIES).length, 13);
  for (const [type, def] of Object.entries(NEW_INFECTED)) {
    const before = new Set(),
      after = new Set();
    for (let i = 0; i < 1000; i++) {
      before.add(infectedForWave(def.firstWave - 1, i / 1000));
      after.add(infectedForWave(def.firstWave, i / 1000));
    }
    assert.equal(before.has(type), false);
    assert.ok(after.has(type));
  }
});
test('spawns cover different ground, avoid recent spots, walls and operators, and vary by seed', (t) => {
  const { sim, p } = setup(t),
    positions = [],
    cells = new Set();
  for (let i = 0; i < 70; i++) {
    const z = sim.spawnZombie('normal');
    assert.ok(z);
    assert.equal(blocked(z.x, z.z, sim.obs, ZOMBIES.normal.radius), false);
    assert.ok(Math.hypot(z.x - p.x, z.z - p.z) >= 4.5);
    for (const previous of positions.slice(-8))
      assert.ok(Math.hypot(z.x - previous.x, z.z - previous.z) >= 2.7);
    cells.add(`${Math.floor((z.x + 27) / 4)}:${Math.floor(z.z / 4)}`);
    positions.push({ ...z });
    sim.zombies.delete(z.id);
    sim.time += 0.5;
  }
  assert.ok(cells.size >= 10, `only ${cells.size} ground cells used`);
  assert.equal(new Set(positions.map((z) => `${z.x.toFixed(3)},${z.z.toFixed(3)}`)).size, 70);
  const other = setup(t, 821).sim;
  const z = other.spawnZombie('normal');
  assert.notEqual(z.x, positions[0].x);
});
test('emerging infected cannot attack or walk, and bullet hitboxes rise with the visible body', (t) => {
  const { sim, p } = setup(t),
    z = sim.spawnZombie('normal');
  z.x = p.x;
  z.z = p.z - 1;
  const hp = p.hp,
    early = zombieHitboxes(z, sim.time)[0][1].y;
  assert.ok(early < 0);
  sim.updateZombies(1 / 60);
  assert.equal(p.hp, hp);
  assert.equal(z.z, p.z - 1);
  sim.time = z.emergeEnd;
  sim.updateZombies(1 / 60);
  assert.ok(p.hp < hp);
  assert.ok(zombieHitboxes(z, sim.time)[0][1].y > 1.5);
});
test('acid projectile has a wind-up, travels over time and leaves a damaging pool', (t) => {
  const { sim, p } = setup(t),
    z = ready(sim, 'spitter', p.x, p.z - 6);
  sim.updateZombies(1 / 60);
  assert.equal(z.ability, 'spit');
  assert.equal(sim.projectiles.length, 0);
  sim.time = z.abilityEnd;
  sim.updateZombies(1 / 60);
  assert.equal(sim.projectiles.length, 1);
  const start = sim.projectiles[0].z;
  sim.time += 1 / 60;
  sim.updateHazards(1 / 60);
  assert.ok(sim.projectiles[0].z > start);
  for (let i = 0; i < 70; i++) {
    sim.time += 1 / 60;
    sim.updateHazards(1 / 60);
  }
  assert.equal(sim.projectiles.length, 0);
  assert.ok(sim.hazards.length > 0);
  assert.ok(p.hp < 100);
  const hp = p.hp;
  p.x += 5;
  for (let i = 0; i < 360; i++) {
    sim.time += 1 / 60;
    sim.updateHazards(1 / 60);
  }
  assert.equal(p.hp, hp);
  assert.equal(sim.hazards.length, 0);
});
test('screamer buffs nearby infected only after its interruptible charge; carrier leaves toxic gas', (t) => {
  const { sim, p } = setup(t),
    s = ready(sim, 'screamer', p.x, p.z - 5);
  const normal = ready(sim, 'normal', p.x + 1, p.z - 6);
  sim.updateZombies(1 / 60);
  assert.equal(s.ability, 'scream');
  assert.equal(normal.enragedUntil, 0);
  sim.time = s.abilityEnd;
  sim.updateZombies(1 / 60);
  assert.ok(normal.enragedUntil > sim.time);
  const carrier = ready(sim, 'bloater', p.x + 3, p.z - 4);
  sim.damageZombie(carrier, 10000, p);
  assert.equal(sim.hazards.at(-1).type, 'gas');
  s.lastSpecial = -100;
  sim.updateZombies(1 / 60);
  sim.damageZombie(s, 10000, p);
  const expiry = normal.enragedUntil;
  sim.time += 2;
  sim.updateZombies(1 / 60);
  assert.equal(normal.enragedUntil, expiry, 'a dead screamer must not finish another charge');
});
test('leaper commits to a visible, dodgeable arc and cannot damage through a wall', (t) => {
  const { sim, p } = setup(t),
    z = ready(sim, 'leaper', p.x, p.z - 5);
  sim.updateZombies(1 / 60);
  assert.equal(z.ability, 'leap');
  sim.time = z.abilityEnd;
  sim.updateZombies(1 / 60);
  p.x += 4;
  for (let i = 0; i < 22; i++) {
    sim.time += 1 / 60;
    sim.updateZombies(1 / 60);
  }
  assert.ok(z.y > 1);
  assert.equal(p.hp, 100);
  for (let i = 0; i < 25; i++) {
    sim.time += 1 / 60;
    sim.updateZombies(1 / 60);
  }
  assert.equal(z.y, 0);
  assert.equal(p.hp, 100);
  assert.equal(blocked(z.x, z.z, sim.obs, ZOMBIES.leaper.radius), false);
});
test('Boneguard plates reduce actual body shots, leave headshots exposed and break below 40% HP', (t) => {
  const { sim, p } = setup(t),
    z = ready(sim, 'boneguard', p.x, p.z - 3);
  p.aimAlpha = 1;
  p.grounded = true;
  p.pitch = Math.atan2(ZOMBIES.boneguard.height * 0.62 - (p.y + 1.58), 3);
  sim.fire(p, { ads: true });
  assert.ok(Math.abs(320 - z.hp - WEAPONS.vx9.damage * 0.55) < 0.001);
  const hp = z.hp;
  sim.time += 2;
  p.pitch = Math.atan2(ZOMBIES.boneguard.height * 0.89 - (p.y + 1.58), 3);
  sim.fire(p, { ads: true });
  assert.ok(Math.abs(hp - z.hp - WEAPONS.vx9.damage * WEAPONS.vx9.head) < 0.001);
  z.hp = 120;
  sim.time += 2;
  p.pitch = Math.atan2(ZOMBIES.boneguard.height * 0.62 - (p.y + 1.58), 3);
  sim.fire(p, { ads: true });
  assert.equal(z.hp, 86);
});

test('Brute telegraphs a dodgeable slam and Stalker accelerates without teleporting', (t) => {
  const { sim, p } = setup(t),
    brute = ready(sim, 'brute', p.x, p.z - 3);
  const stalker = ready(sim, 'stalker', p.x + 2, p.z - 6);
  sim.updateZombies(1 / 60);
  assert.equal(brute.ability, 'slam');
  assert.ok(stalker.burstUntil > sim.time);
  const position = { x: stalker.x, z: stalker.z };
  p.y = 1;
  sim.time = brute.abilityEnd;
  sim.updateZombies(1 / 60);
  assert.equal(p.hp, 100, 'jumping avoids the grounded shock');
  assert.ok(Math.hypot(stalker.x - position.x, stalker.z - position.z) < 0.15);
  p.y = 0;
  brute.lastSpecial = -100;
  sim.updateZombies(1 / 60);
  sim.time = brute.abilityEnd;
  sim.updateZombies(1 / 60);
  assert.ok(p.hp < 100);
});

test('acid projectiles and pools cannot damage an operator through a container', (t) => {
  const { sim, p } = setup(t);
  p.x = -20;
  p.z = 12;
  const spitter = ready(sim, 'spitter', -20, 4);
  sim.updateZombies(1 / 60);
  assert.equal(spitter.ability, '');
  sim.projectiles.push({ id: 'wall-test', x: -20, y: 1.15, z: 4, vx: 0, vz: 10, end: 3 });
  for (let i = 0; i < 180; i++) {
    sim.time += 1 / 60;
    sim.updateHazards(1 / 60);
  }
  assert.equal(p.hp, 100);
  assert.equal(sim.projectiles.length, 0);
});

test('randomly spawned infected escape container corners rather than stalling the wave', (t) => {
  const { sim } = setup(t),
    z = ready(sim, 'normal', -22.11294, 5.13271);
  z.approachSide = -0.95;
  for (let i = 0; i < 600; i++) {
    sim.time += 1 / 60;
    sim.updateZombies(1 / 60);
  }
  assert.ok(z.z > 9.5, `stalled at ${z.x},${z.z}`);
});
test('clearing wave 15 transfers the squad, preserves inventory and unlocks, and rebuilds real collision', (t) => {
  const { sim, p } = setup(t);
  p.inventory = [makeInventory('barrett')];
  p.inventory[0].ammo = 1;
  p.inventory[0].upgraded = true;
  p.perks = ['heart'];
  p.maxHp = 180;
  p.hp = 20;
  p.points = 1200;
  p.unlockedWeapons.push('barrett');
  sim.openDoors = DOORS.map((d) => d.id);
  sim.round = 15;
  sim.phase = 'wave';
  sim.toSpawn = 0;
  sim.updateWaves(1 / 60);
  assert.equal(sim.chapter, 2);
  assert.equal(sim.phase, 'chapter');
  assert.equal(sim.snapshot().wave, 1);
  assert.deepEqual([p.x, p.y, p.z], [-18, 0, 15]);
  assert.equal(p.hp, 180);
  assert.equal(p.points, 1800);
  assert.equal(p.inventory[0].id, 'barrett');
  assert.equal(p.inventory[0].upgraded, true);
  assert.equal(p.inventory[0].ammo, 15);
  assert.ok(p.unlockedWeapons.includes('barrett'));
  assert.deepEqual(p.perks, ['heart']);
  assert.deepEqual(sim.openDoors, []);
  assert.ok(sim.physics.statics.has('ashTruck'));
  assert.equal(sim.physics.statics.has('container'), false);
  assert.equal(blocked(p.x, p.z, sim.obs, 0.32), false);
  assert.equal(sim.action('p', { type: 'grenade' }), false);
  const position = [p.x, p.z];
  sim.input('p', { seq: 1, yaw: 0, pitch: 0, forward: true });
  sim.tick();
  assert.deepEqual([p.x, p.z], position);
  sim.updateWaves(5);
  assert.equal(sim.phase, 'prepare');
  sim.updateWaves(10);
  assert.equal(sim.round, 16);
  assert.equal(sim.snapshot().wave, 1);
  sim.zombies.clear();
  sim.toSpawn = 0;
  sim.round = 30;
  sim.phase = 'wave';
  sim.updateWaves(1 / 60);
  assert.equal(sim.chapter, 3);
  assert.ok(sim.physics.statics.has('icePod1'));
});
test('all 13 rigs animate emergence and articulated deaths, then pooled rigs reset cleanly', (t) => {
  const renderer = new ZombieRenderer(new THREE.Scene());
  t.after(() => renderer.reset());
  for (const type of Object.keys(ZOMBIES)) {
    const model = createHumanoid(type),
      z = {
        id: 'z1',
        type,
        x: 0,
        z: 0,
        hp: 100,
        maxHp: 100,
        spawnAt: 0,
        emergeEnd: 1.5,
        lastAttack: -100,
        hitAt: -100,
      };
    animateHumanoid(model, z, 0.2, 1 / 60, 0);
    const raised = model.arms[0].rotation.x;
    animateHumanoid(model, z, 2, 1 / 60, 0);
    assert.ok(Math.abs(raised - model.arms[0].rotation.x) > 0.5, type);
    beginDeath(model, { seed: 2, head: true, impulse: 1, direction: { x: 1, z: 0 } });
    animateDeath(model, 1.7, 1 / 60);
    assert.ok(Math.abs(model.root.rotation.x) > 1);
    assert.ok(Math.abs(model.elbows[0].rotation.x - model.elbows[1].rotation.x) > 0.1);
    model.root.traverse((o) =>
      assert.ok(
        [...o.position, o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite),
        type,
      ),
    );
    animateDeath(model, 6.5, 1 / 60);
    assert.ok(model.materials[0].opacity < 1);
    disposeHumanoid(model);
    renderer.update([z], [], '', 2, 1 / 60);
    renderer.recordDeath({ zombie: z.id, head: true });
    renderer.update([], [], '', 2.1, 0.1);
    renderer.update([], [], '', 10, 7.1);
    renderer.update([{ ...z, id: 'z2', spawnAt: 10, emergeEnd: 11.5 }], [], '', 10.1, 1 / 60);
    const reused = renderer.entities.get('z2');
    assert.equal(reused.death, null);
    assert.equal(reused.materials[0].opacity, 1);
    assert.ok(reused.root.position.y < 0);
    renderer.reset();
  }
});
