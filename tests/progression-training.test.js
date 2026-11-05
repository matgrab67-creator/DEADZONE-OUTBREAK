import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation, blankInput } from '../shared/Simulation.js';
import { ForestWorld } from '../shared/Forest.js';
import { BASIC_WEAPONS, SPECIAL_WEAPONS } from '../shared/WeaponProgression.js';
import { WEAPONS } from '../shared/config.js';
import { createHumanoid, disposeHumanoid } from '../src/enemies/ZombieModel.js';
import { animateHumanoid } from '../src/enemies/ZombieAnimation.js';
before(async () => await initPhysics());
test('basic schemes start free; special schemes only come from forest supply caches, including team unlocks', (t) => {
  const s = new Simulation({ forest: true, seed: 821 }),
    p = s.addPlayer('p'),
    peer = s.addPlayer('q');
  t.after(() => s.dispose());
  assert.deepEqual(p.unlockedWeapons, BASIC_WEAPONS);
  p.points = 100000;
  const points = p.points;
  assert.equal(
    s.action(p.id, { type: 'shopBuy', item: 'weapon:barrett', unlockedWeapons: ['barrett'] }),
    false,
  );
  assert.equal(p.points, points);
  s.expandForest(11);
  const cache = s.forest.caches().find((c) => c.blueprint === 'barrett');
  assert.ok(cache);
  p.x = cache.x;
  p.z = cache.z + 1.1;
  assert.equal(s.nearest(p).id, cache.id);
  assert.ok(s.interact(p));
  assert.ok(p.unlockedWeapons.includes('barrett'));
  assert.ok(peer.unlockedWeapons.includes('barrett'));
  assert.equal(p.inventory[0].id, 'vx9');
  const before = p.points;
  assert.ok(s.action(p.id, { type: 'shopBuy', item: 'weapon:barrett' }));
  assert.equal(before - p.points, 6000);
  const z = s.spawnZombie('normal');
  s.damageZombie(z, 10000, p);
  assert.equal(s.blueprints.length, 0, 'no schematics dropped outside crates');
});
test('all special blueprints are guaranteed in seeded supply sites, Barrett only in the deep forest', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const w = new ForestWorld(seed, 3);
    assert.equal(
      w.caches().some((c) => c.blueprint === 'barrett'),
      false,
    );
    w.ensure(4);
    const blueprints = new Set(w.caches().map((c) => c.blueprint));
    for (const id of SPECIAL_WEAPONS) assert.ok(blueprints.has(id), `${seed}/${id}`);
  }
  assert.ok(WEAPONS.raven.price > 1800);
  assert.ok(WEAPONS.p90.price > 2400);
  assert.equal(WEAPONS.barrett.price, 6000);
});
test('training keeps real ballistic damage, counts actual hits, reloads, tracking and result restart without match unlocks', (t) => {
  const s = new Simulation({ training: true }),
    p = s.addPlayer('p');
  t.after(() => s.dispose());
  assert.equal(s.phase, 'training');
  assert.equal(s.zombies.size, 3);
  assert.ok(s.physics.statics.has('range-backstop'));
  assert.equal(s.physics.statics.has('camp-shelter'), false);
  p.aimAlpha = 1;
  const target = [...s.zombies.values()].find((z) => z.x === 0);
  p.yaw = Math.atan2(p.x - target.x, p.z - target.z);
  p.pitch = 0;
  s.fire(p, { ads: true });
  assert.equal(s.training.shots, 1);
  assert.equal(s.training.hits, 1);
  assert.equal(s.training.headshots, 1);
  assert.equal(s.training.kills, 1);
  assert.equal(p.inventory[0].ammo, 13);
  s.time += 0.4;
  s.updateTraining(0.4);
  assert.equal(s.zombies.size, 3);
  assert.ok(s.action(p.id, { type: 'training', weapon: 'barrett', drill: 'tracking' }));
  assert.equal(p.inventory[0].id, 'barrett');
  assert.equal(s.training.shots, 0);
  const moving = [...s.zombies.values()][0],
    x = moving.x;
  s.time += 0.4;
  s.updateTraining(0.4);
  assert.notEqual(moving.x, x);
  s.time = s.training.endAt;
  s.updateTraining(1 / 60);
  assert.equal(s.training.finished, true);
  const ammo = p.inventory[0].ammo;
  s.fire(p, { ads: true });
  assert.equal(p.inventory[0].ammo, ammo);
  assert.ok(s.action(p.id, { type: 'training', drill: 'reaction' }));
  assert.equal(s.zombies.size, 1);
  assert.equal(s.training.finished, false);
  const normal = new Simulation({ forest: true });
  t.after(() => normal.dispose());
  assert.equal(normal.addPlayer('normal').unlockedWeapons.includes('barrett'), false);
});
test('infected have simpler classic zombie silhouettes and survivors retain human equipment', () => {
  for (const type of [
    'normal',
    'runner',
    'armored',
    'crawler',
    'exploder',
    'boss',
    'brute',
    'spitter',
    'screamer',
    'stalker',
    'leaper',
    'bloater',
    'boneguard',
  ]) {
    const m = createHumanoid(type);
    assert.equal(m.classicZombie, true);
    assert.equal(m.fungalStage, undefined);
    assert.equal(m.materials[0].map.name, 'reference-zombie-atlas-512');
    assert.ok(m.materials[6].emissiveIntensity > 0.1);
    animateHumanoid(m, { lastAttack: -100, hitAt: -100 }, 1, 1 / 60, 1);
    m.root.traverse((o) =>
      assert.ok(
        [...o.position, ...o.scale, o.rotation.x, o.rotation.y, o.rotation.z].every(
          Number.isFinite,
        ),
      ),
    );
    disposeHumanoid(m);
  }
  const survivor = createHumanoid('normal', true);
  assert.equal(survivor.fungalStage, undefined);
  disposeHumanoid(survivor);
});
