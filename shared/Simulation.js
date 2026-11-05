import { TICK, WEAPONS, ZOMBIES, PERKS, clamp, distance, random, makeInventory } from './config.js';
import {
  DOORS,
  STATIONS,
  COLLECTIBLES,
  obstacles,
  accessibleSectors,
  slide,
  rayBox,
  raySphere,
  blocked,
} from './map.js';
import { Navigation } from './Navigation.js';
import { Physics } from './Physics.js';
import { zombieHitboxes } from './Hitboxes.js';
import { ACCURACY, spreadFor, recordShot, forwardDirection, sampleCone } from './Ballistics.js';
import { SHOP_BY_ID, shopStatus } from './Shop.js';
import { NEW_INFECTED, infectedForWave } from './Infected.js';
import { chapterDefinition, chapterWave, WAVES_PER_CHAPTER } from './Chapters.js';
import { emergenceProgress } from './ZombieLifecycle.js';
import { SpawnDirector } from './SpawnDirector.js';
import { FLASHLIGHT_BATTERY_SECONDS, waveIntermission, CAMPFIRE, LANTERN } from './MatchRules.js';
import { sanitizeSkinLoadout, skinDefinition } from './Skins.js';
import {
  ForestWorld,
  forestRing,
  forestBounds,
  initialDefenses,
  inCamp,
  terrainHeight,
  forestRandom,
  forestWeather,
} from './Forest.js';
import { indexObstacles, rayObstacles } from './SpatialIndex.js';
import {
  SURVIVAL_STATIONS,
  SURVIVAL_LOGS,
  WORKBENCH,
  survivalStationBoxes,
  RECIPES,
  craftStatus,
} from './Survival.js';
import { chooseForestSpawn } from './ForestSpawn.js';
import { BASIC_WEAPONS } from './WeaponProgression.js';
import { trainingObstacles, trainingStats, TRAINING_DRILLS } from './Training.js';
import {
  CAMP_UPGRADES,
  CONTRACT_BOARD,
  campUpgradeCost,
  discountedRecipeCost,
  newContract,
} from './CampSystems.js';

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
  constructor({ multiplayer = false, seed = 1973, forest = false, training = false } = {}) {
    forest ||= training;
    this.multiplayer = multiplayer;
    this.matchId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.clearedWaves = 0;
    this.training = training ? trainingStats() : null;
    this.seed = seed;
    this.chapter = 1;
    this.spawnDirector = new SpawnDirector(seed);
    this.projectiles = [];
    this.hazards = [];
    this.nextHazard = 0;
    this.time = 0;
    this.players = new Map();
    this.zombies = new Map();
    this.inputs = new Map();
    this.events = [];
    this.openDoors = [];
    this.collected = [];
    this.blueprints = [];
    this.forest = forest ? new ForestWorld(seed) : null;
    this.defenses = forest && !training ? initialDefenses() : [];
    this.claimedCaches = [];
    this.worldRevision = 0;
    this.traps = [];
    this.lanterns = [];
    this.finalBossPending = false;
    this.throwables = [];
    this.campLevels = { clinic: 0, workshop: 0, generator: 0 };
    this.contract = null;
    this.contractNumber = 0;
    this.pings = [];
    this.lastPulse = -100;
    this.obs = training
      ? indexObstacles(trainingObstacles(this.forest))
      : forest
        ? indexObstacles([...this.forest.obstacles(this.defenses), ...survivalStationBoxes()])
        : obstacles();
    const navObs = forest
      ? indexObstacles(this.obs.filter((b) => !b.id.startsWith('def-')))
      : this.obs;
    this.nav = new Navigation(navObs, 0.43, forest ? forestBounds(1) : null);
    this.bossNav = new Navigation(navObs, 0.75, forest ? forestBounds(1) : null);
    this.physics = new Physics([], 1, this.forestOptions());
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
      chapter: this.chapter,
      world: this.forest ? 'forest' : 'facility',
      training: !!this.training,
      campLevels: { ...this.campLevels },
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
      unlockedWeapons: this.forest ? [...BASIC_WEAPONS] : ['vx9'],
      skins: {},
      skinKnife: null,
      resources: { wood: 8, scrap: 8, parts: 3, medicine: 3 },
      equipment: { medkit: 1, molotov: 1, trap: 1, lantern: 0 },
      flashlight: false,
      flashlightUnlocked: false,
      flashlightCharge: 0,
      spareBatteries: 0,
      slot: 0,
      lastKnife: -100,
      slideTime: 0,
      slideCooldown: 0,
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
      aimAlpha: 0,
      reloadEnd: 0,
      shotIndex: 0,
      ack: 0,
      lastRepair: -100,
      interactUntil: 0,
    };
    this.players.set(id, p);
    this.inputs.set(id, blankInput());
    this.physics.add(p);
    if (this.training) {
      Object.assign(p, {
        x: 0,
        z: 14,
        y: 0,
        points: 0,
        flashlight: true,
        flashlightUnlocked: true,
        flashlightCharge: FLASHLIGHT_BATTERY_SECONDS,
        unlockedWeapons: Object.keys(WEAPONS),
      });
      this.startTraining(p, 'vx9', 'static');
    }
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
    if (this.phase === 'chapter') {
      this.updateWaves(dt);
      return;
    }
    this.navTimer -= dt;
    if (this.navTimer <= 0) {
      this.nav.fields.clear();
      this.bossNav.fields.clear();
      this.navTimer = 0.5;
    }
    for (const p of this.players.values()) {
      if (p.eliminated) continue;
      this.updateFlashlight(p, dt);
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
      const aimTarget = input.ads && !p.reloadEnd ? 1 : 0;
      const aimStep = dt / ACCURACY[p.inventory[p.slot].id].aimTime;
      p.aimAlpha += clamp(aimTarget - p.aimAlpha, -aimStep, aimStep);
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
      this.regenerateHealth(p, dt);
      if (this.time - p.lastFire > 0.35) p.shotIndex = 0;
    }
    this.physics.step();
    if (this.training) {
      this.updateTraining(dt);
      return;
    }
    if (this.forest) {
      this.lanterns = this.lanterns.filter((lamp) => lamp.end > this.time);
      this.updateCamp();
    }
    this.updateWaves(dt);
    this.updateZombies(dt);
    for (let i = this.throwables.length - 1; i >= 0; i--)
      if (this.time >= this.throwables[i].end) {
        const thrown = this.throwables[i];
        this.addHazard(thrown, 'fire', 2.7, 7, 4);
        this.hazards.at(-1).owner = thrown.player;
        this.throwables.splice(i, 1);
      }
    this.updateHazards(dt);
    if (this.forest) this.updateTraps();
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
  regenerateHealth(p, dt) {
    p.nearCampfire =
      !!this.forest &&
      distance(p, CAMPFIRE) <= CAMPFIRE.radius &&
      Math.abs(p.y) < 1.3 &&
      this.hasSight(p, CAMPFIRE);
    p.regenerating =
      !p.downed &&
      !p.eliminated &&
      p.hp < p.maxHp &&
      this.time - p.lastDamage >= (this.forest ? 5 : 6) &&
      (!this.forest || p.nearCampfire);
    if (p.regenerating) p.hp = Math.min(p.maxHp, p.hp + dt * (this.forest ? 4 : 7));
  }
  capacity(inv) {
    return Math.floor(
      WEAPONS[inv.id].magazine * (inv.upgraded ? 1.5 : 1) * (inv.magazine ? 1.25 : 1),
    );
  }
  action(id, action) {
    const p = this.players.get(id);
    if (p && this.state === 'playing' && action?.type === 'skins') {
      p.skins = sanitizeSkinLoadout(action.loadout);
      if (Object.hasOwn(action, 'knife'))
        p.skinKnife =
          typeof action.knife === 'string' && skinDefinition(`knife:${action.knife}`, 'factory')
            ? action.knife
            : null;
      return true;
    }
    if (
      !p ||
      this.state !== 'playing' ||
      this.phase === 'chapter' ||
      p.downed ||
      p.eliminated ||
      !action ||
      typeof action !== 'object'
    )
      return false;
    if (action.type === 'reload') {
      const inv = p.inventory[p.slot];
      if (p.reloadEnd || inv.ammo >= this.capacity(inv) || inv.reserve <= 0) return false;
      p.reloadEnd =
        this.time +
        WEAPONS[inv.id].reload * (p.perks.includes('hands') ? 0.65 : 1) * (inv.handling ? 0.9 : 1);
      this.event('reload', { player: id, weapon: inv.id, duration: p.reloadEnd - this.time });
      return true;
    }
    if (action.type === 'switch') {
      if (!Number.isInteger(action.slot) || !p.inventory[action.slot]) return false;
      p.slot = action.slot;
      p.reloadEnd = 0;
      p.shotIndex = 0;
      return true;
    }
    if (action.type === 'shopBuy') return this.buyShopItem(p, action.item);
    if (this.training && ['equipment', 'grenade', 'interact', 'craft'].includes(action.type))
      return false;
    if (this.training && action.type === 'training')
      return this.startTraining(
        p,
        action.weapon || p.inventory[p.slot].id,
        action.drill || this.training.drill,
      );
    if (this.forest && action.type === 'ping') {
      const edge = (this.forest.ring + 0.5) * 24;
      if (
        !Number.isFinite(action.x) ||
        !Number.isFinite(action.z) ||
        Math.max(Math.abs(action.x), Math.abs(action.z)) > edge ||
        this.time - (p.lastPing ?? -100) < 1
      )
        return false;
      p.lastPing = this.time;
      this.pings = this.pings.filter((mark) => mark.player !== p.id);
      this.pings.push({ x: action.x, z: action.z, player: p.id, end: this.time + 45 });
      return true;
    }
    if (this.forest && action.type === 'craft') return this.craft(p, action.recipe);
    if (this.forest && action.type === 'equipment') return this.useEquipment(p, action.item);
    if (this.forest && action.type === 'flashlight') {
      if (!p.flashlightUnlocked) {
        this.event('notice', {
          player: p.id,
          message: 'Odblokuj latarkę w magazynie: B / ZAPASY.',
        });
        return false;
      }
      if (!p.flashlight && p.flashlightCharge <= 0 && !this.replaceBattery(p)) {
        this.event('notice', {
          player: p.id,
          message: 'Brak baterii. Kup zapas w magazynie: B / ZAPASY.',
        });
        return false;
      }
      p.flashlight = !p.flashlight;
      return true;
    }
    if (action.type === 'knifeAttack') return this.knifeAttack(p);
    if (action.type === 'grenade') return this.throwGrenade(p);
    if (action.type === 'interact') return this.interact(p);
    return false;
  }
  replaceBattery(p) {
    if (p.spareBatteries <= 0) return false;
    p.spareBatteries--;
    p.flashlightCharge = FLASHLIGHT_BATTERY_SECONDS;
    return true;
  }
  updateFlashlight(p, dt) {
    if (!p.flashlight || p.downed || p.eliminated) return;
    if (this.training) {
      p.flashlightCharge = FLASHLIGHT_BATTERY_SECONDS;
      return;
    }
    p.flashlightCharge = Math.max(0, p.flashlightCharge - dt);
    if (p.flashlightCharge <= 0 && !this.replaceBattery(p)) {
      p.flashlight = false;
      this.event('notice', {
        player: p.id,
        message: 'Latarka rozładowana. Kup baterie: B / ZAPASY.',
      });
    }
  }
  knifeAttack(p) {
    if (this.time - p.lastKnife < 0.55) return false;
    p.lastKnife = this.time;
    const forward = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
    let target = null,
      nearest = 2.15;
    for (const zombie of this.zombies.values()) {
      if (emergenceProgress(zombie, this.time) < 0.55 || (zombie.y || 0) > 1.2) continue;
      const dx = zombie.x - p.x,
        dz = zombie.z - p.z,
        dist = Math.hypot(dx, dz);
      if (
        dist < nearest &&
        dist > 0.01 &&
        (dx * forward.x + dz * forward.z) / dist > 0.35 &&
        this.hasSight(p, zombie)
      ) {
        target = zombie;
        nearest = dist;
      }
    }
    if (target) this.damageZombie(target, 115, p);
    this.event('knife', { player: p.id, hit: !!target });
    return true;
  }
  grantWeapon(p, weapon) {
    const owned = p.inventory.findIndex((i) => i.id === weapon);
    if (owned >= 0) {
      p.slot = owned;
      p.inventory[owned].reserve = WEAPONS[weapon].reserve;
      p.inventory[owned].ammo = this.capacity(p.inventory[owned]);
    } else if (p.inventory.length < 3) {
      p.inventory.push(makeInventory(weapon));
      p.slot = p.inventory.length - 1;
    } else p.inventory[p.slot] = makeInventory(weapon);
    p.reloadEnd = 0;
    p.aimAlpha = 0;
    p.shotIndex = 0;
    this.event('weapon', { player: p.id, weapon });
  }
  buyShopItem(p, id) {
    const item = typeof id === 'string' ? SHOP_BY_ID.get(id) : null;
    if (!item) return false;
    if (this.training && item.type === 'weapon') {
      this.grantWeapon(p, item.weapon);
      return true;
    }
    const status = shopStatus(p, item);
    if (!status.allowed) {
      this.event('notice', { player: p.id, message: status.reason || status.label });
      return false;
    }
    if (status.equipSlot !== undefined) {
      p.slot = status.equipSlot;
      p.reloadEnd = 0;
      return true;
    }
    if (status.blueprint) {
      p.unlockedWeapons.push(item.weapon);
      p.points -= status.blueprintPrice;
      this.event('unlock', { player: p.id, weapon: item.weapon, name: item.name });
      this.event('purchase', {
        player: p.id,
        item: `blueprint:${item.weapon}`,
        name: `${item.name} BLUEPRINT`,
      });
      return true;
    }
    const inv = p.inventory[p.slot];
    if (item.type === 'weapon') this.grantWeapon(p, item.weapon);
    else if (item.type === 'ammo') inv.reserve = WEAPONS[inv.id].reserve;
    else if (item.type === 'armor') p.armor = 100;
    else if (item.type === 'health') p.hp = p.maxHp;
    else if (item.type === 'grenades') p.grenades = Math.min(4, p.grenades + 2);
    else if (item.type === 'flashlight') {
      p.flashlightUnlocked = true;
      p.flashlightCharge = FLASHLIGHT_BATTERY_SECONDS;
    } else if (item.type === 'battery') p.spareBatteries++;
    else if (item.type === 'lantern') p.equipment.lantern++;
    else if (item.type === 'upgrade') {
      inv.upgraded = true;
      inv.ammo = this.capacity(inv);
      inv.reserve = WEAPONS[inv.id].reserve;
    } else if (item.type === 'perk') {
      p.perks.push(item.perk);
      if (item.perk === 'heart') {
        p.maxHp = 180;
        p.hp = 180;
      }
    }
    p.points -= item.price;
    this.event('purchase', { player: p.id, item: item.id, name: item.name });
    return true;
  }
  fire(p, input) {
    if (this.training?.finished) return;
    const inv = p.inventory[p.slot],
      w = WEAPONS[inv.id],
      rate = w.rate * (p.perks.includes('rapid') ? 0.8 : 1);
    const due = p.fireWeapon === inv.id ? p.nextFire : p.lastFire + rate;
    if (p.reloadEnd || this.time < due - 0.00001) return;
    if (inv.ammo <= 0) {
      if (this.time - p.lastFire > 0.4) {
        p.lastFire = this.time;
        this.event('empty', { player: p.id });
      }
      return;
    }
    inv.ammo--;
    if (this.training) this.training.shots++;
    // Carry the sub-tick remainder forward. Otherwise 800 RPM becomes 720 RPM
    // simply because the authoritative simulation runs at 60 Hz.
    p.nextFire = (this.time - due <= TICK + 0.00001 ? due : this.time) + rate;
    p.fireWeapon = inv.id;
    p.lastFire = this.time;
    if (this.forest) {
      p.noiseUntil = this.time + (['spectre', 'pbs1'].includes(inv.id) ? 2 : 7);
    }
    p.shotIndex++;
    const eye = { x: p.x, y: p.y + (p.sliding ? 0.62 : p.crouch ? 0.98 : 1.58), z: p.z };
    const spread = spreadFor(p, input, this.time);
    const shotSeed = this.seed + p.shotIndex * 71 + inv.ammo * 11 + Math.floor(this.time * 60);
    const aimDirection = sampleCone(forwardDirection(p.yaw, p.pitch), spread.aim, shotSeed);
    recordShot(inv, this.time);
    const impacts = [];
    let trainingHit = false,
      trainingHead = false;
    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const dir = spread.pellets
        ? sampleCone(aimDirection, spread.pellets, shotSeed + pellet * 31 + 301)
        : aimDirection;
      let nearest = 90,
        hit = null,
        part = null,
        material = 'concrete';
      let nestHit = false;
      for (const b of rayObstacles(this.obs, eye, dir, nearest)) {
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
      if (this.contract?.kind === 'nest' && !this.contract.ready) {
        const c = this.contract,
          t = raySphere(
            eye,
            dir,
            { x: c.x, y: terrainHeight(this.seed, c.x, c.z) + 0.65, z: c.z },
            0.9,
          );
        if (t < nearest) {
          nearest = t;
          nestHit = true;
          material = 'wood';
        }
      }
      for (const z of this.zombies.values()) {
        if (z.hp <= 0) continue;
        const parts = zombieHitboxes(z, this.time);
        for (const [region, center, radius] of parts) {
          const t = raySphere(eye, dir, center, radius);
          if (t < nearest) {
            nearest = t;
            hit = z;
            part = region;
            nestHit = false;
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
        trainingHit = true;
        trainingHead ||= part === 'head';
        let damage =
          (part === 'head' ? (w.headDamage ?? w.damage * w.head) : w.damage) *
          (inv.upgraded ? 1.9 : 1) *
          Math.max(0.45, 1 - Math.max(0, nearest - w.range) * 0.015);
        if (part === 'head' && p.perks.includes('deadeye')) damage *= 1.4;
        if (part === 'limb') damage *= 0.65;
        if (hit.type === 'armored' && part !== 'head') damage *= 0.42;
        if (part !== 'head' && ZOMBIES[hit.type].bodyArmor && hit.hp > hit.maxHp * 0.4)
          damage *= ZOMBIES[hit.type].bodyArmor;
        this.damageZombie(hit, damage, p, part === 'head');
      } else if (nestHit) {
        this.contract.hp = Math.max(0, this.contract.hp - w.damage * (inv.upgraded ? 1.9 : 1));
        this.contract.progress = this.contract.goal - this.contract.hp;
        this.contract.ready = this.contract.hp <= 0;
        this.event('hit', { player: p.id, head: false, killed: this.contract.ready });
      }
    }
    if (this.training) {
      this.training.hits += Number(trainingHit);
      this.training.headshots += Number(trainingHead);
    }
    this.event('shot', { player: p.id, weapon: inv.id, origin: eye, impacts, index: p.shotIndex });
  }
  damageZombie(z, amount, p, head = false) {
    if (z.hp <= 0) return;
    if (z.finalBoss && z.shielded) {
      if (p && this.time - (p.lastShieldNotice ?? -100) > 1.5) {
        p.lastShieldNotice = this.time;
        this.event('notice', {
          player: p.id,
          message: 'Boss chroniony — pokonaj przywołaną obstawę!',
        });
      }
      return;
    }
    const threshold = z.finalBoss ? (z.bossStage === 1 ? 0.65 : z.bossStage === 2 ? 0.3 : 0) : 0;
    z.hp = Math.max(z.maxHp * threshold, z.hp - amount);
    if (z.finalBoss && threshold > 0 && z.hp <= z.maxHp * threshold) {
      z.shielded = true;
      z.summonAt = this.time + 2.5;
      this.event('bossSummon', { stage: z.bossStage + 1 });
    }
    z.hitAt = this.time;
    if (p) z.contributors[p.id] = true;
    this.event('hit', { player: p?.id, zombie: z.id, head, killed: z.hp <= 0 });
    if (z.hp <= 0) {
      if (p) {
        p.kills++;
        if (this.contract?.kind === 'defend' && !this.contract.ready && Math.hypot(z.x, z.z) < 40) {
          this.contract.progress++;
          if (this.contract.progress >= this.contract.goal) this.contract.ready = true;
        }
        if (this.training) {
          this.training.kills++;
          this.training.nextSpawn = this.time + 0.3;
        }
        p.headshots += Number(head);
        if (!this.training) p.points += head ? 150 : 100;
        if (this.forest && forestRandom(this.seed, this.nextZombie, p.kills, 11) > 0.35) {
          p.resources.scrap = Math.min(999, p.resources.scrap + 1);
          if (head || z.type === 'boss') p.resources.parts = Math.min(999, p.resources.parts + 1);
        }
        for (const id of Object.keys(z.contributors)) {
          const assist = this.players.get(id);
          if (assist && id !== p.id) {
            assist.points += 50;
            assist.assists++;
          }
        }
      }
      this.event('kill', {
        player: p?.id,
        zombie: z.id,
        head,
        points: head ? 150 : 100,
        x: z.x,
        z: z.z,
        typeId: z.type,
        impulse: Math.min(1, amount / z.maxHp),
        direction: p ? { x: z.x - p.x, z: z.z - p.z } : null,
      });
      if (z.type === 'bloater') this.addHazard(z, 'gas', 2.3, 5, 7);
      this.dropBlueprint(z, p);
      this.zombies.delete(z.id);
    }
  }
  dropBlueprint(z, p) {
    if (this.forest) return;
    const seed = this.seed + this.nextZombie * 43 + this.round * 71;
    if (random(seed) >= 0.05) return;
    const available = Object.keys(WEAPONS).filter(
      (weapon) => weapon !== 'vx9' && !p?.unlockedWeapons.includes(weapon),
    );
    if (!available.length) return;
    const weapon = available[Math.floor(random(seed + 1) * available.length)];
    this.blueprints.push({
      id: `drop-${z.id}`,
      type: 'blueprint',
      weapon,
      name: `${WEAPONS[weapon].name} BLUEPRINT`,
      x: z.x,
      z: z.z,
    });
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
    if (this.phase === 'chapter') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = 'prepare';
        this.countdown = this.forest ? waveIntermission(this.round) : 10;
        this.event('chapterReady', { chapter: this.chapter });
      }
      return;
    }
    if (this.phase === 'prepare') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.round++;
        if (this.forest) this.expandForest(this.round);
        this.phase = 'wave';
        this.toSpawn = Math.min(120, 5 + this.round * 3 + Math.max(0, this.players.size - 1) * 4);
        this.spawnTimer = 0;
        this.waveSpawned = 0;
        this.repairBudget = 4;
        this.finalBossPending = !!this.forest && this.round % WAVES_PER_CHAPTER === 0;
        if (this.finalBossPending) this.toSpawn = 1;
        else if (this.round % 5 === 0) this.spawnZombie('boss');
        this.event('round', {
          round: this.round,
          wave: chapterWave(this.round),
          chapter: this.chapter,
          boss: this.round % 5 === 0,
          finalBoss: this.finalBossPending,
        });
      }
      return;
    }
    this.spawnTimer -= dt;
    if (this.finalBossPending) {
      if (this.spawnTimer <= 0) {
        const boss = this.spawnZombie('boss');
        if (boss) {
          boss.finalBoss = true;
          boss.hp = boss.maxHp = boss.maxHp * 1.6 * (1 + Math.max(0, this.players.size - 1) * 0.35);
          boss.bossStage = 0;
          boss.shielded = true;
          boss.guardians = [];
          boss.guardRemaining = 0;
          boss.summonAt = boss.emergeEnd + 3;
          this.toSpawn = 0;
          this.finalBossPending = false;
        } else this.spawnTimer = 0.5;
      }
      return;
    }
    if (this.toSpawn > 0 && this.spawnTimer <= 0 && this.zombies.size < 40) {
      const introduction = Object.entries(NEW_INFECTED).find(
        ([, def]) => def.firstWave === this.round,
      )?.[0];
      const spawned = this.spawnZombie(this.waveSpawned === 0 ? introduction : undefined);
      if (spawned) {
        this.toSpawn--;
        this.waveSpawned = (this.waveSpawned || 0) + 1;
      }
      this.spawnTimer = spawned ? Math.max(0.25, 1.5 - this.round * 0.06) : 0.2;
    }
    if (this.toSpawn === 0 && this.zombies.size === 0) {
      this.phase = 'prepare';
      this.countdown = this.forest ? waveIntermission(this.round) : 12;
      this.clearedWaves++;
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
      this.event('clear', { round: this.round, duration: this.countdown });
      if (this.forest)
        for (const p of this.players.values()) {
          p.resources.wood = Math.min(999, p.resources.wood + 3);
          p.resources.medicine = Math.min(999, p.resources.medicine + 1);
        }
      if (this.round > 0 && this.round % WAVES_PER_CHAPTER === 0) this.advanceChapter();
    }
  }
  advanceChapter() {
    if (this.forest) {
      this.chapter++;
      this.phase = 'chapter';
      this.countdown = 5;
      this.expandForest(this.round + 1);
      for (const p of this.players.values()) {
        p.chapter = this.chapter;
        p.points += 500;
        p.hp = p.maxHp;
        p.armor = Math.max(50, p.armor);
        p.reloadEnd = 0;
        p.aimAlpha = 0;
        p.shotIndex = 0;
        p.vx = p.vy = p.vz = 0;
        for (const inv of p.inventory) {
          inv.ammo = this.capacity(inv);
          inv.reserve = WEAPONS[inv.id].reserve;
        }
        this.inputs.set(p.id, { ...blankInput(), yaw: p.yaw, pitch: p.pitch, seq: p.ack });
      }
      this.event('chapter', { chapter: this.chapter, name: 'THE LOST FOREST', duration: 5 });
      return;
    }
    this.chapter++;
    this.phase = 'chapter';
    this.countdown = 5;
    this.zombies.clear();
    this.grenades = [];
    this.projectiles = [];
    this.hazards = [];
    this.blueprints = [];
    this.openDoors = [];
    this.collected = [];
    this.spawnDirector.reset();
    this.obs = obstacles([], this.chapter);
    this.nav.setObstacles(this.obs);
    this.bossNav.setObstacles(this.obs);
    this.physics.dispose();
    this.physics = new Physics([], this.chapter);
    let index = 0;
    for (const p of this.players.values()) {
      Object.assign(p, {
        chapter: this.chapter,
        x: -18 + index++ * 0.9,
        y: 0,
        z: 15,
        yaw: 0,
        pitch: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        grounded: true,
        crouch: false,
        sliding: false,
        slideTime: 0,
        reloadEnd: 0,
        downed: false,
        eliminated: false,
        hp: p.maxHp,
        armor: Math.max(50, p.armor),
        bleed: 30,
        revive: 0,
        reviver: null,
        reviveUntil: 0,
        aimAlpha: 0,
        shotIndex: 0,
      });
      p.points += 500;
      for (const inv of p.inventory) {
        inv.ammo = this.capacity(inv);
        inv.reserve = WEAPONS[inv.id].reserve;
      }
      this.inputs.set(p.id, { ...blankInput(), seq: p.ack });
      this.physics.add(p);
    }
    this.event('chapter', {
      chapter: this.chapter,
      name: chapterDefinition(this.chapter).name,
      duration: 5,
    });
  }
  spawnZombie(force) {
    const n = ++this.nextZombie;
    const type = force || infectedForWave(this.round, random(this.seed + n * 71 + this.round * 17));
    if (!ZOMBIES[type]) return null;
    const sectors = accessibleSectors(this.openDoors),
      players = [...this.players.values()].filter((p) => !p.downed && !p.eliminated);
    const location = this.forest
      ? chooseForestSpawn(this, n, ZOMBIES[type].radius)
      : this.spawnDirector.choose({
          serial: n,
          sectors,
          players,
          zombies: [...this.zombies.values()].map((z) => ({
            ...z,
            radius: ZOMBIES[z.type].radius,
          })),
          obstacles: this.obs,
          navigation: ZOMBIES[type].radius > 0.43 ? this.bossNav : this.nav,
          radius: ZOMBIES[type].radius,
          time: this.time,
        });
    if (!location) return null;
    const def = ZOMBIES[type],
      health = def.health * (1 + Math.max(0, this.round - 1) * 0.16);
    const zombie = {
      id: `z${n}`,
      type,
      ...location,
      y: 0,
      groundY: this.forest ? terrainHeight(this.seed, location.x, location.z) : 0,
      spawnAt: this.time,
      emergeEnd: this.time + (def.emergence || (type === 'boss' ? 2.1 : 1.45)),
      lastSpecial: -100,
      ability: '',
      abilityEnd: 0,
      enragedUntil: 0,
      approachAngle: random(n * 73 + this.round * 31) * Math.PI * 2,
      approachRadius: 0.55 + random(n * 97 + this.round * 43) * 0.3,
      approachSide: random(n * 101 + this.round * 59) * 2 - 1,
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
    this.event('spawn', {
      zombie: zombie.id,
      x: zombie.x,
      z: zombie.z,
      duration: zombie.emergeEnd - this.time,
    });
    return zombie;
  }
  hasSight(a, b) {
    const delta = { x: b.x - a.x, y: 0, z: b.z - a.z },
      len = Math.hypot(delta.x, delta.z);
    if (len < 0.01) return true;
    delta.x /= len;
    delta.z /= len;
    const origin = { x: a.x, y: (a.groundY || 0) + 1, z: a.z };
    return !rayObstacles(this.obs, origin, delta, len).some((o) => rayBox(origin, delta, o) < len);
  }
  updateZombies(dt) {
    const players = [...this.players.values()].filter((p) => !p.downed && !p.eliminated),
      all = [...this.zombies.values()];
    if (!players.length) return;
    for (const z of all) {
      if (!this.zombies.has(z.id)) continue;
      if (this.time < z.emergeEnd) continue;
      const def = ZOMBIES[z.type];
      if (z.finalBoss && this.updateFinalBoss(z)) continue;
      let target = players[0];
      for (const p of players)
        if (
          distance(z, p) - (p.noiseUntil > this.time ? 6 : 0) <
          distance(z, target) - (target.noiseUntil > this.time ? 6 : 0)
        )
          target = p;
      const wardingLamp =
        z.type !== 'boss' &&
        this.lanterns.find(
          (l) =>
            distance(z, l) < LANTERN.radius + 0.65 &&
            (distance(target, l) < LANTERN.radius || distance(z, l) < LANTERN.radius) &&
            this.hasSight(z, l),
        );
      if (this.forest) {
        z.groundY = terrainHeight(this.seed, z.x, z.z);
        if (z.trappedUntil > this.time) continue;
        const defense =
          !wardingLamp &&
          this.defenses.find(
            (d) =>
              d.hp > 0 && distance(d, z) < 3 && distance(d, target) + 0.15 < distance(z, target),
          );
        if (defense) {
          z.yaw = Math.atan2(z.x - defense.x, z.z - defense.z);
          if (this.time - z.lastAttack > 1.05) {
            z.lastAttack = this.time;
            defense.hp = Math.max(0, defense.hp - def.damage * 1.5);
            this.event('defenseHit', {
              id: defense.id,
              hp: defense.hp,
              x: defense.x,
              z: defense.z,
            });
            if (!defense.hp) this.rebuildForest();
          }
          continue;
        }
      }
      const dist = distance(z, target);
      const sight = this.hasSight(z, target);
      z.afraid = false;
      const lamp = wardingLamp;
      if (lamp) {
        z.afraid = true;
        const d = distance(z, lamp),
          angle = z.approachAngle;
        const dx = d > 0.05 ? (z.x - lamp.x) / d : Math.cos(angle),
          dz = d > 0.05 ? (z.z - lamp.z) / d : Math.sin(angle);
        if (d < LANTERN.radius + 0.3)
          slide(z, dx * def.speed * dt, dz * def.speed * dt, this.obs, def.radius);
        z.yaw = Math.atan2(-dx, -dz);
        z._navCheck = null;
        continue;
      }
      if (this.specialAttack(z, target, dist, sight, dt)) continue;
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
      const reach = z.type === 'boss' ? 1.9 : z.type === 'brute' ? 1.6 : 1.15;
      if (dist < reach && sight && Math.abs(target.y) < 1.3) {
        if (this.time - z.lastAttack > (z.type === 'boneguard' ? 0.85 : 1.05) && !z.windup) {
          z.lastAttack = this.time;
          this.damagePlayer(target, def.damage * (1 + this.round * 0.025), z);
          this.event('attack', { zombie: z.id });
        }
      } else if (!z.windup) {
        const approachRadius = z.type === 'boss' ? 0.45 : z.approachRadius;
        const approachTarget = {
          x: target.x + Math.cos(z.approachAngle) * approachRadius,
          z: target.z + Math.sin(z.approachAngle) * approachRadius,
        };
        const navigation = def.radius > 0.43 ? this.bossNav : this.nav;
        if (this.forest && (!z._navCheck || this.time >= z._navCheck.next)) {
          if (z._navCheck && distance(z, z._navCheck) < 0.25) {
            z._navRoute = navigation.escapeRoute(z, target);
            z._navUntil = this.time + 5;
          }
          z._navCheck = { x: z.x, z: z.z, next: this.time + 1 };
        }
        if (z._navRoute && this.time > z._navUntil) z._navRoute = null;
        while (z._navRoute?.length && distance(z, z._navRoute[0]) < 0.22) z._navRoute.shift();
        const waypoint = z._navRoute?.[0];
        const dir = waypoint
          ? {
              x: (waypoint.x - z.x) / (distance(waypoint, z) || 1),
              z: (waypoint.z - z.z) / (distance(waypoint, z) || 1),
            }
          : navigation.direction(z, this.forest ? target : approachTarget);
        // Follow the navigation route around corners before adding flanking motion.
        // A sideways bias can otherwise cancel the small escape component at a wall.
        const flank = sight && !waypoint && (!this.forest || dist < 6) ? z.approachSide * 0.3 : 0;
        let dx = dir.x - dir.z * flank,
          dz = dir.z + dir.x * flank;
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
          (z.enragedUntil > this.time ? 1.35 : 1) *
          (z.burstUntil > this.time ? 1.45 : 1) *
          (this.forest && forestWeather(this.seed, this.time).daylight < 0.3 ? 1.12 : 1) *
          (this.time - z.hitAt < 0.1 ? 0.45 : 1);
        const length = Math.max(1, Math.hypot(dx, dz));
        slide(z, (dx / length) * speed * dt, (dz / length) * speed * dt, this.obs, def.radius);
        if (dx || dz) z.yaw = Math.atan2(-dx, -dz);
      }
    }
  }
  updateFinalBoss(z) {
    z.guardians = z.guardians.filter((id) => this.zombies.has(id));
    if (z.summonAt && this.time >= z.summonAt) {
      z.summonAt = 0;
      z.bossStage++;
      z.guardRemaining = 6 + z.bossStage * 2 + Math.max(0, this.players.size - 1) * 2;
      z.ritualEnd = this.time + 1.5;
      z.nextGuard = z.ritualEnd;
      this.event('bossSummon', { stage: z.bossStage });
    }
    if (z.ritualEnd > this.time) return true;
    if (z.ritualEnd) z.ritualEnd = 0;
    if (z.guardRemaining > 0) {
      if (this.time >= z.nextGuard) {
        const types =
          z.bossStage >= 3
            ? ['runner', 'armored', 'spitter', 'normal']
            : ['normal', 'runner', 'normal', 'armored'];
        const minion = this.spawnZombie(types[z.guardRemaining % types.length]);
        if (minion) {
          minion.minionOf = z.id;
          z.guardians.push(minion.id);
          z.guardRemaining--;
        }
        z.nextGuard = this.time + 0.4;
      }
      return true;
    }
    if (z.shielded && !z.summonAt && !z.guardians.length && z.bossStage > 0) {
      z.shielded = false;
      this.event('bossExposed', { stage: z.bossStage });
    }
    return false;
  }
  specialAttack(z, target, dist, sight, dt) {
    if (z.leapEnd > this.time) {
      slide(z, z.leapVX * dt, z.leapVZ * dt, this.obs, ZOMBIES[z.type].radius);
      z.y = Math.sin(Math.PI * clamp((this.time - z.leapStart) / 0.7, 0, 1)) * 1.5;
      return true;
    }
    if (z.leapEnd) {
      z.leapEnd = 0;
      z.y = 0;
      if (dist < 1.65 && sight && target.y < 1) this.damagePlayer(target, 23, z);
      this.event('landing', { x: z.x, z: z.z });
    }
    if (z.ability) {
      if (this.time < z.abilityEnd) return true;
      const ability = z.ability;
      z.ability = '';
      z.lastSpecial = this.time;
      z.lastAttack = this.time;
      if (ability === 'spit') {
        const dx = z.aimX - z.x,
          dz = z.aimZ - z.z,
          len = Math.hypot(dx, dz) || 1;
        this.projectiles.push({
          id: `acid${++this.nextHazard}`,
          x: z.x,
          z: z.z,
          y: 1.15,
          vx: (dx / len) * 10,
          vz: (dz / len) * 10,
          end: this.time + Math.min(2, len / 10 + 0.25),
        });
        this.event('spit', { x: z.x, z: z.z });
      } else if (ability === 'scream') {
        for (const other of this.zombies.values())
          if (distance(z, other) < 9) other.enragedUntil = this.time + 4;
        this.event('scream', { x: z.x, z: z.z });
      } else if (ability === 'leap') {
        const dx = z.aimX - z.x,
          dz = z.aimZ - z.z,
          len = Math.hypot(dx, dz) || 1;
        z.leapVX = (dx / len) * Math.min(10, len / 0.7);
        z.leapVZ = (dz / len) * Math.min(10, len / 0.7);
        z.leapStart = this.time;
        z.leapEnd = this.time + 0.7;
      } else if (ability === 'slam') {
        for (const p of this.players.values())
          if (distance(z, p) < 3.2 && this.hasSight(z, p) && p.y < 0.8) this.damagePlayer(p, 30, z);
        this.event('landing', { x: z.x, z: z.z });
      }
      return true;
    }
    const since = this.time - z.lastSpecial;
    let ability;
    if (z.type === 'spitter' && since > 3.5 && dist > 4 && dist < 13 && sight) ability = 'spit';
    if (z.type === 'screamer' && since > 8 && dist < 10 && sight) ability = 'scream';
    if (z.type === 'leaper' && since > 5.5 && dist > 3 && dist < 7.5 && sight) ability = 'leap';
    if (z.type === 'brute' && since > 6 && dist < 3.8 && sight) ability = 'slam';
    if (z.type === 'stalker' && since > 5 && dist > 3 && dist < 10) {
      z.burstUntil = this.time + 0.9;
      z.lastSpecial = this.time;
    }
    if (!ability) return false;
    z.ability = ability;
    z.abilityEnd = this.time + (ability === 'leap' ? 0.45 : ability === 'scream' ? 1.1 : 0.75);
    z.aimX = target.x;
    z.aimZ = target.z;
    z.yaw = Math.atan2(z.x - target.x, z.z - target.z);
    this.event('ability', { zombie: z.id, ability, x: z.x, z: z.z });
    return true;
  }
  addHazard(point, type, radius, duration, damage) {
    if (this.hazards.length >= 24) this.hazards.shift();
    this.hazards.push({
      id: `hazard${++this.nextHazard}`,
      type,
      x: point.x,
      z: point.z,
      radius,
      end: this.time + duration,
      start: this.time,
      damage,
      nextTick: this.time + 0.4,
    });
  }
  updateHazards(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i],
        speed = Math.hypot(p.vx, p.vz),
        distanceStep = speed * dt;
      const direction = { x: p.vx / speed, y: 0, z: p.vz / speed };
      const wall = this.obs.some((box) => rayBox(p, direction, box) < distanceStep + 0.06);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      const hit = [...this.players.values()].find(
        (player) =>
          !player.downed &&
          !player.eliminated &&
          Math.hypot(player.x - p.x, player.z - p.z) < 0.55 &&
          player.y < 1.15,
      );
      if (wall || hit || this.time >= p.end) {
        if (hit) this.damagePlayer(hit, 17, p);
        this.addHazard(p, 'acid', 1.55, 4, 5);
        this.event('acidImpact', { x: p.x, z: p.z });
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (this.time >= h.end) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (this.time < h.nextTick) continue;
      h.nextTick = this.time + 0.6;
      for (const p of this.players.values())
        if (distance(h, p) < h.radius && p.y < 0.9 && this.hasSight(h, p))
          this.damagePlayer(p, h.damage, h);
      if (h.type === 'fire')
        for (const z of [...this.zombies.values()])
          if (distance(h, z) < h.radius && this.hasSight(h, z))
            this.damageZombie(z, 38, this.players.get(h.owner));
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
    const candidates = this.forest
      ? this.forestInteractions()
      : [
          ...DOORS.filter((d) => !this.openDoors.includes(d.id)).map((d) => ({
            ...d,
            type: 'door',
            name: 'UNLOCK SECTOR',
          })),
          ...STATIONS,
          ...this.blueprints,
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
    if (
      this.forest &&
      [
        'defense',
        'cache',
        'woodpile',
        'workbench',
        'route',
        'store',
        'contract',
        'campUpgrade',
      ].includes(item.type)
    )
      return this.interactForest(p, item);
    // A closed door itself blocks line-of-sight. nearest() permits its near face.
    if (item.type === 'log') {
      this.collected.push(item.id);
      p.points += 200;
      this.event('log', { player: p.id, title: item.title, text: item.text });
      return true;
    }
    if (item.type === 'blueprint') {
      this.blueprints = this.blueprints.filter((drop) => drop.id !== item.id);
      if (!p.unlockedWeapons.includes(item.weapon)) p.unlockedWeapons.push(item.weapon);
      this.event('unlock', {
        player: p.id,
        weapon: item.weapon,
        name: WEAPONS[item.weapon].name,
      });
      return true;
    }
    if (item.type === 'weapon') {
      if (p.unlockedWeapons.includes(item.weapon)) {
        this.event('notice', {
          player: p.id,
          message: `${item.name} BLUEPRINT READY — PRESS B TO BUY`,
        });
        return false;
      }
      p.unlockedWeapons.push(item.weapon);
      this.event('unlock', { player: p.id, weapon: item.weapon, name: item.name });
      return true;
    }
    if (p.points < item.price) return fail('INSUFFICIENT POINTS');
    const inv = p.inventory[p.slot];
    if (item.type === 'door') {
      this.openDoors.push(item.id);
      this.physics.openDoor(item.id);
      this.obs = obstacles(this.openDoors, this.chapter);
      this.nav.setObstacles(this.obs);
      this.bossNav.setObstacles(this.obs);
    } else if (item.type === 'mystery') {
      const keys = (this.forest ? BASIC_WEAPONS : Object.keys(WEAPONS)).filter((k) => k !== 'vx9'),
        weapon = item.weapon || keys[Math.floor(random(this.seed + this.time) * keys.length)];
      this.grantWeapon(p, weapon);
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
  forestOptions() {
    return this.forest ? { seed: this.seed, ring: this.forest.ring, obstacles: this.obs } : null;
  }
  rebuildForest() {
    this.worldRevision++;
    this.obs = indexObstacles([
      ...this.forest.obstacles(this.defenses, this.openDoors),
      ...survivalStationBoxes(),
    ]);
    const navObs = indexObstacles(this.obs.filter((b) => !b.id.startsWith('def-'))),
      bounds = forestBounds(this.forest.ring);
    this.nav.setObstacles(navObs, bounds);
    this.bossNav.setObstacles(navObs, bounds);
    this.physics.syncForest(this.forestOptions());
  }
  expandForest(wave) {
    const next = forestRing(wave);
    if (next <= this.forest.ring) return;
    this.forest.ensure(next);
    this.rebuildForest();
    this.event('forestExpanded', { ring: next, wave, edge: (next + 0.5) * 24 });
  }
  forestInteractions() {
    return [
      ...SURVIVAL_STATIONS,
      WORKBENCH,
      ...this.blueprints,
      ...SURVIVAL_LOGS.filter((c) => !this.collected.includes(c.id)).map((c) => ({
        ...c,
        type: 'log',
        name: 'DZIENNIK OCALAŁYCH',
        price: 0,
      })),
      ...this.forest.caches(this.claimedCaches),
      ...this.forest.routes(this.openDoors),
      CONTRACT_BOARD,
      ...CAMP_UPGRADES.map((u) => ({
        ...u,
        name: `${u.name} / ${this.campLevels[u.id]}/3`,
        price: 0,
      })),
      ...this.defenses.map((d) => ({
        ...d,
        type: 'defense',
        price: 0,
        name: `${d.name} / ${Math.ceil(d.hp)} HP`,
        progress: d.hp / d.maxHp,
      })),
    ];
  }
  interactForest(p, item) {
    if (item.type === 'workbench') return false; // UI opens it; every craft still validates proximity here.
    if (item.type === 'store') {
      this.event('notice', { player: p.id, message: 'B / OTWÓRZ MAGAZYN OBOZOWY' });
      return false;
    }
    if (item.type === 'campUpgrade') {
      const level = this.campLevels[item.id];
      if (level >= 3) return false;
      const cost = campUpgradeCost(level);
      if (Object.entries(cost).some(([k, n]) => p.resources[k] < n)) {
        this.event('notice', { player: p.id, message: 'Brakuje materiałów na rozbudowę obozu.' });
        return false;
      }
      for (const [k, n] of Object.entries(cost)) p.resources[k] -= n;
      this.campLevels[item.id]++;
      for (const member of this.players.values()) member.campLevels = { ...this.campLevels };
      this.worldRevision++;
      this.event('notice', { player: p.id, message: `${item.name} / ROZBUDOWANO DLA DRUŻYNY` });
      return true;
    }
    if (item.type === 'contract') {
      if (this.contract?.ready) {
        for (const member of this.players.values()) {
          member.points += 450;
          for (const k of ['wood', 'scrap', 'parts', 'medicine'])
            member.resources[k] = Math.min(999, member.resources[k] + (k === 'parts' ? 3 : 5));
        }
        this.contract = null;
        this.contractNumber++;
        this.event('contractReward', {});
      }
      if (!this.contract)
        this.contract = newContract(this.contractNumber, this.forest, this.claimedCaches);
      this.worldRevision++;
      this.event('notice', {
        player: p.id,
        message: `WYPRAWA: ${this.contract.name} / ${this.contract.progress}/${this.contract.goal}`,
      });
      return true;
    }
    if (item.type === 'route') {
      if (p.resources.wood < 3 || p.resources.scrap < 2) {
        this.event('notice', { player: p.id, message: 'Potrzebujesz 3 drewna i 2 złomu.' });
        return false;
      }
      p.resources.wood -= 3;
      p.resources.scrap -= 2;
      this.openDoors.push(item.id);
      this.rebuildForest();
      this.event('notice', {
        player: p.id,
        message: 'CHATA OTWARTA / wspólny szlak dla całej grupy',
      });
      return true;
    }
    if (item.type === 'cache') {
      if (this.claimedCaches.includes(item.id)) return false;
      this.claimedCaches.push(item.id);
      if (this.contract?.kind === 'supply' && this.contract.target === item.id) {
        this.contract.progress = 1;
        this.contract.ready = true;
      }
      if (item.blueprint)
        for (const member of this.players.values())
          if (!member.unlockedWeapons.includes(item.blueprint)) {
            member.unlockedWeapons.push(item.blueprint);
            this.event('unlock', {
              player: member.id,
              weapon: item.blueprint,
              name: WEAPONS[item.blueprint].name,
            });
          }
      const loot = { wood: 5, scrap: 6, parts: 2, medicine: 2 };
      for (const [key, n] of Object.entries(loot))
        p.resources[key] = Math.min(999, p.resources[key] + n);
      p.points += 150;
      this.worldRevision++;
      this.event('notice', {
        player: p.id,
        message: `${item.blueprint ? `SCHEMAT ${WEAPONS[item.blueprint].name} / DLA CAŁEJ DRUŻYNY · ` : ''}ZAPASY: +5 drewna · +6 złomu · +2 części · +2 medykamenty · +150 kredytów`,
      });
      return true;
    }
    if (item.type === 'woodpile') {
      if (p.woodWave === this.round) return false;
      p.woodWave = this.round;
      p.resources.wood = Math.min(999, p.resources.wood + 4);
      this.event('notice', {
        player: p.id,
        message: '+4 DREWNA / zapas odnawia się przy kolejnej fali',
      });
      return true;
    }
    const d = this.defenses.find((d) => d.id === item.id);
    if (!d || p.resources.wood < 2) {
      this.event('notice', { player: p.id, message: 'Potrzebujesz 2 drewna.' });
      return false;
    }
    if (this.time - p.lastRepair < 0.8) return false;
    if (d.hp >= d.maxHp && d.level >= 2) return false;
    p.resources.wood -= 2;
    p.lastRepair = this.time;
    if (d.hp >= d.maxHp) {
      d.level = 2;
      d.maxHp = 600;
    }
    const rebuild = d.hp === 0;
    d.hp = Math.min(d.maxHp, d.hp + 150);
    if (rebuild) this.rebuildForest();
    else this.worldRevision++;
    this.event('notice', { player: p.id, message: `${d.name}: ${d.hp}/${d.maxHp} HP` });
    return true;
  }
  craft(p, id) {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe) return false;
    const reason = craftStatus(
      p,
      recipe,
      distance(p, WORKBENCH) < 3 && this.hasSight(p, WORKBENCH),
    );
    if (reason) {
      this.event('notice', { player: p.id, message: reason });
      return false;
    }
    const inv = p.inventory[p.slot];
    if (id === 'ammo' && inv.reserve >= WEAPONS[inv.id].reserve) return false;
    for (const [key, n] of Object.entries(discountedRecipeCost(recipe, this.campLevels.workshop)))
      p.resources[key] -= n;
    if (id === 'ammo') inv.reserve = WEAPONS[inv.id].reserve;
    else if (id === 'armor') p.armor = 100;
    else if (['magazine', 'handling', 'optic'].includes(id)) inv[id] = true;
    else p.equipment[id]++;
    this.event('purchase', { player: p.id, item: `craft:${id}`, name: recipe.name });
    return true;
  }
  useEquipment(p, id) {
    if (
      !['medkit', 'molotov', 'trap', 'lantern'].includes(id) ||
      !p.equipment[id] ||
      this.time - (p.lastEquipment ?? -100) < 0.6
    )
      return false;
    if (id === 'medkit') {
      if (p.hp >= p.maxHp) return false;
      p.hp = Math.min(p.maxHp, p.hp + 65 + this.campLevels.clinic * 5);
    } else {
      const dir = { x: -Math.sin(p.yaw), y: 0, z: -Math.cos(p.yaw) };
      const length = id === 'lantern' ? 1.8 : id === 'trap' ? 1.4 : 9;
      let reach = length;
      for (const b of rayObstacles(this.obs, { x: p.x, y: 0.5, z: p.z }, dir, length))
        reach = Math.min(reach, Math.max(0, rayBox({ x: p.x, y: 0.5, z: p.z }, dir, b) - 0.5));
      if (reach < 0.7) return false;
      const point = { x: p.x + dir.x * reach, z: p.z + dir.z * reach };
      if (id === 'lantern') {
        if (
          !p.grounded ||
          Math.abs(p.y - terrainHeight(this.seed, p.x, p.z)) > 1.2 ||
          blocked(point.x, point.z, this.obs, 0.3)
        )
          return false;
        if (
          this.lanterns.filter((l) => l.end > this.time).length >= LANTERN.worldLimit ||
          this.lanterns.some((l) => l.end > this.time && distance(l, point) < 3)
        ) {
          this.event('notice', {
            player: p.id,
            message: 'Za blisko innej latarni lub limit 4 aktywnych latarni.',
          });
          return false;
        }
        this.lanterns.push({
          ...point,
          id: `lantern${++this.nextHazard}`,
          player: p.id,
          end: this.time + LANTERN.duration,
        });
      } else if (id === 'trap') {
        if (this.traps.filter((t) => t.player === p.id).length >= 2) return false;
        this.traps.push({
          ...point,
          id: `trap${++this.nextHazard}`,
          player: p.id,
          end: this.time + 180,
        });
      } else {
        this.throwables.push({ ...point, player: p.id, end: this.time + 0.65 });
        this.event('molotov', {
          ...point,
          player: p.id,
          origin: { x: p.x, y: p.y + 1.3, z: p.z },
          duration: 0.65,
        });
      }
      this.event('equipment', { player: p.id, item: id, ...point });
    }
    p.equipment[id]--;
    p.lastEquipment = this.time;
    return true;
  }
  updateTraps() {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i],
        z = [...this.zombies.values()].find(
          (z) => distance(z, trap) < 1 && this.time > z.emergeEnd,
        );
      if (z) {
        z.trappedUntil = this.time + 3;
        this.damageZombie(z, 150, this.players.get(trap.player));
        this.event('trapHit', trap);
      }
      if (z || trap.end < this.time) this.traps.splice(i, 1);
    }
  }
  updateCamp() {
    this.pings = this.pings.filter((mark) => mark.end > this.time);
    const level = this.campLevels.generator;
    if (level && this.time - this.lastPulse > 8 - level) {
      this.lastPulse = this.time;
      const owner = [...this.players.values()].find((p) => !p.downed && !p.eliminated);
      for (const z of [...this.zombies.values()])
        if (this.defenses.some((d) => distance(z, d) < 4)) this.damageZombie(z, level * 12, owner);
      this.event('campPulse', { level });
    }
  }
  snapshot() {
    return {
      ...(this.training
        ? {
            training: {
              ...this.training,
              remaining: Math.max(0, this.training.endAt - this.time),
              accuracy: this.training.shots ? this.training.hits / this.training.shots : 0,
            },
          }
        : {}),
      ...(this.forest
        ? {
            campLevels: { ...this.campLevels },
            contract: this.contract ? { ...this.contract } : null,
            pings: this.pings.map((mark) => ({ ...mark })),
          }
        : {}),
      ...(this.forest
        ? {
            forest: this.forest.snapshot(
              this.claimedCaches,
              this.defenses,
              this.worldRevision,
              this.openDoors,
            ),
            traps: this.traps.map((t) => ({ ...t })),
            lanterns: this.lanterns.map((l) => ({ ...l })),
          }
        : {}),
      time: this.time,
      matchId: this.matchId,
      clearedWaves: this.clearedWaves,
      state: this.state,
      round: this.round,
      chapter: this.chapter,
      wave:
        this.phase === 'chapter'
          ? 1
          : this.phase === 'prepare'
            ? (this.round % WAVES_PER_CHAPTER) + 1
            : chapterWave(this.round),
      phase: this.phase,
      countdown: this.countdown,
      remaining: this.toSpawn + this.zombies.size,
      openDoors: [...this.openDoors],
      collected: [...this.collected],
      blueprints: this.blueprints.map((drop) => ({ ...drop })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      hazards: this.hazards.map((h) => ({ ...h })),
      players: [...this.players.values()].map((p) => ({
        ...p,
        inventory: p.inventory.map((i) => ({ ...i })),
        perks: [...p.perks],
        unlockedWeapons: [...p.unlockedWeapons],
        skins: { ...p.skins },
        resources: { ...p.resources },
        campLevels: { ...p.campLevels },
        equipment: { ...p.equipment },
      })),
      zombies: [...this.zombies.values()].map(
        ({ contributors, _navRoute, _navCheck, _navUntil, guardians, ...z }) => ({
          ...z,
          ...(guardians
            ? {
                guardsAlive:
                  guardians.filter((id) => this.zombies.has(id)).length + z.guardRemaining,
              }
            : {}),
        }),
      ),
    };
  }
  dispose() {
    this.physics.dispose();
  }
  startTraining(p, weapon, drill) {
    if (!WEAPONS[weapon] || !Object.hasOwn(TRAINING_DRILLS, drill)) return false;
    this.zombies.clear();
    this.training = trainingStats(this.time, drill);
    this.phase = 'training';
    this.round = 0;
    p.inventory = [makeInventory(weapon)];
    p.slot = 0;
    p.reloadEnd = 0;
    p.shotIndex = 0;
    p.kills = 0;
    p.headshots = 0;
    p.hp = p.maxHp;
    p.lastFire = -100;
    p.fireWeapon = null;
    p.nextFire = 0;
    p.aimAlpha = 0;
    this.event('trainingStart', { drill });
    this.updateTraining(0);
    return true;
  }
  updateTraining(dt) {
    const t = this.training;
    for (const p of this.players.values()) {
      p.hp = p.maxHp;
      p.inventory[p.slot].reserve = WEAPONS[p.inventory[p.slot].id].reserve;
    }
    if (this.time >= t.endAt) {
      if (!t.finished) this.event('trainingComplete', { ...t });
      t.finished = true;
      return;
    }
    const count = t.drill === 'reaction' ? 1 : 3;
    if (this.time >= t.nextSpawn)
      while (this.zombies.size < count) {
        const n = ++this.nextZombie,
          lane = ((n % 3) - 1) * 9;
        const x = t.drill === 'reaction' ? (forestRandom(this.seed, n, 0, 81) - 0.5) * 26 : lane;
        const z =
          t.drill === 'reaction' ? -10 + forestRandom(this.seed, n, 0, 82) * 13 : -8 - (n % 2) * 3;
        this.zombies.set(`target${n}`, {
          id: `target${n}`,
          type: 'normal',
          x,
          z,
          y: 0,
          groundY: 0,
          yaw: Math.PI,
          hp: 85,
          maxHp: 85,
          emergeEnd: 0,
          spawnAt: -3,
          lastAttack: -100,
          hitAt: -100,
          phase: 1,
          contributors: {},
          lane: x,
          trainingTarget: true,
        });
      }
    if (t.drill === 'tracking')
      for (const z of this.zombies.values())
        z.x = z.lane + Math.sin((this.time - t.startedAt) * 1.4 + z.lane) * 3;
  }
}
