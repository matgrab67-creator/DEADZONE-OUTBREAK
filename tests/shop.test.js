import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation } from '../shared/Simulation.js';
import { makeInventory, WEAPONS } from '../shared/config.js';
import { STATIONS } from '../shared/map.js';
import { SHOP_BY_ID, shopStatus } from '../shared/Shop.js';

before(async () => await initPhysics());
const setup = (t) => {
  const sim = new Simulation(),
    p = sim.addPlayer('p');
  t.after(() => sim.dispose());
  return { sim, p };
};
test('a weapon must be unlocked at its physical station before buying anywhere', (t) => {
  const { sim, p } = setup(t);
  p.points = 699;
  assert.equal(
    sim.action('p', {
      type: 'shopBuy',
      item: 'weapon:raven',
      price: 0,
      unlockedWeapons: ['raven'],
    }),
    false,
  );
  assert.equal(p.points, 699);
  assert.equal(p.inventory.length, 1);
  p.points = 3000;
  p.x = -11.2;
  p.z = 16;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.equal(p.points, 3000);
  assert.equal(p.inventory.length, 1);
  assert.ok(p.unlockedWeapons.includes('raven'));
  p.x = -18;
  p.z = 15;
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'weapon:raven', price: 0 }));
  assert.equal(p.points, 3000 - WEAPONS.raven.price);
  assert.equal(p.inventory[p.slot].id, 'raven');
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'weapon:raven' }));
  assert.equal(p.points, 3000 - WEAPONS.raven.price, 'equipping an owned weapon must be free');
});
test('new weapons have balanced prices and unlock only at their matching stations', (t) => {
  const { sim, p } = setup(t);
  p.points = 10000;
  for (const id of [
    'desertEagle',
    'tec9',
    'scout',
    'pbs1',
    'glock17',
    'beretta92',
    'mp5',
    'p90',
    'scarh',
    'aug',
    'barrett',
  ]) {
    const station = STATIONS.find((item) => item.weapon === id);
    assert.ok(station, `${id} has a physical unlock station`);
    assert.equal(station.price, WEAPONS[id].price);
    p.x = station.x;
    p.z = station.z + 1.5;
    sim.time += 1;
    assert.ok(sim.action('p', { type: 'interact' }), `${id} blueprint unlocks at its station`);
    assert.ok(p.unlockedWeapons.includes(id));
    assert.ok(sim.action('p', { type: 'shopBuy', item: `weapon:${id}` }));
    assert.equal(p.inventory[p.slot].id, id);
    assert.equal(p.points, 10000 - WEAPONS[id].price);
    p.points = 10000;
  }
});
test('locked weapon blueprints cost 70% and do not include the firearm purchase', (t) => {
  const { sim, p } = setup(t);
  const item = SHOP_BY_ID.get('weapon:pbs1'),
    blueprintPrice = Math.round(WEAPONS.pbs1.price * 0.7);
  p.points = blueprintPrice - 1;
  assert.equal(shopStatus(p, item).label, 'BLUEPRINT LOCKED');
  assert.equal(sim.action('p', { type: 'shopBuy', item: item.id }), false);
  assert.equal(p.points, blueprintPrice - 1);
  assert.equal(p.unlockedWeapons.includes('pbs1'), false);

  p.points = blueprintPrice;
  assert.equal(shopStatus(p, item).label, 'BUY BLUEPRINT');
  assert.ok(sim.action('p', { type: 'shopBuy', item: item.id }));
  assert.equal(p.points, 0);
  assert.ok(p.unlockedWeapons.includes('pbs1'));
  assert.equal(p.inventory.length, 1);
  assert.equal(p.inventory[0].id, 'vx9');

  p.points = WEAPONS.pbs1.price - 1;
  assert.equal(sim.action('p', { type: 'shopBuy', item: item.id }), false);
  assert.equal(p.points, WEAPONS.pbs1.price - 1);
  p.points = WEAPONS.pbs1.price;
  assert.ok(sim.action('p', { type: 'shopBuy', item: item.id }));
  assert.equal(p.points, 0);
  assert.equal(p.inventory[p.slot].id, 'pbs1');
});
test('blueprints are personal, free even without points, and reset with a new match', (t) => {
  const { sim, p } = setup(t);
  const peer = sim.addPlayer('q');
  p.points = 0;
  p.x = -11.2;
  p.z = 16;
  assert.ok(sim.action('p', { type: 'interact' }));
  assert.ok(p.unlockedWeapons.includes('raven'));
  assert.deepEqual(peer.unlockedWeapons, ['vx9']);
  assert.equal(sim.action('p', { type: 'shopBuy', item: 'weapon:raven' }), false);
  const snapshot = sim.snapshot();
  snapshot.players[0].unlockedWeapons.push('lynx');
  assert.equal(p.unlockedWeapons.includes('lynx'), false);
});
test('supplies can be bought while solo is paused, and full supplies never charge twice', (t) => {
  const { sim, p } = setup(t);
  p.points = 4000;
  p.hp = 20;
  p.armor = 0;
  p.grenades = 0;
  p.inventory[0].reserve = 0;
  const time = sim.time;
  for (const item of ['ammo', 'armor', 'health', 'grenades'])
    assert.ok(sim.action('p', { type: 'shopBuy', item }));
  assert.equal(sim.time, time);
  assert.equal(p.hp, 100);
  assert.equal(p.armor, 100);
  assert.equal(p.grenades, 2);
  assert.equal(p.inventory[0].reserve, WEAPONS.vx9.reserve);
  const points = p.points;
  for (const item of ['ammo', 'armor', 'health'])
    assert.equal(sim.action('p', { type: 'shopBuy', item }), false);
  assert.equal(p.points, points);
});
test('store prices, perk uniqueness, upgrades and dead-player restrictions are authoritative', (t) => {
  const { sim, p } = setup(t);
  p.points = 5000;
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'perk:heart', price: -9999 }));
  assert.equal(p.points, 3500);
  assert.equal(p.maxHp, 180);
  assert.equal(sim.action('p', { type: 'shopBuy', item: 'perk:heart' }), false);
  assert.equal(p.points, 3500);
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'upgrade' }));
  assert.equal(p.points, 1000);
  assert.equal(p.inventory[0].ammo, 21);
  assert.equal(sim.action('p', { type: 'shopBuy', item: 'upgrade' }), false);
  for (const item of ['missing', null, {}, '__proto__'])
    assert.equal(sim.action('p', { type: 'shopBuy', item }), false);
  p.downed = true;
  assert.equal(sim.action('p', { type: 'shopBuy', item: 'armor' }), false);
  assert.equal(p.points, 1000);
});
test('full inventories replace the selected slot without losing the other weapons', (t) => {
  const { sim, p } = setup(t);
  p.points = 5000;
  p.inventory = [makeInventory('vx9'), makeInventory('raven'), makeInventory('iron')];
  p.slot = 1;
  p.unlockedWeapons.push('lynx');
  assert.ok(sim.action('p', { type: 'shopBuy', item: 'weapon:lynx' }));
  assert.deepEqual(
    p.inventory.map((i) => i.id),
    ['vx9', 'lynx', 'iron'],
  );
  assert.equal(p.points, 5000 - WEAPONS.lynx.price);
});
