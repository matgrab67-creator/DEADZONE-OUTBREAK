import { WeaponAudio } from './WeaponAudio.js';
import { forestWeather, pathDistance } from '../../shared/Forest.js';

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
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -9;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.16;
      this.master.connect(this.compressor).connect(this.context.destination);
      this.weaponAudio = new WeaponAudio(this.context, this.master);
      this.loading = this.weaponAudio.load();
      this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ambience = this.context.createBufferSource();
      this.ambience.buffer = this.noise;
      this.ambience.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      this.windGain = this.context.createGain();
      this.windGain.gain.value = 0.06;
      this.ambience.connect(filter).connect(this.windGain).connect(this.master);
      this.ambience.start();
      const rain = this.context.createBufferSource();
      rain.buffer = this.noise;
      rain.loop = true;
      const rainFilter = this.context.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 1700;
      this.rainGain = this.context.createGain();
      this.rainGain.gain.value = 0;
      rain.connect(rainFilter).connect(this.rainGain).connect(this.master);
      rain.start();
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
    if (this.weaponAudio?.shoot(id, position)) return;
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
    if (e.type === 'spawn')
      this.sound({ noise: true, duration: 0.35, volume: 0.08, filter: 550, position: e });
    if (e.type === 'scream')
      this.sound({
        frequency: 310,
        end: 730,
        duration: 0.75,
        volume: 0.13,
        type: 'sawtooth',
        filter: 1200,
        position: e,
      });
    if (e.type === 'spit' || e.type === 'acidImpact')
      this.sound({ noise: true, duration: 0.22, volume: 0.1, filter: 2100, position: e });
    if (e.type === 'kill' || e.type === 'landing')
      this.sound({ noise: true, duration: 0.16, volume: 0.1, filter: 330, position: e });
    if (e.type === 'shot') this.shoot(e.weapon, position);
    else if (e.type === 'reload') {
      if (e.player === local) {
        this.weaponAudio?.reload(e.weapon, e.duration);
      }
    } else if (e.type === 'weapon' && e.player === local) this.weaponAudio?.cancelReload();
    else if (e.type === 'empty' && e.player === local)
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
  update(p, zombies, time, forest = null) {
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
      this.sound({
        noise: true,
        duration: forest && pathDistance(p.x, p.z) > 3 ? 0.09 : 0.055,
        volume: p.crouch ? 0.015 : 0.055,
        filter: forest && pathDistance(p.x, p.z) > 3 ? 850 : 450,
      });
    }
    if (forest) {
      const weather = forestWeather(forest.seed, time);
      this.windGain?.gain.setTargetAtTime(
        0.035 + weather.wind * 0.045,
        this.context.currentTime,
        0.8,
      );
      this.rainGain?.gain.setTargetAtTime(weather.rain * 0.07, this.context.currentTime, 0.5);
      if (weather.thunder && time - (this.lastThunder ?? -100) > 10) {
        this.lastThunder = time;
        this.sound({ noise: true, duration: 2.2, volume: 0.18, filter: 170 });
      }
      if (time - (this.lastBird ?? 0) > 13 && weather.daylight > 0.4 && weather.rain < 0.2) {
        this.lastBird = time;
        const position = { x: p.x + 12, y: 5, z: p.z - 8 };
        this.sound({ frequency: 1900, end: 2900, duration: 0.14, volume: 0.025, position });
        setTimeout(
          () => this.sound({ frequency: 2700, end: 1700, duration: 0.18, volume: 0.018, position }),
          180,
        );
      }
      if (Math.hypot(p.x + 6, p.z - 3) < 12 && time - (this.lastCrackle ?? 0) > 1) {
        this.lastCrackle = time;
        this.sound({
          noise: true,
          duration: 0.14,
          volume: 0.025,
          filter: 1600,
          position: { x: -6, y: 0.4, z: 3 },
        });
      }
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
    this.weaponAudio?.cancelReload();
    if (this.context?.state === 'running') this.context.suspend();
  }
}
