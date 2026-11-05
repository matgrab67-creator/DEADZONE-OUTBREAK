// Locally bundled, freely licensed recordings. See /audio/CREDITS.md.
export const AUDIO_FILES = {
  pistol: 'pistol-9mm.mp3',
  rifle: 'rifle-556.mp3',
  eagle: 'desert-eagle.mp3',
  ak: 'ak47.opus',
  close: 'rifle-close.opus',
  shotgun: 'shotgun.opus',
  magazine: 'magazine.opus',
  mechanism: 'mechanism.opus',
  pump: 'pump.opus',
};

// Each firearm has an individual recording mix, not just a shared loudness switch.
// [sample, pitch, lowpass Hz, decay seconds, bass Hz, bass amount, action Hz, duration, volume]
const profile = (sample, pitch, cutoff, decay, bass, body, action, duration, volume) => ({
  sample,
  pitch,
  cutoff,
  decay,
  bass,
  body,
  action,
  duration,
  volume,
});
export const WEAPON_AUDIO = {
  m1911: profile('pistol', 0.82, 7300, 0.21, 121, 0.19, 1700, 0.48, 0.6),
  p226: profile('pistol', 0.98, 8600, 0.17, 149, 0.14, 2250, 0.4, 0.54),
  cz75: profile('pistol', 0.96, 8200, 0.18, 143, 0.145, 2080, 0.42, 0.55),
  uzi: profile('pistol', 1.16, 6100, 0.09, 187, 0.085, 3050, 0.26, 0.45),
  vector: profile('pistol', 0.88, 6800, 0.085, 153, 0.15, 3220, 0.27, 0.5),
  benelli: profile('shotgun', 1.02, 8100, 0.28, 77, 0.23, 1110, 0.62, 0.73),
  r870: profile('shotgun', 0.89, 6900, 0.36, 65, 0.27, 840, 0.74, 0.78),
  fal: profile('rifle', 0.79, 9400, 0.26, 86, 0.25, 1330, 0.56, 0.72),
  g36: profile('rifle', 1.05, 8300, 0.18, 125, 0.17, 2170, 0.43, 0.6),
  axmc: profile('rifle', 0.65, 9800, 0.37, 63, 0.33, 970, 0.85, 0.8),
  vx9: profile('pistol', 1.09, 7000, 0.17, 150, 0.11, 2150, 0.38, 0.5),
  desertEagle: profile('eagle', 1, 10500, 0.32, 79, 0.23, 1320, 0.65, 0.73),
  tec9: profile('pistol', 1.18, 5900, 0.105, 175, 0.09, 2750, 0.28, 0.46),
  raven: profile('ak', 1, 8500, 0.22, 105, 0.2, 1550, 0.46, 0.65),
  spectre: profile('rifle', 0.82, 1250, 0.09, 190, 0.065, 3100, 0.24, 0.26),
  vortex: profile('close', 1.4, 6000, 0.11, 165, 0.1, 2800, 0.29, 0.45),
  iron: profile('shotgun', 0.94, 7600, 0.33, 70, 0.25, 920, 0.7, 0.76),
  lynx: profile('rifle', 0.72, 9000, 0.33, 75, 0.27, 1270, 0.72, 0.73),
  scout: profile('rifle', 1.04, 11000, 0.23, 118, 0.17, 1760, 0.53, 0.63),
  pbs1: profile('close', 0.83, 920, 0.14, 120, 0.1, 2470, 0.32, 0.32),
  glock17: profile('pistol', 1.03, 9200, 0.145, 160, 0.12, 2450, 0.36, 0.53),
  beretta92: profile('pistol', 0.93, 7800, 0.19, 138, 0.15, 1880, 0.43, 0.56),
  mp5: profile('pistol', 1.12, 6400, 0.095, 181, 0.09, 2950, 0.27, 0.46),
  p90: profile('rifle', 1.32, 11200, 0.08, 205, 0.075, 3450, 0.24, 0.44),
  scarh: profile('rifle', 0.83, 9200, 0.23, 94, 0.23, 1420, 0.53, 0.69),
  aug: profile('rifle', 1.09, 7900, 0.16, 133, 0.16, 2270, 0.4, 0.59),
  barrett: profile('rifle', 0.57, 10000, 0.44, 52, 0.4, 780, 1.05, 0.88),
};

/** Trim leading silence and normalize once, keeping all runtime shots immediate. */
export function prepareRecording(buffer) {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  let peak = 0;
  for (const value of mono) peak = Math.max(peak, Math.abs(value));
  let onset = mono.findIndex((value) => Math.abs(value) > peak * 0.15);
  onset = Math.max(0, onset - Math.floor(buffer.sampleRate * 0.002));
  return {
    data: mono.subarray(onset),
    rate: buffer.sampleRate,
    scale: 0.85 / Math.max(peak, 0.001),
  };
}

