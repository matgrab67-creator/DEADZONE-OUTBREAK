import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { createGameServer } from '../server/index.js';
import { WEAPONS } from '../shared/config.js';
import { BASIC_WEAPONS } from '../shared/WeaponProgression.js';

const request = (socket, event, data = {}) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(event, data, (error, result) => (error ? reject(error) : resolve(result))),
  );
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const snapshotWhere = (socket, predicate) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('snapshot', listen);
      reject(new Error('Snapshot predicate timed out'));
    }, 3000);
    function listen(state) {
      if (predicate(state)) {
        clearTimeout(timer);
        socket.off('snapshot', listen);
        resolve(state);
      }
    }
    socket.on('snapshot', listen);
  });

test('two co-op clients receive the same chapter transfer and synchronized emergence / hazards', async (t) => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  const clients = [];
  t.after(async () => {
    clients.forEach((c) => c.disconnect());
    await server.close();
  });
  for (let i = 0; i < 2; i++) {
    const socket = io(`http://127.0.0.1:${server.port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(socket);
    await once(socket, 'connect');
  }
  const [a, b] = clients,
    created = await request(a, 'create');
  await request(b, 'join', { code: created.lobby.code });
  await request(a, 'ready', { ready: true });
  await request(b, 'ready', { ready: true });
  await request(a, 'start');
  const sim = server.rooms.get(created.lobby.code).sim;
  const pa = sim.players.get(a.id),
    pb = sim.players.get(b.id);
  pa.points = 1100;
  pb.points = 2200;
  sim.round = 15;
  sim.phase = 'wave';
  sim.toSpawn = 0;
  sim.zombies.clear();
  const chapterSnapshot = (socket) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No chapter snapshot')), 3000);
      const listen = (state) => {
        if (state.chapter === 2) {
          clearTimeout(timer);
          socket.off('snapshot', listen);
          resolve(state);
        }
      };
      socket.on('snapshot', listen);
    });
  const [sa, sb] = await Promise.all([chapterSnapshot(a), chapterSnapshot(b)]);
  for (const state of [sa, sb]) {
    assert.equal(state.phase, 'chapter');
    assert.equal(state.wave, 1);
    assert.equal(state.players.find((p) => p.id === a.id).points, 1700);
    assert.equal(state.players.find((p) => p.id === b.id).points, 2800);
    assert.deepEqual(
      state.players.map((p) => p.chapter),
      [2, 2],
    );
  }
  a.emit('action', { type: 'grenade' });
  await wait(50);
  assert.equal(pa.grenades, 3);
  sim.countdown = 0;
  sim.updateWaves(1 / 60);
  sim.countdown = 10000;
  const zombie = sim.spawnZombie('spitter');
  sim.addHazard({ x: -24, z: 4 }, 'acid', 1.5, 4, 5);
  const snapshot = await snapshotWhere(b, (s) => s.zombies.some((z) => z.id === zombie.id));
  assert.ok(snapshot.zombies.find((z) => z.id === zombie.id).emergeEnd > snapshot.time);
  assert.equal(snapshot.hazards[0].type, 'acid');
  assert.ok(sim.physics.statics.has('camp-shelter'));
  assert.equal(snapshot.forest.seed, sa.forest.seed);
  assert.equal(snapshot.forest.ring, 5);
  a.emit('action', {
    type: 'skins',
    loadout: { raven: 'sovereign', 'knife:stiletto': 'aurora' },
    knife: 'stiletto',
  });
  const cosmetics = await snapshotWhere(
    b,
    (s) => s.players.find((p) => p.id === a.id).skins.raven === 'sovereign',
  );
  assert.equal(cosmetics.players.find((p) => p.id === a.id).skinKnife, 'stiletto');
  const route = sim.forest.routes()[0];
  assert.ok(route);
  pa.x = route.x;
  pa.z = route.z + 1.6;
  pa.resources = { wood: 20, scrap: 20, parts: 10, medicine: 5 };
  a.emit('action', { type: 'interact' });
  const opened = await snapshotWhere(b, (s) => s.forest.routes.includes(route.id));
  assert.equal(opened.forest.seed, sa.forest.seed);
  assert.equal(sim.physics.statics.has(route.id), false);
  const cache = sim.forest.chunks.get(route.id.slice(6)).cache;
  pa.x = cache.x;
  pa.z = cache.z + 1.4;
  sim.time += 0.4;
  a.emit('action', { type: 'interact' });
  const looted = await snapshotWhere(b, (s) => s.forest.claimed.includes(cache.id));
  assert.equal(looted.forest.claimed.filter((id) => id === cache.id).length, 1);
  assert.equal(
    looted.players.find((p) => p.id === b.id).resources.scrap,
    8,
    'shared discovery keeps individual inventory',
  );
});
test('real Socket.IO clients create, join, ready, play, validate combat, restart and transfer host', async (t) => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' });
  const sockets = [];
  t.after(async () => {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  });
  async function connect() {
    const socket = io(`http://127.0.0.1:${server.port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    sockets.push(socket);
    await once(socket, 'connect');
    return socket;
  }
  const a = await connect(),
    b = await connect();
  const created = await request(a, 'create', { name: 'ALPHA' });
  assert.ok(created.ok);
  assert.equal(created.lobby.code.length, 6);
  const joined = await request(b, 'join', { code: created.lobby.code, name: 'BRAVO' });
  assert.ok(joined.ok);
  assert.equal(joined.lobby.players.length, 2);
  assert.equal((await request(b, 'start')).ok, false);
  assert.equal((await request(a, 'start')).ok, false);
  await request(a, 'ready', { ready: true });
  await request(b, 'ready', { ready: true });
  const startedA = once(a, 'started'),
    startedB = once(b, 'started');
  assert.ok((await request(a, 'start')).ok);
  const [sa, sb] = await Promise.all([startedA, startedB]);
  assert.equal(sa.players.length, 2);
  assert.deepEqual(
    sa.players.map((p) => p.id),
    sb.players.map((p) => p.id),
  );
  const room = server.rooms.get(created.lobby.code);
  const p = room.sim.players.get(a.id);
  const hp = p.hp,
    points = p.points;
  const ammo = p.inventory[0].ammo;
  a.emit('action', { type: 'purchase', points: 999999 });
  a.emit('action', { type: 'damage', damage: 999999 });
  a.emit('input', { seq: 1, yaw: 0, pitch: 0, points: 999999, hp: 9999, fire: true });
  await wait(130);
  assert.equal(p.points, points);
  assert.equal(p.hp, hp);
  assert.equal(p.inventory[0].ammo, ammo - 1, 'server must enforce weapon cooldown');
  const startZ = p.z;
  a.emit('input', { seq: 2, yaw: 0, pitch: 0, forward: true });
  await wait(200);
  assert.ok(p.z < startZ - 0.2);
  const snapshot = await once(b, 'snapshot');
  assert.ok(snapshot.players.some((o) => o.id === a.id && o.z < startZ));
  // Inactivity must stop stale movement and shooting even if no key-up arrives.
  await wait(650);
  const stopped = p.z;
  await wait(200);
  assert.ok(Math.abs(p.z - stopped) < 0.08);
  room.sim.state = 'over';
  await wait(1000);
  const restart = once(b, 'started');
  assert.ok((await request(a, 'start')).ok);
  const fresh = await restart;
  assert.equal(fresh.round, 0);
  assert.equal(fresh.players[0].points, 500);
  const hostChange = once(b, 'lobby');
  a.disconnect();
  const lobby = await hostChange;
  assert.equal(lobby.host, b.id);
  assert.equal(lobby.players.length, 1);
});
test('room capacity, room code validation and cross-room isolation', async (t) => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' }),
    sockets = [];
  t.after(async () => {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  });
  for (let i = 0; i < 5; i++) {
    const s = io(`http://127.0.0.1:${server.port}`, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await once(s, 'connect');
  }
  const r = await request(sockets[0], 'create', { name: 'HOST' });
  for (let i = 1; i < 4; i++)
    assert.ok((await request(sockets[i], 'join', { code: r.lobby.code })).ok);
  assert.equal((await request(sockets[4], 'join', { code: r.lobby.code })).ok, false);
  assert.equal((await request(sockets[4], 'join', { code: {} })).ok, false);
  const other = await request(sockets[4], 'create');
  assert.notEqual(other.lobby.code, r.lobby.code);
  assert.equal(server.rooms.get(r.lobby.code).members.size, 4);
});

