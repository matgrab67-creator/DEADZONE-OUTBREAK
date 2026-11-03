export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.lastGroan = 0;
    this.lastStep = 0;
  }
  async start() {
    if (!this.context) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.context = new C();
      this.master = this.context.createGain();
      this.master.gain.value = this.settings.volume;
      this.master.connect(this.context.destination);
      this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ambience = this.context.createOscillator();
      this.ambience.type = 'sine';
      this.ambience.frequency.value = 48;
      const gain = this.context.createGain();
      gain.gain.value = 0.035;
      this.ambience.connect(gain).connect(this.master);
      this.ambience.start();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  volume(v) {
    this.settings.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  sound({
    frequency = 160,
    duration = 0.12,
    volume = 0.15,
    noise = false,
    type = 'sine',
    end = 30,
    position = null,
    filter = 3000,
  } = {}) {
    const c = this.context;
    if (!c || c.state !== 'running') return;
    const source = noise ? c.createBufferSource() : c.createOscillator();
    if (noise) source.buffer = this.noise;
    else {
      source.type = type;
      source.frequency.setValueAtTime(frequency, c.currentTime);
      source.frequency.exponentialRampToValueAtTime(Math.max(1, end), c.currentTime + duration);
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    source.connect(lp).connect(gain);
    let panner = null;
    if (position) {
      panner = c.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3;
      panner.maxDistance = 45;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y || 1;
      panner.positionZ.value = position.z;
      gain.connect(panner).connect(this.master);
    } else gain.connect(this.master);
    source.onended = () => {
      source.disconnect();
      lp.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
    source.start();
    source.stop(c.currentTime + duration);
  }
  shoot(id, position) {
    const heavy = id === 'iron' || id === 'lynx' || id === 'scout' || id === 'desertEagle',
      suppressed = id === 'spectre' || id === 'pbs1';
    this.sound({
      noise: true,
      duration: suppressed ? 0.08 : heavy ? 0.27 : 0.13,
      volume: suppressed ? 0.16 : heavy ? 0.48 : 0.3,
      filter: suppressed ? 800 : 3800,
      position,
    });
    this.sound({
      frequency: heavy ? 100 : 180,
      duration: 0.1,
      volume: suppressed ? 0.08 : 0.2,
      type: 'triangle',
      end: 35,
      position,
    });
  }
  event(e, local) {
    const position = e.player === local ? null : e.origin;
    if (e.type === 'shot') this.shoot(e.weapon, position);
    else if (e.type === 'reload') {
      if (e.player === local) {
        this.sound({ noise: true, duration: 0.13, volume: 0.13, filter: 1600 });
        setTimeout(
          () =>
            this.sound({ frequency: 420, duration: 0.07, volume: 0.09, type: 'square', end: 120 }),
          e.duration * 700,
        );
      }
    } else if (e.type === 'empty' && e.player === local)
      this.sound({ frequency: 240, duration: 0.03, type: 'square', volume: 0.09 });
    else if (e.type === 'knife' && e.player === local) {
      this.sound({ noise: true, duration: 0.16, volume: 0.1, filter: 1800 });
      if (e.hit) this.sound({ noise: true, duration: 0.1, volume: 0.16, filter: 470 });
    } else if (e.type === 'hit' && e.player === local)
      this.sound({ frequency: e.head ? 1450 : 800, duration: 0.045, volume: 0.065, end: 500 });
    else if (e.type === 'damage' && e.player === local)
      this.sound({ frequency: 80, duration: 0.2, volume: 0.22, type: 'triangle', end: 35 });
    else if (e.type === 'purchase' && e.player === local) {
      this.sound({ frequency: 500, end: 900, duration: 0.15, volume: 0.12 });
      setTimeout(() => this.sound({ frequency: 900, end: 1200, duration: 0.2, volume: 0.09 }), 100);
    } else if (e.type === 'round') {
      this.sound({
        frequency: e.boss ? 90 : 220,
        end: e.boss ? 60 : 110,
        duration: 1.2,
        volume: 0.2,
        type: 'sawtooth',
        filter: 700,
      });
    } else if (e.type === 'explosion')
      this.sound({
        noise: true,
        duration: 0.6,
        volume: 0.65,
        filter: 650,
        position: { x: e.x, z: e.z },
      });
    else if (e.type === 'bosswindup')
      this.sound({
        frequency: 120,
        end: 600,
        duration: 1.2,
        type: 'sawtooth',
        volume: 0.13,
        position: e,
        filter: 900,
      });
  }
  update(p, zombies, time) {
    if (!this.context) return;
    const l = this.context.listener;
    for (const [axis, value] of [
      ['X', p.x],
      ['Y', p.y + 1.5],
      ['Z', p.z],
    ])
      if (l[`position${axis}`]) l[`position${axis}`].value = value;
    if (l.forwardX) {
      l.forwardX.value = -Math.sin(p.yaw);
      l.forwardZ.value = -Math.cos(p.yaw);
    }
    if (
      Math.hypot(p.vx, p.vz) > 0.8 &&
      p.grounded &&
      time - this.lastStep > (p.crouch ? 0.65 : 0.43)
    ) {
      this.lastStep = time;
      this.sound({ noise: true, duration: 0.055, volume: p.crouch ? 0.015 : 0.055, filter: 450 });
    }
    if (zombies.length && time - this.lastGroan > 3.5) {
      this.lastGroan = time;
      const z = zombies[Math.floor(Math.random() * zombies.length)];
      this.sound({
        frequency: 55 + Math.random() * 30,
        end: 35,
        duration: 0.7,
        type: 'sawtooth',
        volume: 0.12,
        filter: 240,
        position: z,
      });
    }
  }
  stop() {
    if (this.context?.state === 'running') this.context.suspend();
  }
}
