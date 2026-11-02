import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { createGameServer } from '../server/index.js';

const request = (socket, event, data = {}) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(event, data, (error, result) => (error ? reject(error) : resolve(result))),
  );
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