test('co-op shop starts with basic blueprints and validates server prices', async (t) => {
  const server = await createGameServer({ port: 0, host: '127.0.0.1' }),
    sockets = [];
  t.after(async () => {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  });
  for (let i = 0; i < 2; i++) {
    const socket = io(`http://127.0.0.1:${server.port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    sockets.push(socket);
    await once(socket, 'connect');
  }
  const [a, b] = sockets,
    r = await request(a, 'create');
  await request(b, 'join', { code: r.lobby.code });
  await request(a, 'ready', { ready: true });
  await request(b, 'ready', { ready: true });
  await request(a, 'start');
  const sim = server.rooms.get(r.lobby.code).sim,
    p = sim.players.get(a.id),
    peer = sim.players.get(b.id);
  p.points = 699;
  a.emit('action', { type: 'shopBuy', item: 'weapon:raven', price: 0, unlockedWeapons: ['raven'] });
  await wait(80);
  assert.equal(p.points, 699);
  assert.equal(p.inventory.length, 1);
  p.points = 3000;
  p.x = -11.2;
  p.z = 16;
  p.vx = 0;
  p.vz = 0;
  a.emit('action', { type: 'interact' });
  await wait(80);
  assert.ok(p.unlockedWeapons.includes('raven'));
  assert.deepEqual(peer.unlockedWeapons, BASIC_WEAPONS);
  assert.equal(p.points, 3000);
  a.emit('action', { type: 'shopBuy', item: 'weapon:raven', price: -1000 });
  await wait(80);
  assert.equal(p.points, 3000 - WEAPONS.raven.price);
  assert.equal(p.inventory[p.slot].id, 'raven');
  b.emit('action', { type: 'shopBuy', item: 'weapon:raven', points: 99999 });
  await wait(80);
  assert.equal(peer.points, 500);
  assert.equal(peer.inventory.length, 1);
  const snapshot = await once(b, 'snapshot');
  assert.ok(snapshot.players.find((x) => x.id === a.id).unlockedWeapons.includes('raven'));
});
