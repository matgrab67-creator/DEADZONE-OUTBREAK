import { TICK, WEAPONS, ZOMBIES, PERKS, clamp, distance, random, makeInventory } from './config.js';
import {
  DOORS,
  STATIONS,
  COLLECTIBLES,
  obstacles,
  accessibleSectors,
  blocked,
  slide,
  rayBox,
  raySphere,
} from './map.js';
import { Navigation } from './Navigation.js';
import { Physics } from './Physics.js';

export const blankInput = () => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  crouch: false,
  walk: false,
  ads: false,
  fire: false,
  yaw: 0,
  pitch: 0,
  seq: 0,
});
export function sanitizeInput(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !Number.isFinite(raw.yaw) ||
    !Number.isFinite(raw.pitch) ||
    !Number.isSafeInteger(raw.seq) ||
    raw.seq < 0
  )
    return null;
  const out = blankInput();
  for (const key of ['forward', 'back', 'left', 'right', 'jump', 'crouch', 'walk', 'ads', 'fire'])
    out[key] = raw[key] === true;
  out.yaw = raw.yaw % (Math.PI * 2);
  out.pitch = clamp(raw.pitch, -1.48, 1.48);
  out.seq = raw.seq;
  return out;
}
export class Simulation {
  constructor({ multiplayer = false, seed = 1973 } = {}) {
    this.multiplayer = multiplayer;
    this.seed = seed;
    this.time = 0;
    this.players = new Map();
    this.zombies = new Map();
    this.inputs = new Map();
    this.events = [];
    this.openDoors = [];
    this.collected = [];
    this.obs = obstacles();
    this.nav = new Navigation(this.obs);
    this.bossNav = new Navigation(this.obs, 0.75);
    this.physics = new Physics();
    this.round = 0;
    this.state = 'playing';
    this.phase = 'prepare';
    this.countdown = 7;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.nextZombie = 0;
    this.navTimer = 0;
    this.grenades = [];
    this.repairBudget = 4;
  }
  addPlayer(id, name = 'OPERATOR') {
    const index = this.players.size;
    const p = {
      id,
      name: String(name).slice(0, 18),
      x: -18 + index * 0.9,
      y: 0,
      z: 15,
      yaw: 0,
      pitch: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      crouch: false,
      jumpHeld: false,
      hp: 100,
      maxHp: 100,
      armor: 25,
      points: 500,
      kills: 0,
      headshots: 0,
      assists: 0,
      inventory: [makeInventory('vx9')],
      slot: 0,
      perks: [],
      grenades: 2,
      downed: false,
      eliminated: false,
      bleed: 30,
      revive: 0,
      reviver: null,
      reviveUntil: 0,
      lastDamage: -100,
      lastFire: -100,
      reloadEnd: 0,
      shotIndex: 0,
      ack: 0,
      lastRepair: -100,
      interactUntil: 0,
    };
    this.players.set(id, p);
    this.inputs.set(id, blankInput());
    this.physics.add(p);
    return p;
  }
  removePlayer(id) {
    this.players.delete(id);
    this.inputs.delete(id);
    this.physics.remove(id);
  }
  input(id, raw) {
    const p = this.players.get(id),
      clean = sanitizeInput(raw);
    if (!p || !clean || clean.seq < p.ack) return false;
    this.inputs.set(id, clean);
    return true;
  }
  event(type, data = {}) {
    this.events.push({ type, time: this.time, ...data });
  }
  takeEvents() {
    return this.events.splice(0);
  }
  tick(dt = TICK) {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.navTimer -= dt;
    if (this.navTimer <= 0) {
      this.nav.fields.clear();
      this.bossNav.fields.clear();
      this.navTimer = 0.5;
    }
    for (const p of this.players.values()) {
      if (p.eliminated) continue;
      if (p.downed) {
        p.bleed -= dt;
        if (
          p.reviveUntil >= this.time &&
          this.players.has(p.reviver) &&
          !this.players.get(p.reviver).downed &&
          distance(p, this.players.get(p.reviver)) < 2.4 &&
          this.hasSight(p, this.players.get(p.reviver))
        )
          p.revive += dt;
        else p.revive = Math.max(0, p.revive - dt * 0.5);
        if (p.revive >= 3) {
          p.downed = false;
          p.hp = p.maxHp * 0.5;
          p.revive = 0;
          p.lastDamage = this.time;
          this.event('revived', { player: p.id });
        } else if (p.bleed <= 0) {
          p.eliminated = true;
          this.event('eliminated', { player: p.id });
        }
        continue;
      }
      const input = this.inputs.get(p.id) || blankInput();
      p.yaw = input.yaw;
      p.pitch = input.pitch;
      p.ack = input.seq;
      this.physics.move(p, input, dt);
      if (p.reloadEnd && this.time >= p.reloadEnd) {
        const inv = p.inventory[p.slot],
          cap = this.capacity(inv),
          amount = Math.min(cap - inv.ammo, inv.reserve);
        inv.ammo += amount;
        inv.reserve -= amount;
        p.reloadEnd = 0;
        this.event('loaded', { player: p.id });
      }
      if (input.fire) this.fire(p, input);
      if (this.time - p.lastDamage > 6) p.hp = Math.min(p.maxHp, p.hp + dt * 7);
      if (this.time - p.lastFire > 0.35) p.shotIndex = 0;
    }
    this.physics.step();
    this.updateWaves(dt);
    this.updateZombies(dt);
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      if (this.time >= g.end) {
        this.explode(g, 5, 180, g.player);
        this.grenades.splice(i, 1);
      }
    }
    const alive = [...this.players.values()].some((p) => !p.downed && !p.eliminated);
    if (this.players.size && !alive) {
      this.state = 'over';
      this.event('gameover', { round: this.round });
    }
  }
  capacity(inv) {
    return Math.floor(WEAPONS[inv.id].magazine * (inv.upgraded ? 1.5 : 1));
  }
  action(id, action) {
    const p = this.players.get(id);
    if (
      !p ||
      this.state !== 'playing' ||
      p.downed ||
      p.eliminated ||
      !action ||
      typeof action !== 'object'
    )
      return false;
    if (action.type === 'reload') {
      const inv = p.inventory[p.slot];
      if (p.reloadEnd || inv.ammo >= this.capacity(inv) || inv.reserve <= 0) return false;
      p.reloadEnd = this.time + WEAPONS[inv.id].reload * (p.perks.includes('hands') ? 0.65 : 1);
      this.event('reload', { player: id, duration: p.reloadEnd - this.time });
      return true;
    }
    if (action.type === 'switch') {
      if (!Number.isInteger(action.slot) || !p.inventory[action.slot]) return false;
      p.slot = action.slot;
      p.reloadEnd = 0;
      p.shotIndex = 0;
      return true;
    }
    if (action.type === 'grenade') return this.throwGrenade(p);
    if (action.type === 'interact') return this.interact(p);
    return false;
  }
  fire(p, input) {
    const inv = p.inventory[p.slot],
      w = WEAPONS[inv.id],
      rate = w.rate * (p.perks.includes('rapid') ? 0.8 : 1);
    if (p.reloadEnd || this.time - p.lastFire < rate - 0.00001) return;
    if (inv.ammo <= 0) {
      if (this.time - p.lastFire > 0.4) {
        p.lastFire = this.time;
        this.event('empty', { player: p.id });
      }
      return;
    }
    inv.ammo--;
    p.lastFire = this.time;
    p.shotIndex++;
    const eye = { x: p.x, y: p.y + (p.crouch ? 0.98 : 1.58), z: p.z },
      moving = Math.min(1, Math.hypot(p.vx, p.vz) / 4.6);
    const spread =
      (w.spread * (input.ads ? 0.22 : 1) + moving * w.moveSpread + (p.grounded ? 0 : 0.05)) *
      (p.crouch ? 0.7 : 1) *
      (p.shotIndex === 1 && moving < 0.1 ? 0.2 : 1);
    const impacts = [];
    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const seed =
        this.seed + p.shotIndex * 71 + inv.ammo * 11 + pellet * 31 + Math.floor(this.time * 60);
      const yaw = p.yaw + (random(seed) - 0.5) * spread * 2,
        pitch = p.pitch + (random(seed + 1) - 0.5) * spread * 2;
      const dir = {
        x: -Math.sin(yaw) * Math.cos(pitch),
        y: Math.sin(pitch),
        z: -Math.cos(yaw) * Math.cos(pitch),
      };
      let nearest = 90,
        hit = null,
        part = null,
        material = 'concrete';
      for (const b of this.obs) {
        const t = rayBox(eye, dir, b);
        if (t < nearest) {
          nearest = t;
          material = ['container', 'server', 'door', 'reactor', 'pipes', 'metal'].includes(b.kind)
            ? 'metal'
            : 'concrete';
        }
      }
      if (dir.y < 0) {
        const floor = -eye.y / dir.y;
        if (floor < nearest) nearest = floor;
      }
      for (const z of this.zombies.values()) {
        if (z.hp <= 0) continue;
        const def = ZOMBIES[z.type],
          h = def.height;
        const parts = [
          ['head', { x: z.x, y: h * 0.89, z: z.z }, h * 0.13],
          ['body', { x: z.x, y: h * 0.57, z: z.z }, h * 0.22],
          ['limb', { x: z.x, y: h * 0.25, z: z.z }, h * 0.21],
        ];
        for (const [region, center, radius] of parts) {
          const t = raySphere(eye, dir, center, radius);
          if (t < nearest) {
            nearest = t;
            hit = z;
            part = region;
          }
        }
      }
      const impact = {
        x: eye.x + dir.x * nearest,
        y: eye.y + dir.y * nearest,
        z: eye.z + dir.z * nearest,
        material: hit ? 'blood' : material,
        head: part === 'head',
      };
      impacts.push(impact);
      if (hit) {
        let damage =
          w.damage *
          (inv.upgraded ? 1.9 : 1) *
          Math.max(0.45, 1 - Math.max(0, nearest - w.range) * 0.015);
        if (part === 'head') damage *= w.head * (p.perks.includes('deadeye') ? 1.4 : 1);
        if (part === 'limb') damage *= 0.65;
        if (hit.type === 'armored' && part !== 'head') damage *= 0.42;
        this.damageZombie(hit, damage, p, part === 'head');
      }
    }
    this.event('shot', { player: p.id, weapon: inv.id, origin: eye, impacts, index: p.shotIndex });
  }
  damageZombie(z, amount, p, head = false) {
    if (z.hp <= 0) return;
    z.hp -= amount;
    z.hitAt = this.time;
    if (p) z.contributors[p.id] = true;
    this.event('hit', { player: p?.id, zombie: z.id, head, killed: z.hp <= 0 });
    if (z.hp <= 0) {
      if (p) {
        p.kills++;
        p.headshots += Number(head);
        p.points += head ? 150 : 100;
        for (const id of Object.keys(z.contributors)) {
          const assist = this.players.get(id);
          if (assist && id !== p.id) {
            assist.points += 50;
            assist.assists++;
          }
        }
      }
      this.event('kill', { player: p?.id, zombie: z.id, head, points: head ? 150 : 100 });
      this.zombies.delete(z.id);
    }
  }
  damagePlayer(p, amount, source) {
    if (p.downed || p.eliminated || this.state !== 'playing') return;
    const absorbed = Math.min(p.armor, amount * 0.55);
    p.armor -= absorbed;
    p.hp = Math.max(0, p.hp - (amount - absorbed));
    p.lastDamage = this.time;
    this.event('damage', { player: p.id, amount, source });
    if (p.hp <= 0) {
      p.downed = true;
      p.bleed = 30;
      p.revive = 0;
      p.reloadEnd = 0;
      this.event('downed', { player: p.id });
    }
  }
  updateWaves(dt) {
    if (this.phase === 'prepare') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.round++;
        this.phase = 'wave';
        this.toSpawn = Math.min(120, 5 + this.round * 3 + Math.max(0, this.players.size - 1) * 4);
        this.spawnTimer = 0;
        this.repairBudget = 4;
        if (this.round % 5 === 0) this.spawnZombie('boss');
        this.event('round', { round: this.round, boss: this.round % 5 === 0 });
      }
      return;
    }
    this.spawnTimer -= dt;
    if (this.toSpawn > 0 && this.spawnTimer <= 0 && this.zombies.size < 40) {
      this.spawnZombie();
      this.toSpawn--;
      this.spawnTimer = Math.max(0.25, 1.5 - this.round * 0.06);
    }
    if (this.toSpawn === 0 && this.zombies.size === 0) {
      this.phase = 'prepare';
      this.countdown = 12;
      for (const p of this.players.values()) {
        p.grenades = Math.min(4, p.grenades + 1);
        p.points += 100;
        if (p.eliminated || p.downed) {
          p.eliminated = false;
          p.downed = false;
          p.hp = p.maxHp;
          p.x = -18;
          p.z = 15;
          p.y = 0;
          p.bleed = 30;
        }
      }
      this.event('clear', { round: this.round });
    }
  }
  spawnZombie(force) {
    const n = ++this.nextZombie,
      r = random(n + this.round * 17);
    let type = force || 'normal';
    if (!force && this.round >= 3) {
      if (r < 0.16) type = 'runner';
      else if (r < 0.27 && this.round >= 4) type = 'crawler';
      else if (r < 0.39 && this.round >= 5) type = 'armored';
      else if (r < 0.49 && this.round >= 6) type = 'exploder';
    }
    const sectors = accessibleSectors(this.openDoors),
      players = [...this.players.values()].filter((p) => !p.downed && !p.eliminated);
    let location = null,
      best = -Infinity;
    for (let i = 0; i < 24; i++) {
      const s = sectors[Math.floor(random(n * 51 + i) * sectors.length)],
        x = s.x + (random(n * 17 + i * 3) - 0.5) * 14,
        z = s.z + (random(n * 19 + i * 5) - 0.5) * 16;
      if (blocked(x, z, this.obs, ZOMBIES[type].radius)) continue;
      const score = Math.min(...players.map((p) => Math.hypot(p.x - x, p.z - z)));
      if (score > best) {
        location = { x, z };
        best = score;
      }
    }
    if (!location) location = { x: -24, z: 4 };
    const def = ZOMBIES[type],
      health = def.health * (1 + (this.round - 1) * 0.16);
    const zombie = {
      id: `z${n}`,
      type,
      ...location,
      yaw: 0,
      hp: health,
      maxHp: health,
      lastAttack: -100,
      hitAt: -100,
      phase: 1,
      windup: 0,
      contributors: {},
    };
    this.zombies.set(zombie.id, zombie);
    this.event('spawn', { zombie: zombie.id });
    return zombie;
  }
  hasSight(a, b) {
    const delta = { x: b.x - a.x, y: 0, z: b.z - a.z },
      len = Math.hypot(delta.x, delta.z);
    if (len < 0.01) return true;
    delta.x /= len;
    delta.z /= len;
    return !this.obs.some((o) => rayBox({ x: a.x, y: 1, z: a.z }, delta, o) < len);
  }
  updateZombies(dt) {
    const players = [...this.players.values()].filter((p) => !p.downed && !p.eliminated),
      all = [...this.zombies.values()];
    if (!players.length) return;
    for (const z of all) {
      if (!this.zombies.has(z.id)) continue;
      const def = ZOMBIES[z.type];
      let target = players[0];
      for (const p of players) if (distance(z, p) < distance(z, target)) target = p;
      const dist = distance(z, target);
      const sight = this.hasSight(z, target);
      if (z.type === 'exploder' && dist < 1.7 && sight) {
        this.explode(z, 3.8, 45, null);
        this.damageZombie(z, 10000, null);
        continue;
      }
      if (z.type === 'boss') {
        z.phase = z.hp < z.maxHp * 0.35 ? 3 : z.hp < z.maxHp * 0.7 ? 2 : 1;
        if (z.windup && this.time >= z.windup) {
          this.explode(z, 5.5, 32, null);
          z.windup = 0;
          z.lastAttack = this.time;
        }
        if (z.phase >= 2 && dist < 7 && !z.windup && this.time - z.lastAttack > 5) {
          z.windup = this.time + 1.3;
          this.event('bosswindup', { x: z.x, z: z.z });
        }
      }
      const reach = z.type === 'boss' ? 1.9 : 1.15;
      if (dist < reach && sight && Math.abs(target.y) < 1.3) {
        if (this.time - z.lastAttack > 1.05 && !z.windup) {
          z.lastAttack = this.time;
          this.damagePlayer(target, def.damage * (1 + this.round * 0.025), z);
          this.event('attack', { zombie: z.id });
        }
      } else if (!z.windup) {
        const dir = (z.type === 'boss' ? this.bossNav : this.nav).direction(z, target);
        let dx = dir.x,
          dz = dir.z;
        for (const other of all) {
          if (other.id === z.id) continue;
          const d = distance(z, other),
            separation = def.radius + ZOMBIES[other.type].radius;
          if (d < separation && d > 0.01) {
            dx += ((z.x - other.x) / d) * (separation - d) * 1.8;
            dz += ((z.z - other.z) / d) * (separation - d) * 1.8;
          }
        }
        const speed =
          def.speed *
          (1 + Math.min(0.65, this.round * 0.025)) *
          (z.phase === 3 ? 1.7 : 1) *
          (this.time - z.hitAt < 0.1 ? 0.45 : 1);
        slide(z, dx * speed * dt, dz * speed * dt, this.obs, def.radius);
        if (dx || dz) z.yaw = Math.atan2(-dx, -dz);
      }
    }
  }
  explode(center, radius, damage, playerId) {
    this.event('explosion', { x: center.x, y: 0.5, z: center.z, radius });
    const owner = this.players.get(playerId);
    if (owner) {
      for (const z of [...this.zombies.values()]) {
        const d = distance(center, z);
        if (d < radius && this.hasSight(center, z))
          this.damageZombie(z, damage * (1 - (d / radius) * 0.6), owner);
      }
      const d = distance(center, owner);
      if (d < radius && this.hasSight(center, owner))
        this.damagePlayer(owner, damage * 0.3 * (1 - d / radius), center);
    } else
      for (const p of this.players.values()) {
        const d = distance(center, p);
        if (d < radius && this.hasSight(center, p))
          this.damagePlayer(p, damage * (1 - (d / radius) * 0.5), center);
      }
  }
  throwGrenade(p) {
    if (!p.grenades || this.time - (p.lastGrenade ?? -10) < 1) return false;
    p.grenades--;
    p.lastGrenade = this.time;
    const dir = { x: -Math.sin(p.yaw), y: 0, z: -Math.cos(p.yaw) };
    let length = 10;
    for (const b of this.obs)
      length = Math.min(length, Math.max(0.5, rayBox({ x: p.x, y: 1, z: p.z }, dir, b) - 0.6));
    const g = {
      x: p.x + dir.x * length,
      z: p.z + dir.z * length,
      end: this.time + 1.6,
      player: p.id,
    };
    this.grenades.push(g);
    this.event('grenade', { ...g, origin: { x: p.x, y: p.y + 1.3, z: p.z } });
    return true;
  }
  nearest(p) {
    const revive = [...this.players.values()].find(
      (t) =>
        t.id !== p.id && t.downed && !t.eliminated && distance(p, t) < 2.4 && this.hasSight(p, t),
    );
    if (revive)
      return {
        id: revive.id,
        type: 'revive',
        name: `REVIVE ${revive.name}`,
        price: 0,
        progress: revive.revive / 3,
      };
    const candidates = [
      ...DOORS.filter((d) => !this.openDoors.includes(d.id)).map((d) => ({
        ...d,
        type: 'door',
        name: 'UNLOCK SECTOR',
      })),
      ...STATIONS,
      ...COLLECTIBLES.filter((c) => !this.collected.includes(c.id)).map((c) => ({
        ...c,
        type: 'log',
        name: 'RECOVER FIELD LOG',
        price: 0,
      })),
    ];
    let closest = null,
      dist = 2.5;
    for (const c of candidates) {
      const d = distance(p, c);
      const dir = { x: (c.x - p.x) / (d || 1), y: 0, z: (c.z - p.z) / (d || 1) };
      const visible = !this.obs.some(
        (b) => b.id !== c.id && rayBox({ x: p.x, y: 1, z: p.z }, dir, b) < d - 0.1,
      );
      if (d < dist && visible) {
        closest = c;
        dist = d;
      }
    }
    return closest;
  }
  interact(p) {
    const item = this.nearest(p);
    if (!item) return false;
    if (item.type === 'revive') {
      const t = this.players.get(item.id);
      t.reviver = p.id;
      t.reviveUntil = this.time + 0.25;
      return true;
    }
    if (this.time < p.interactUntil) return false;
    p.interactUntil = this.time + 0.35;
    const fail = (message) => {
      this.event('notice', { player: p.id, message });
      return false;
    };
    // A closed door itself blocks line-of-sight. nearest() permits its near face.
    if (item.type === 'log') {
      this.collected.push(item.id);
      p.points += 200;
      this.event('log', { player: p.id, title: item.title, text: item.text });
      return true;
    }
    if (p.points < item.price) return fail('INSUFFICIENT POINTS');
    const inv = p.inventory[p.slot];
    if (item.type === 'door') {
      this.openDoors.push(item.id);
      this.physics.openDoor(item.id);
      this.obs = obstacles(this.openDoors);
      this.nav.setObstacles(this.obs);
      this.bossNav.setObstacles(this.obs);
    } else if (item.type === 'weapon' || item.type === 'mystery') {
      const keys = Object.keys(WEAPONS).filter((k) => k !== 'vx9'),
        weapon = item.weapon || keys[Math.floor(random(this.seed + this.time) * keys.length)];
      const owned = p.inventory.find((i) => i.id === weapon);
      if (owned) {
        owned.reserve = WEAPONS[weapon].reserve;
        owned.ammo = this.capacity(owned);
        p.slot = p.inventory.indexOf(owned);
      } else {
        const next = makeInventory(weapon);
        if (p.inventory.length < 3) {
          p.inventory.push(next);
          p.slot = p.inventory.length - 1;
        } else p.inventory[p.slot] = next;
      }
      p.reloadEnd = 0;
      this.event('weapon', { player: p.id, weapon });
    } else if (item.type === 'ammo') {
      if (inv.reserve >= WEAPONS[inv.id].reserve && p.grenades >= 2) return fail('AMMUNITION FULL');
      inv.reserve = WEAPONS[inv.id].reserve;
      p.grenades = Math.max(2, p.grenades);
    } else if (item.type === 'perk') {
      if (p.perks.includes(item.perk)) return fail('PERK ALREADY ACTIVE');
      p.perks.push(item.perk);
      if (item.perk === 'heart') {
        p.maxHp = 180;
        p.hp = 180;
      }
    } else if (item.type === 'upgrade') {
      if (inv.upgraded) return fail('WEAPON ALREADY ENHANCED');
      inv.upgraded = true;
      inv.ammo = this.capacity(inv);
      inv.reserve = WEAPONS[inv.id].reserve;
    } else if (item.type === 'armor') {
      if (p.armor >= 100) return fail('ARMOR FULL');
      p.armor = 100;
    } else if (item.type === 'repair') {
      if (this.time - p.lastRepair < 5 || this.repairBudget <= 0) return fail('BARRICADE SECURED');
      p.lastRepair = this.time;
      this.repairBudget--;
      p.points += 25;
    }
    p.points -= item.price;
    this.event('purchase', { player: p.id, item: item.id, name: item.name });
    return true;
  }
  snapshot() {
    return {
      time: this.time,
      state: this.state,
      round: this.round,
      phase: this.phase,
      countdown: this.countdown,
      remaining: this.toSpawn + this.zombies.size,
      openDoors: [...this.openDoors],
      collected: [...this.collected],
      players: [...this.players.values()].map((p) => ({
        ...p,
        inventory: p.inventory.map((i) => ({ ...i })),
        perks: [...p.perks],
      })),
      zombies: [...this.zombies.values()].map(({ contributors, ...z }) => ({ ...z })),
    };
  }
  dispose() {
    this.physics.dispose();
  }
}
