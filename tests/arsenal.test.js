import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics } from '../shared/Physics.js';
import { Simulation } from '../shared/Simulation.js';
import { makeInventory, WEAPONS } from '../shared/config.js';
import { spreadFor, recordShot } from '../shared/Ballistics.js';
import { STATIONS, obstacles, blocked } from '../shared/map.js';
import { WEAPON_AUDIO, prepareRecording, renderWeaponSample } from '../src/audio/WeaponAudio.js';

before(async () => await initPhysics());
const ids = ['glock17', 'beretta92', 'mp5', 'p90', 'scarh', 'aug', 'barrett'];

test('all new firearms have reachable free stations, authoritative prices and individual audio', () => {
  for (const id of ids) {
    const station = STATIONS.find((s) => s.weapon === id);
    assert.equal(station?.price, WEAPONS[id].price, `${id}: station/catalogue price`);
    assert.equal(
      blocked(station.x, station.z + 1.25, obstacles(), 0.32),
      false,
      `${id}: blocked approach`,
    );
    assert.ok(WEAPON_AUDIO[id]);
    assert.ok(WEAPONS[id].description);
  }
  assert.equal(WEAPONS.raven.name, 'AK-47');
  assert.equal(WEAPONS.barrett.price, 6000);
  assert.equal(WEAPONS.p90.magazine, 50);
  assert.equal(WEAPONS.mp5.rate, 60 / 800);
});

test('Barrett hits actually deal 210 body / 650 head damage before upgrades, perks and armour', (t) => {
  const sim = new Simulation(),
    p = sim.addPlayer('p');
  t.after(() => sim.dispose());
  p.inventory = [makeInventory('barrett')];
  p.aimAlpha = 1;
  p.grounded = true;
  const z = sim.spawnZombie('normal');
  z.x = p.x;
  z.z = p.z - 3;
  z.hp = 3000;
  sim.time = z.emergeEnd;
  p.pitch = Math.atan2(1.116 - (p.y + 1.58), 3);
  sim.fire(p, { ads: true });
  assert.equal(3000 - z.hp, 210);
  assert.equal(p.inventory[0].ammo, 9);
  sim.fire(p, { ads: true });
  assert.equal(p.inventory[0].ammo, 9, 'cooldown prevents a second immediate shot');
  sim.time += 2;
  p.pitch = 0;
  sim.fire(p, { ads: true });
  assert.equal(3000 - z.hp, 860);
  p.perks.push('deadeye');
  sim.time += 2;
  sim.fire(p, { ads: true });
  assert.equal(3000 - z.hp, 1770, 'headshot perks still apply to the explicit base head damage');
});

test('P90 retains the narrowest running cone under sustained SMG fire, but jumping is inaccurate', () => {
  const running = (id) => ({
    inventory: [makeInventory(id)],
    slot: 0,
    vx: 4.6,
    vz: 0,
    grounded: true,
    aimAlpha: 0,
    crouch: false,
  });
  const p90 = running('p90'),
    mp5 = running('mp5');
  for (let i = 0; i < 12; i++) {
    recordShot(p90.inventory[0], i * 0.07);
    recordShot(mp5.inventory[0], i * 0.07);
  }
  const cone = spreadFor(p90, {}, 0.8).aim;
  assert.ok(cone < spreadFor(mp5, {}, 0.8).aim * 0.7);
  p90.grounded = false;
  assert.ok(spreadFor(p90, {}, 0.8).aim > cone * 2);
});

test('automatic fire keeps its specified RPM despite the 60 Hz simulation step', (t) => {
  const sim = new Simulation(),
    p = sim.addPlayer('p');
  t.after(() => sim.dispose());
  for (const id of ['mp5', 'p90', 'scarh', 'aug']) {
    p.inventory = [makeInventory(id)];
    p.inventory[0].ammo = 1000;
    p.lastFire = -100;
    p.fireWeapon = null;
    for (let tick = 0; tick < 240; tick++) {
      sim.time = tick / 60;
      sim.fire(p, {});
    }
    const shots = 1000 - p.inventory[0].ammo;
    assert.ok(Math.abs(shots - 4 / WEAPONS[id].rate) < 1, `${id}: ${shots} shots / 4s`);
  }
});

test('recorded shot editing trims silence, is deterministic, varies each gun and never clips', () => {
  const rate = 22050,
    data = new Float32Array(rate);
  for (let i = 1000; i < data.length; i++)
    data[i] = Math.sin(i * 0.37) * Math.exp(-(i - 1000) / 1700);
  const recording = prepareRecording({
    length: data.length,
    numberOfChannels: 1,
    sampleRate: rate,
    getChannelData: () => data,
  });
  assert.ok(recording.data.length < data.length - 900);
  const fingerprints = new Set();
  for (const [id, profile] of Object.entries(WEAPON_AUDIO)) {
    const samples = renderWeaponSample(recording, profile, 0, rate);
    assert.ok(samples.every(Number.isFinite), `${id}: invalid waveform`);
    let peak = 0,
      energy = 0;
    for (const value of samples) {
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    assert.ok(peak <= 0.821 && peak > 0.7, `${id}: gain normalization`);
    assert.ok(energy > 1);
    fingerprints.add(`${samples.length}:${energy.toFixed(5)}`);
    assert.deepEqual(samples, renderWeaponSample(recording, profile, 0, rate));
    assert.notDeepEqual(samples, renderWeaponSample(recording, profile, 1, rate));
  }
  assert.equal(fingerprints.size, Object.keys(WEAPONS).length);
});
