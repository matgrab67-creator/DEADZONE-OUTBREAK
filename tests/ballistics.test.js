import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, makeInventory } from '../shared/config.js';
import {
  spreadFor,
  recordShot,
  recoveredBloom,
  sampleCone,
  forwardDirection,
} from '../shared/Ballistics.js';

const player = (id) => ({
  inventory: [makeInventory(id)],
  slot: 0,
  vx: 0,
  vz: 0,
  grounded: true,
  crouch: false,
  aimAlpha: 0,
});
test('movement, jumping and sustained fire widen the actual ballistic cone', () => {
  const p = player('raven');
  const rest = spreadFor(p, {}, 0).aim;
  p.vx = 4.6;
  assert.ok(spreadFor(p, {}, 0).aim > rest * 3);
  p.vx = 0;
  p.grounded = false;
  assert.ok(spreadFor(p, {}, 0).aim > rest * 3);
  p.grounded = true;
  for (let i = 0; i < 10; i++) recordShot(p.inventory[0], i * WEAPONS.raven.rate);
  assert.ok(spreadFor(p, {}, 0.95).aim > rest * 2);
  assert.equal(recoveredBloom(p.inventory[0], 5), 0);
});
test('ADS and crouching improve accuracy; a shotgun retains physical pellet spread', () => {
  const p = player('lynx'),
    hip = spreadFor(p, {}, 0).aim;
  p.aimAlpha = 1;
  assert.ok(spreadFor(p, { ads: true }, 0).aim < hip * 0.1);
  p.crouch = true;
  assert.ok(spreadFor(p, { ads: true }, 0).aim < hip * 0.025);
  const shotgun = player('iron');
  const intrinsic = spreadFor(shotgun, {}, 0).pellets;
  shotgun.aimAlpha = 1;
  assert.equal(spreadFor(shotgun, { ads: true }, 0).pellets, intrinsic);
  assert.ok(intrinsic > 0.03);
});
test('new weapon profiles preserve their intended damage, movement and optic tradeoffs', () => {
  const eagle = player('desertEagle'),
    pistol = player('vx9');
  eagle.vx = 4.6;
  pistol.vx = 4.6;
  assert.ok(WEAPONS.desertEagle.damage > WEAPONS.vx9.damage);
  assert.ok(WEAPONS.desertEagle.head > WEAPONS.vx9.head);
  assert.ok(spreadFor(eagle, {}, 0).aim > spreadFor(pistol, {}, 0).aim);

  const tec = player('tec9'),
    smg = player('vortex');
  tec.vx = smg.vx = 4.6;
  assert.ok(spreadFor(tec, {}, 0).aim < spreadFor(smg, {}, 0).aim);

  assert.ok(WEAPONS.scout.damage < WEAPONS.lynx.damage);
  assert.ok(WEAPONS.scout.head > WEAPONS.lynx.head);
  assert.ok(WEAPONS.scout.zoom > 0 && WEAPONS.pbs1.zoom > 0);
  assert.ok(spreadFor(player('pbs1'), {}, 0).aim < spreadFor(player('spectre'), {}, 0).aim);
});
test('cone sampling is circular, deterministic, normalized and unbiased in every view direction', () => {
  for (const pitch of [0, 1.47, -1.47]) {
    const forward = forwardDirection(0.74, pitch);
    let angleSum = 0;
    for (let i = 0; i < 1000; i++) {
      const d = sampleCone(forward, 0.05, i);
      assert.ok(Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-10);
      const angle = Math.acos(Math.min(1, forward.x * d.x + forward.y * d.y + forward.z * d.z));
      assert.ok(angle <= 0.050001);
      angleSum += angle;
    }
    assert.ok(angleSum / 1000 > 0.025 && angleSum / 1000 < 0.04);
    assert.deepEqual(sampleCone(forward, 0.05, 19), sampleCone(forward, 0.05, 19));
  }
});
