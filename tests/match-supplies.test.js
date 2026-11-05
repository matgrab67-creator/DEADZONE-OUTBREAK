import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation } from '../shared/Simulation.js';
import { waveIntermission, FLASHLIGHT_BATTERY_SECONDS } from '../shared/MatchRules.js';
import { weaponCategory, SHOP_ITEMS } from '../shared/Shop.js';
import { WEAPONS } from '../shared/config.js';

before(async () => await initPhysics());
test('forest pauses grow 25 / 30 / 35 to 55s, count only cleared waves, and persist through chapter transfer', (t) => {
  const sim = new Simulation({ forest: true });
  t.after(() => sim.dispose());
  sim.addPlayer('p');
  const id = sim.snapshot().matchId;
  assert.equal(sim.clearedWaves, 0);
  assert.deepEqual(
    Array.from({ length: 10 }, (_, i) => waveIntermission(i + 1)),
    [25, 30, 35, 40, 45, 50, 55, 55, 55, 55],
  );
  for (let round = 1; round <= 15; round++) {
    sim.round = round;
    sim.phase = 'wave';
    sim.toSpawn = 0;
    sim.zombies.clear();
    sim.updateWaves(1 / 60);
    assert.equal(sim.clearedWaves, round);
    if (round < 15) assert.equal(sim.countdown, waveIntermission(round));
  }
  assert.equal(sim.phase, 'chapter');
  sim.updateWaves(5);
  assert.equal(sim.phase, 'prepare');
  assert.equal(sim.countdown, 55);
  assert.equal(sim.snapshot().matchId, id);
  assert.equal(sim.snapshot().clearedWaves, 15);
  const another = new Simulation({ forest: true });
  assert.notEqual(another.matchId, id);
  another.dispose();
});
test('flashlight unlock, batteries, drain, automatic replacement, capacity and chapter persistence are authoritative', (t) => {
  const sim = new Simulation({ forest: true }),
    p = sim.addPlayer('p');
  t.after(() => sim.dispose());
  p.points = 3000;
  const buy = (item) => sim.action('p', { type: 'shopBuy', item });
  assert.equal(sim.action('p', { type: 'flashlight' }), false);
  assert.equal(buy('battery'), false);
  assert.equal(buy('flashlight'), true);
  assert.equal(p.points, 2400);
  assert.equal(p.flashlightCharge, FLASHLIGHT_BATTERY_SECONDS);
  assert.equal(buy('flashlight'), false);
  for (let i = 0; i < 3; i++) assert.ok(buy('battery'));
  assert.equal(buy('battery'), false);
  assert.equal(p.points, 1800);
  assert.ok(sim.action('p', { type: 'flashlight' }));
  sim.updateFlashlight(p, 1);
  assert.equal(p.flashlightCharge, 119);
  p.flashlightCharge = 0.01;
  sim.updateFlashlight(p, 1 / 60);
  assert.equal(p.flashlightCharge, 120);
  assert.equal(p.spareBatteries, 2);
  sim.action('p', { type: 'flashlight' });
  sim.updateFlashlight(p, 10);
  assert.equal(p.flashlightCharge, 120, 'off means no drain');
  sim.advanceChapter();
  assert.equal(p.flashlightUnlocked, true);
  assert.equal(p.spareBatteries, 2);
  sim.updateWaves(5);
  p.spareBatteries = 0;
  p.flashlight = true;
  p.flashlightCharge = 0.01;
  sim.updateFlashlight(p, 1 / 60);
  assert.equal(p.flashlight, false);
  assert.equal(sim.action('p', { type: 'flashlight' }), false);
  assert.ok(buy('battery'));
  assert.ok(sim.action('p', { type: 'flashlight' }));
  assert.equal(p.flashlightCharge, 120);
});
test('weapon categories classify the entire arsenal including Barrett, P90, TEC-9 and shotguns', () => {
  assert.equal(weaponCategory('barrett'), 'snipers');
  assert.equal(weaponCategory('p90'), 'smgs');
  assert.equal(weaponCategory('tec9'), 'pistols');
  assert.equal(weaponCategory('raven'), 'rifles');
  assert.equal(weaponCategory('benelli'), 'shotguns');
  for (const id of Object.keys(WEAPONS)) {
    assert.ok(['pistols', 'smgs', 'rifles', 'snipers', 'shotguns'].includes(weaponCategory(id)));
    assert.equal(SHOP_ITEMS.find((i) => i.weapon === id).weaponCategory, weaponCategory(id));
  }
});