/** Original editing/sound design over a recorded calibre-family shot. No network or nodes per layer. */
export function renderWeaponSample(recording, p, variant, sampleRate) {
  const result = new Float32Array(Math.ceil(p.duration * sampleRate));
  const pitch = p.pitch * [0.985, 1, 1.018][variant % 3];
  const alpha = 1 - Math.exp((-2 * Math.PI * p.cutoff) / sampleRate);
  let low = 0,
    phase = 0,
    peak = 0,
    seed = 1249 + variant * 199;
  for (let i = 0; i < result.length; i++) {
    const t = i / sampleRate,
      index = t * recording.rate * pitch,
      j = Math.floor(index);
    const raw =
      ((recording.data[j] || 0) * (1 - index + j) + (recording.data[j + 1] || 0) * (index - j)) *
      recording.scale;
    low += alpha * (raw - low);
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = (seed >>> 0) / 2147483648 - 1;
    phase += (2 * Math.PI * (p.bass * Math.exp(-t * 16) + 29)) / sampleRate;
    const body = Math.sin(phase) * p.body * Math.exp(-t * 25) * Math.min(1, t * 1600);
    const crack = noise * 0.065 * Math.exp(-t * 360);
    const mechanicalTime = t - 0.032;
    const action =
      mechanicalTime > 0
        ? Math.sin(2 * Math.PI * p.action * mechanicalTime) * Math.exp(-mechanicalTime * 240) * 0.07
        : 0;
    const fade = Math.min(1, (p.duration - t) / 0.045);
    result[i] = (low * Math.exp(-t / p.decay) + body + crack + action) * fade;
    peak = Math.max(peak, Math.abs(result[i]));
  }
  const scale = 0.82 / Math.max(peak, 0.001);
  for (let i = 0; i < result.length; i++) result[i] *= scale;
  return result;
}

export class WeaponAudio {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.recordings = new Map();
    this.shots = new Map();
    this.counter = 0;
    this.failures = [];
    this.reloadSources = new Set();
  }
  async load() {
    const base = import.meta.env?.BASE_URL || '/';
    await Promise.all(
      Object.entries(AUDIO_FILES).map(async ([id, filename]) => {
        try {
          const response = await fetch(`${base}audio/${filename}`, {
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
          this.recordings.set(id, buffer);
        } catch (error) {
          this.failures.push(`${filename}: ${error.message}`);
        }
      }),
    );
    for (const [id, p] of Object.entries(WEAPON_AUDIO)) {
      const source = this.recordings.get(p.sample);
      if (!source) continue;
      const recording = prepareRecording(source);
      this.shots.set(
        id,
        Array.from({ length: 3 }, (_, i) => {
          const data = renderWeaponSample(recording, p, i, this.context.sampleRate);
          const buffer = this.context.createBuffer(1, data.length, this.context.sampleRate);
          buffer.copyToChannel(data, 0);
          return buffer;
        }),
      );
    }
  }
  play(buffer, volume, position, when = 0, pitch = 1, duration) {
    if (!buffer || this.context.state !== 'running') return null;
    const c = this.context,
      start = c.currentTime + when;
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const length = Math.min(duration ?? buffer.duration / pitch, buffer.duration / pitch);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.setValueAtTime(volume, start + Math.max(0, length - 0.025));
    gain.gain.linearRampToValueAtTime(0, start + length);
    source.connect(gain);
    let panner;
    if (position) {
      panner = c.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3;
      panner.maxDistance = 100;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y ?? 1.5;
      panner.positionZ.value = position.z;
      gain.connect(panner).connect(this.output);
    } else gain.connect(this.output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      panner?.disconnect();
      this.reloadSources.delete(source);
    };
    source.start(start);
    source.stop(start + length);
    return source;
  }
  shoot(id, position) {
    const sounds = this.shots.get(id),
      p = WEAPON_AUDIO[id];
    if (!sounds || !p) return false;
    this.play(sounds[this.counter++ % 3], p.volume, position);
    if (id === 'iron') this.play(this.recordings.get('pump'), 0.22, position, 0.22, 1, 0.43);
    return true;
  }
  cancelReload() {
    for (const source of this.reloadSources) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    this.reloadSources.clear();
  }
  reload(id, duration) {
    this.cancelReload();
    const p = WEAPON_AUDIO[id] || WEAPON_AUDIO.vx9;
    const magazine = this.recordings.get(
      ['iron', 'r870', 'benelli'].includes(id) ? 'pump' : 'magazine',
    );
    const mechanism = this.recordings.get('mechanism');
    const rate = id === 'barrett' ? 0.7 : id === 'p90' ? 1.22 : id === 'beretta92' ? 0.92 : 1;
    for (const [buffer, when, volume, pitch, length] of [
      [magazine, 0.07, 0.18, rate, duration * 0.3],
      [magazine, duration * 0.54, 0.23, rate * 1.06, duration * 0.22],
      [mechanism, duration * 0.85, 0.17 + p.body * 0.15, rate, duration * 0.14],
    ]) {
      const source = this.play(buffer, volume, null, when, pitch, length);
      if (source) this.reloadSources.add(source);
    }
  }
}
