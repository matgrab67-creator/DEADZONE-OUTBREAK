import { Simulation } from '../shared/Simulation.js';

export class GameRoom {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.members = new Map();
    this.host = null;
    this.sim = null;
    this.lastInput = new Map();
  }
  add(socket, name) {
    if (this.members.size >= 4) throw new Error('This squad is full.');
    if (this.sim) throw new Error('This squad is already in a match.');
    this.members.set(socket.id, { id: socket.id, name, ready: false });
    this.host ||= socket.id;
    socket.join(this.code);
    socket.data.room = this.code;
    this.broadcastLobby();
  }
  remove(id) {
    this.members.delete(id);
    this.sim?.removePlayer(id);
    this.lastInput.delete(id);
    if (this.host === id) this.host = this.members.keys().next().value || null;
    this.broadcastLobby();
  }
  lobby() {
    return {
      code: this.code,
      host: this.host,
      players: [...this.members.values()],
      playing: !!this.sim,
    };
  }
  broadcastLobby() {
    this.io.to(this.code).emit('lobby', this.lobby());
  }
  start(id) {
    if (id !== this.host) throw new Error('Only the host can start the match.');
    if (this.sim?.state === 'playing') throw new Error('Match already running.');
    if (![...this.members.values()].every((p) => p.ready))
      throw new Error('Every operator must be ready.');
    this.sim?.dispose();
    this.sim = new Simulation({ multiplayer: true });
    for (const member of this.members.values()) this.sim.addPlayer(member.id, member.name);
    this.io.to(this.code).emit('started', this.sim.snapshot());
  }
  tick(dt) {
    if (!this.sim) return;
    for (const [id, t] of this.lastInput)
      if (performance.now() - t > 350) {
        const p = this.sim.players.get(id);
        this.sim.input(id, { seq: p?.ack || 0, yaw: p?.yaw || 0, pitch: p?.pitch || 0 });
      }
    this.sim.tick(dt);
  }
  broadcast() {
    if (this.sim)
      this.io
        .to(this.code)
        .emit('snapshot', { ...this.sim.snapshot(), events: this.sim.takeEvents() });
  }
  dispose() {
    this.sim?.dispose();
  }
}
