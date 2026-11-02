import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { initPhysics } from '../shared/Physics.js';
import { GameRoom } from './GameRoom.js';

export async function createGameServer({
  port = Number(process.env.PORT || 3001),
  host = process.env.HOST || '0.0.0.0',
} = {}) {
  await initPhysics();
  const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
  };
  const http = createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!(await stat(file)).isFile()) throw new Error();
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end(
        'Frontend not found. Run npm run dev, or npm run build to serve the production game here.',
      );
    }
  });
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim());
  const io = new Server(http, {
    maxHttpBufferSize: 8192,
    cors: allowed ? { origin: allowed } : undefined,
    serveClient: false,
  });
  const rooms = new Map();
  const leave = (socket) => {
    const room = rooms.get(socket.data.room);
    if (room) {
      socket.leave(room.code);
      room.remove(socket.id);
      if (!room.members.size) {
        room.dispose();
        rooms.delete(room.code);
      }
    }
    socket.data.room = null;
  };
  io.on('connection', (socket) => {
    let windowStart = performance.now(),
      inputCount = 0,
      actionCount = 0,
      managementCount = 0;
    const limit = (type) => {
      if (performance.now() - windowStart >= 1000) {
        windowStart = performance.now();
        inputCount = 0;
        actionCount = 0;
        managementCount = 0;
      }
      return type === 'input'
        ? ++inputCount <= 90
        : type === 'action'
          ? ++actionCount <= 20
          : ++managementCount <= 8;
    };
    const handle = (event, fn) =>
      socket.on(event, (data, ack) => {
        try {
          if (!limit('management')) throw new Error('Please wait a moment.');
          const value = fn(data);
          if (typeof ack === 'function') ack({ ok: true, ...value });
        } catch (error) {
          if (typeof ack === 'function') ack({ ok: false, error: error.message });
        }
      });
    handle('create', (data) => {
      if (rooms.size >= 100) throw new Error('Server room limit reached.');
      leave(socket);
      let code;
      do {
        code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      } while (rooms.has(code));
      const room = new GameRoom(code, io);
      rooms.set(code, room);
      room.add(socket, cleanName(data?.name));
      return { lobby: room.lobby() };
    });
    handle('join', (data) => {
      if (typeof data?.code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(data.code.trim()))
        throw new Error('Enter a six-character room code.');
      const room = rooms.get(data.code.trim().toUpperCase());
      if (!room) throw new Error('Squad not found. Check the room code.');
      if (room.members.size >= 4 || room.sim) throw new Error('Squad is full or already deployed.');
      leave(socket);
      room.add(socket, cleanName(data?.name));
      return { lobby: room.lobby() };
    });
    handle('ready', (data) => {
      const room = rooms.get(socket.data.room),
        member = room?.members.get(socket.id);
      if (!member) throw new Error('Join a squad first.');
      member.ready = data?.ready === true;
      room.broadcastLobby();
      return {};
    });
    handle('start', () => {
      const room = rooms.get(socket.data.room);
      if (!room) throw new Error('Join a squad first.');
      room.start(socket.id);
      return {};
    });
    handle('leave', () => {
      leave(socket);
      return {};
    });
    socket.on('input', (data) => {
      if (!limit('input')) return;
      const room = rooms.get(socket.data.room);
      if (room?.sim?.input(socket.id, data)) room.lastInput.set(socket.id, performance.now());
    });
    socket.on('action', (data) => {
      if (limit('action')) rooms.get(socket.data.room)?.sim?.action(socket.id, data);
    });
    socket.on('disconnect', () => leave(socket));
  });
  let last = performance.now(),
    acc = 0,
    ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= 1 / 60) {
      for (const room of rooms.values()) room.tick(1 / 60);
      acc -= 1 / 60;
      if (++ticks % 3 === 0) for (const room of rooms.values()) room.broadcast();
    }
  }, 1000 / 60);
  await new Promise((accept, reject) => {
    http.once('error', reject);
    http.listen(port, host, accept);
  });
  return {
    http,
    io,
    rooms,
    port: http.address().port,
    close: async () => {
      clearInterval(timer);
      for (const room of rooms.values()) room.dispose();
      await new Promise((r) => io.close(r));
    },
  };
}
function cleanName(name) {
  return (
    (typeof name === 'string' ? name : 'OPERATOR')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .slice(0, 18) || 'OPERATOR'
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createGameServer();
  console.log(`DEADZONE authoritative server → http://localhost:${server.port}`);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
      await server.close();
      process.exit(0);
    });
}
