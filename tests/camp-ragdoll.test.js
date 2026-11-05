import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { initPhysics } from '../shared/Physics.js';
import { Simulation } from '../shared/Simulation.js';
import { CAMP_UPGRADES, CONTRACT_BOARD, discountedRecipeCost } from '../shared/CampSystems.js';
import { RECIPES } from '../shared/Survival.js';
import { makeInventory } from '../shared/config.js';
import { RagdollWorld } from '../src/enemies/RagdollWorld.js';
import { createHumanoid, resetHumanoid, disposeHumanoid } from '../src/enemies/ZombieModel.js';
import { translateText } from '../src/ui/Localization.js';
before(async () => await initPhysics());
test('camp upgrades have shared real effects, costs, a level cap and never accept remote fake positions', (t) => {
  const s = new Simulation({ forest: true }),
    p = s.addPlayer('p'),
    q = s.addPlayer('q');
  t.after(() => s.dispose());
  p.resources = { wood: 100, scrap: 100, parts: 100, medicine: 100 };
  const workshop = CAMP_UPGRADES.find((u) => u.id === 'workshop');
  p.x = workshop.x;
  p.z = workshop.z + 0.8;
  assert.equal(s.nearest(p).type, 'campUpgrade');
  const old = p.resources.wood;
  assert.ok(s.interact(p));
  assert.equal(s.campLevels.workshop, 1);
  assert.equal(q.campLevels.workshop, 1);
  assert.equal(p.resources.wood, old - 5);
  assert.ok(discountedRecipeCost(RECIPES[0], 1).scrap < RECIPES[0].cost.scrap);
  for (let i = 0; i < 2; i++) {
    s.time += 1;
    assert.ok(s.interact(p));
  }
  assert.equal(s.campLevels.workshop, 3);
  s.time += 1;
  assert.equal(s.interact(p), false);
  assert.equal(s.action(p.id, { type: 'campUpgrade', id: 'clinic', level: 99 }), false);
});
test('expeditions count real kills, grant the team one reward, and nests receive actual occluded gunfire', (t) => {
  const s = new Simulation({ forest: true }),
    p = s.addPlayer('p');
  t.after(() => s.dispose());
  p.x = CONTRACT_BOARD.x;
  p.z = CONTRACT_BOARD.z + 1;
  s.interact(p);
  assert.equal(s.contract.kind, 'defend');
  for (let i = 0; i < 12; i++) {
    const z = s.spawnZombie('normal');
    assert.ok(z);
    z.x = 0;
    z.z = -25;
    s.damageZombie(z, 10000, p);
  }
  assert.equal(s.contract.ready, true);
  const credits = p.points;
  s.time += 1;
  s.interact(p);
  assert.equal(p.points, credits + 450);
  const reward = p.points;
  s.time += 1;
  s.interact(p);
  assert.equal(p.points, reward);
  s.contractNumber = 2;
  s.contract = null;
  s.time += 1;
  s.interact(p);
  assert.equal(s.contract.kind, 'nest');
  const c = s.contract;
  p.x = c.x;
  p.z = c.z + 4;
  p.y = 0;
  p.yaw = 0;
  p.pitch = Math.atan2(0.65 - 1.58, 4);
  p.inventory = [makeInventory('barrett')];
  p.slot = 0;
  p.aimAlpha = 1;
  for (let i = 0; i < 3; i++) {
    s.time += 2;
    s.fire(p, { ads: true });
  }
  assert.equal(c.ready, true);
  assert.equal(c.hp, 0);
});
test('ragdolls use 11 rigid bodies, joints, impact response and bounded pooling with pose restoration', (t) => {
  const world = new RagdollWorld(),
    model = createHumanoid('normal');
  t.after(() => {
    world.dispose();
    disposeHumanoid(model);
  });
  model.root.updateMatrixWorld(true);
  const headBefore = model.head.getWorldPosition(new THREE.Vector3()).y;
  world.spawn(model, { seed: 3, impulse: 0.8, direction: { x: 1, z: 0.4 }, head: true });
  assert.equal(world.active.get(model).parts.length, 11);
  for (let n = 0; n < 180; n++) world.update(1 / 60);
  const headAfter = model.head.getWorldPosition(new THREE.Vector3()).y;
  assert.ok(headAfter < headBefore - 0.5, `head ${headAfter}`);
  assert.ok(headAfter > -0.1);
  const neckAfter = model.neck.getWorldPosition(new THREE.Vector3());
  assert.ok(neckAfter.y < 0.7, 'no neck mesh may float at standing height');
  assert.ok(
    neckAfter.distanceTo(model.head.getWorldPosition(new THREE.Vector3())) < 0.3,
    'neck must follow the head',
  );
  assert.ok(world.takeImpacts().length > 0, 'body must produce a real contact deceleration');
  model.root.traverse((o) =>
    assert.ok([...o.position, o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)),
  );
  world.freeze(model);
  assert.equal(world.active.size, 0);
  resetHumanoid(model);
  assert.equal(model.head.position.y, model.restHead.y);
});
test('Polish / English translation handles dynamic HUD text without corrupting proper weapon or chapter names', () => {
  assert.equal(translateText('GRAJ SOLO', 'en'), 'DEPLOY SOLO');
  assert.equal(translateText('SETTINGS', 'pl'), 'USTAWIENIA');
  assert.equal(translateText('FALA 12 / THE LOST FOREST', 'en'), 'WAVE 12 / THE LOST FOREST');
  assert.equal(translateText('FN SCAR-H', 'pl'), 'FN SCAR-H');
  assert.equal(translateText('CLASSIFIED', 'en'), 'CLASSIFIED');
});
