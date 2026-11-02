import { io } from 'socket.io-client';

export class NetworkManager extends EventTarget {
  constructor() {
    super();
    this.socket = null;
    this.lobby = null;
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  async connect() {
    if (this.socket?.connected) return;
    this.disconnect();
    this.socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
      autoConnect: false,
      timeout: 5000,
      reconnection: false,
      transports: ['websocket', 'polling'],
    });
    for (const event of ['lobby', 'started', 'snapshot'])
      this.socket.on(event, (data) => {
        if (event === 'lobby') this.lobby = data;
        this.emit(event, data);
      });
    this.socket.on('disconnect', () => this.emit('disconnected'));
    await new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('connect_error', () =>
        reject(new Error('Server unavailable. Start npm run server, then try again.')),
      );
      this.socket.connect();
    });
  }
  get id() {
    return this.socket?.id;
  }
  request(type, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to the server.'));
        return;
      }
      this.socket.timeout(5000).emit(type, data, (err, result) => {
        if (err) reject(new Error('Server did not respond.'));
        else if (!result.ok) reject(new Error(result.error));
        else resolve(result);
      });
    });
  }
  sendInput(input) {
    this.socket?.emit('input', input);
  }
  action(action) {
    this.socket?.emit('action', action);
  }
  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.lobby = null;
  }
}
