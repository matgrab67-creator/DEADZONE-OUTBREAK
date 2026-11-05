import { ForestWorld } from '../../shared/Forest.js';
export class TacticalMap {
  constructor(container, ping, settings) {
    this.container = container;
    this.settings = settings;
    this.ping = ping;
    container.innerHTML =
      '<button id="map-close" class="shop-close" aria-label="Zamknij mapę">×</button><span class="eyebrow">OBÓZ 07 / ROZPOZNANIE TERENU</span><h2>MAPA TAKTYCZNA</h2><p class="muted">Kliknij, aby postawić wspólny znacznik na 45 sekund. M lub Esc zamyka mapę. Skrytki pozostają ukryte do odnalezienia.</p><canvas id="tactical-canvas" width="720" height="560" aria-label="Interaktywna mapa lasu"></canvas><p id="map-legend" class="muted">Jasny punkt — ty · zielone — drużyna · złote — znaczniki · czerwone — cel wyprawy.</p>';
    this.canvas = container.querySelector('canvas');
    this.canvas.addEventListener('click', (e) => {
      if (!this.edge) return;
      const r = this.canvas.getBoundingClientRect();
      ping(
        ((e.clientX - r.left) / r.width) * this.edge * 2 - this.edge,
        ((e.clientY - r.top) / r.height) * this.edge * 2 - this.edge,
      );
    });
  }
  update(state, p) {
    if (!state.forest) return;
    const f = state.forest,
      key = `${f.seed}:${f.ring}:${Math.floor(state.time * 5)}:${state.pings?.length}:${p.x.toFixed(1)}:${p.z.toFixed(1)}`;
    if (key === this.last) return;
    this.last = key;
    if (this.world?.seed !== f.seed) this.world = new ForestWorld(f.seed);
    this.world.ensure(f.ring);
    this.edge = (f.ring + 0.5) * 24;
    const c = this.canvas.getContext('2d'),
      w = this.canvas.width,
      h = this.canvas.height,
      px = (x) => ((x + this.edge) / (this.edge * 2)) * w,
      pz = (z) => ((z + this.edge) / (this.edge * 2)) * h;
    c.fillStyle = '#15221a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7b896143';
    c.lineWidth = 1;
    for (let x = -f.ring; x <= f.ring; x++) {
      const a = px(x * 24 - 12),
        b = pz(x * 24 - 12);
      c.beginPath();
      c.moveTo(a, 0);
      c.lineTo(a, h);
      c.moveTo(0, b);
      c.lineTo(w, b);
      c.stroke();
    }
    c.fillStyle = '#bfbb8a';
    c.fillRect(px(-27), pz(-20), (54 / (this.edge * 2)) * w, (40 / (this.edge * 2)) * h);
    for (const chunk of this.world.chunks.values())
      if (chunk.poi && Math.hypot(chunk.poi.x - p.x, chunk.poi.z - p.z) < 38) {
        c.fillStyle = '#b7b79a';
        c.fillRect(px(chunk.poi.x) - 3, pz(chunk.poi.z) - 3, 6, 6);
      }
    const dot = (x, z, color, r = 5) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(px(x), pz(z), r, 0, Math.PI * 2);
      c.fill();
    };
    for (const player of state.players)
      dot(
        player.x,
        player.z,
        player.id === p.id ? '#fff6d3' : '#8cbf83',
        player.id === p.id ? 6 : 4,
      );
    for (const mark of state.pings || []) {
      dot(mark.x, mark.z, '#edc86f', 7);
      c.strokeStyle = '#edc86f';
      c.strokeRect(px(mark.x) - 10, pz(mark.z) - 10, 20, 20);
    }
    if (state.contract?.x !== undefined) dot(state.contract.x, state.contract.z, '#dc8268', 8);
    c.fillStyle = '#d6d1b4';
    c.font = '13px Consolas';
    c.fillText('N', w / 2, 20);
    c.fillText(this.settings.language === 'en' ? 'CAMP 07' : 'OBÓZ 07', px(0) - 25, pz(0) + 5);
  }
}
