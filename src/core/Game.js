import * as THREE from 'three';
import { cameraPitch } from '../player/PointerLook.js';
import { Renderer } from '../rendering/Renderer.js';
import { ForestMap as MapBuilder } from '../world/ForestMap.js';
import { ZombieRenderer } from '../enemies/ZombieRenderer.js';
import { WeaponView } from '../weapons/WeaponView.js';
import { Effects } from '../rendering/Effects.js';
import { AudioManager } from '../audio/AudioManager.js';
import { InputManager } from './InputManager.js';
import { NetworkManager } from '../multiplayer/NetworkManager.js';
import { ModelPreview } from '../ui/ModelPreview.js';
import { UI, readSettings } from '../ui/UI.js';
import { initPhysics, Physics } from '../../shared/Physics.js';
import { Simulation } from '../../shared/Simulation.js';
import { TICK, WEAPONS, distance } from '../../shared/config.js';
import { DOORS, STATIONS, COLLECTIBLES, obstacles, rayBox } from '../../shared/map.js';
import { SkinInventory } from '../weapons/SkinInventory.js';
import { rayObstacles } from '../../shared/SpatialIndex.js';

export class Game {
  constructor() {
    this.settings = readSettings();
    this.skins = new SkinInventory();
    this.ui = new UI(this.settings, this.skins);
    this.canvas = document.getElementById('viewport');
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager(this.settings);
    this.network = new NetworkManager();
    this.devInfiniteMoney = false;
    this.devConsole = null;
    if (
      import.meta.env.DEV &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
    ) {
      import('../ui/DevConsole.js')
        .then(({ DevConsole }) => {
          this.devConsole = new DevConsole({
            game: this,
            onOpenChange: (open) => {
              if (open && this.mode !== 'menu') {
                this.devWasPlaying = !this.paused && !this.gameEnded;
                this.paused = true;
                this.input.clear();
                document.exitPointerLock?.();
              } else if (!open && this.devWasPlaying) {
                this.devWasPlaying = false;
                this.paused = true;
                this.ui.pause(false);
              }
            },
          });
        })
        .catch((error) => console.error('Unable to load the local developer console:', error));
    }
    this.mode = 'menu';
    this.paused = false;
    this.time = 0;
    this.accumulator = 0;
    this.lastTime = 0;
    this.state = null;
    this.sim = null;
    this.id = 'solo';
    this.recoil = 0;
    this.landing = 0;
    this.wasGrounded = true;
    this.cameraTargetId = null;
    this.interactAt = 0;
    this.gameEnded = false;
    this.knifeEquipped = false;
    this.knifeFireHeld = false;
    this.pending = [];
    this.snapshots = [];
    this.predicted = null;
    this.prediction = null;
    this.sequence = 0;
    this.bind();
  }
  async init() {
    try {
      await initPhysics();
      this.view = new Renderer(this.canvas, this.settings);
      this.map = new MapBuilder(this.view.scene, 1, 1973, this.settings);
      this.zombies = new ZombieRenderer(this.view.scene);
      this.zombies.onImpact = (point) => {
        this.effects?.burst(point, 0x574333, 8, Math.min(3, point.force * 0.4));
        this.audio.sound({
          noise: true,
          duration: 0.17,
          volume: 0.07,
          filter: 320,
          position: point,
        });
      };
      this.weapon = new WeaponView(this.view.viewmodelScene, this.skins);
      this.preview = new ModelPreview(this.ui.el['index-canvas']);
      this.effects = new Effects(this.view.scene);
      this.input.sensitivity = this.settings.sensitivity * 0.001;
      this.view.renderer.compile(this.view.scene, this.view.camera);
      this.ui.ready();
      this.running = true;
      this.frame = (now) => this.update(now);
      this.frameId = requestAnimationFrame(this.frame);
    } catch (e) {
      console.error(e);
      this.ui.fatal(
        `Unable to initialize the game: ${e.message}. A desktop browser with WebGL 2 is required.`,
      );
    }
  }
  bind() {
    this.ui.on = {
      solo: () => this.startSolo(),
      training: () => this.startSolo(true),
      ping: (x, z) => this.action({ type: 'ping', x, z }),
      trainingSetup: (options) => {
        this.action({ type: 'training', ...options });
        this.resume();
      },
      buy: (id) => this.action({ type: 'shopBuy', item: id }),
      craft: (recipe) => this.action({ type: 'craft', recipe }),
      inspectEntry: (kind, id, skin) => this.preview?.show(kind, id, skin),
      armory: () => this.openSkins(),
      previewSkin: (skin) => this.preview?.setSkin(skin),
      skinEquipped: () => this.syncSkins(),
      rotatePreview: (on) => {
        if (this.preview) this.preview.autoRotate = on;
      },
      resizePreview: () => this.preview?.resize(),
      previewSound: async (id) => {
        await this.audio.start();
        await this.audio.loading;
        this.audio.shoot(id);
      },
      closeEntry: () => this.preview?.clear(),
      resume: () => this.resume(),
      quit: () => this.quit(),
      restart: () =>
        this.mode === 'solo'
          ? this.startSolo(!!this.state?.training)
          : this.network.request('start').catch((e) => this.ui.notice(e.message)),
      settings: (s) => {
        this.settings = s;
        this.input.sensitivity = s.sensitivity * 0.001;
        this.view?.applySettings(s);
        if (this.map) this.map.settings = s;
        this.map?.setLanguage(s.language);
        this.audio.volume(s.volume);
        this.syncSkins();
      },
      createLobby: () => this.createLobby(),
      joinLobby: () => this.joinLobby(),
      ready: () =>
        this.network
          .request('ready', {
            ready: !this.network.lobby?.players.find((p) => p.id === this.network.id)?.ready,
          })
          .catch((e) => this.lobbyError(e)),
      startMatch: () => {
        this.audio.start();
        this.network.request('start').catch((e) => this.lobbyError(e));
      },
      leaveLobby: () => {
        this.network.disconnect();
        this.ui.resetLobby();
      },
    };
    this.input.onAction = (action) => {
      if (this.mode === 'menu' || this.paused || this.gameEnded) return;
      if (action.type === 'pause') {
        document.exitPointerLock?.();
        this.paused = true;
        this.ui.pause(this.mode === 'multiplayer');
        return;
      }
      if (action.type === 'shop') {
        this.openShop();
        return;
      }
      if (action.type === 'skins') {
        this.openSkins();
        return;
      }
      if (action.type === 'craftMenu') {
        this.openCraft();
        return;
      }
      if (action.type === 'trainingMenu' && this.state?.training) {
        this.openTraining();
        return;
      }
      if (action.type === 'map') {
        this.openMap();
        return;
      }
      if (action.type === 'trainingReset' && this.state?.training) {
        this.action({ type: 'training' });
        return;
      }
      this.action(action);
    };
    this.input.onLockChange = (locked) => {
      if (this.devConsole?.open) return;
      if (this.mode === 'menu' || this.gameEnded) return;
      if (locked) {
        this.paused = false;
        this.ui.hideModal();
      } else {
        this.paused = true;
        if (!['shop', 'skin', 'craft', 'training', 'map'].includes(this.ui.activeModal))
          this.ui.pause(this.mode === 'multiplayer');
      }
    };
    this.network.addEventListener('lobby', (e) => this.ui.lobby(e.detail, this.network.id));
    this.network.addEventListener('started', (e) => this.startMultiplayer(e.detail));
    this.network.addEventListener('snapshot', (e) => this.receiveSnapshot(e.detail));
    this.network.addEventListener('disconnected', () => {
      if (this.mode === 'multiplayer') {
        this.quit();
        this.ui.showLobby();
        this.lobbyError(new Error('Connection lost. Rejoin a lobby to continue.'));
      } else if (this.ui.menuScreen === 'lobby') {
        this.ui.resetLobby();
        this.lobbyError(new Error('Disconnected from the server.'));
      }
    });
    addEventListener('beforeunload', () => {
      this.finishMatch();
      this.network.disconnect();
      this.sim?.dispose();
      this.prediction?.dispose();
      this.preview?.dispose();
    });
  }
  lobbyError(error) {
    this.ui.el['lobby-error'].textContent = error.message;
  }
  async createLobby() {
    this.ui.el['lobby-error'].textContent = 'CONNECTING…';
    try {
      await this.network.connect();
      const r = await this.network.request('create', { name: this.ui.el['player-name'].value });
      this.ui.lobby(r.lobby, this.network.id);
      this.ui.el['lobby-error'].textContent = '';
    } catch (e) {
      this.lobbyError(e);
    }
  }
  async joinLobby() {
    this.ui.el['lobby-error'].textContent = 'CONNECTING…';
    try {
      await this.network.connect();
      const r = await this.network.request('join', {
        name: this.ui.el['player-name'].value,
        code: this.ui.el['room-input'].value,
      });
      this.ui.lobby(r.lobby, this.network.id);
      this.ui.el['lobby-error'].textContent = '';
    } catch (e) {
      this.lobbyError(e);
    }
  }
  reset() {
    this.sim?.dispose();
    this.sim = null;
    this.prediction?.dispose();
    this.prediction = null;
    this.zombies?.reset();
    this.effects?.reset();
    this.map?.dispose();
    this.map = new MapBuilder(this.view.scene, 1, 1973, this.settings);
    this.input.clear();
    this.input.yaw = 0;
    this.input.pitch = 0;
    this.input.seq = 0;
    this.accumulator = 0;
    this.pending = [];
    this.snapshots = [];
    this.recoil = 0;
    this.gameEnded = false;
    this.knifeEquipped = false;
    this.knifeFireHeld = false;
    this.interactAt = 0;
    this.weapon.reloadDuration = 1;
    this.weapon.reset();
    this.landing = 0;
    this.wasGrounded = true;
    this.cameraTargetId = null;
    this.damageDirectionUntil = 0;
    this.ui.el['direction-indicator'].style.opacity = 0;
  }
  setChapter(number) {
    if (this.map) this.map.chapter = number;
  }
  setForest(state) {
    const f = state?.forest;
    if (!f) return;
    if (this.map.seed !== f.seed || this.map.training !== !!state.training) {
      this.map.dispose();
      this.map = new MapBuilder(
        this.view.scene,
        state.chapter || 1,
        f.seed,
        this.settings,
        !!state.training,
      );
    }
    this.map.sync(f);
    this.zombies?.ragdolls.setEnvironment(this.map.obstacles, f.seed);
    this.map.chapter = state.chapter || 1;
  }
  startSolo(training = false) {
    this.reset();
    this.network.disconnect();
    this.sim = new Simulation({
      seed: Math.floor(Math.random() * 0x7fffffff),
      forest: true,
      training,
    });
    this.id = 'solo';
    this.sim.addPlayer(this.id, this.ui.el['player-name'].value || 'OPERATOR');
    this.devInfiniteMoney = false;
    this.state = this.sim.snapshot();
    this.setForest(this.state);
    this.mode = 'solo';
    this.launch();
    if (training)
      this.ui.announce(
        'POLIGON OCALAŁYCH',
        '60 sekund / P — wybór ćwiczenia i broni / U — restart',
      );
  }
  startMultiplayer(state) {
    this.reset();
    this.mode = 'multiplayer';
    this.id = this.network.id;
    this.state = state;
    this.setForest(state);
    this.prediction = new Physics(state.openDoors, state.chapter || 1, {
      ...state.forest,
      obstacles: this.map.obstacles,
    });
    this.predicted = structuredClone(state.players.find((p) => p.id === this.id));
    this.prediction.add(this.predicted);
    this.syncSkins();
    this.launch();
  }
  launch() {
    this.ui.gameplay();
    this.input.enabled = true;
    this.paused = false;
    this.audio.start();
    this.input.lock();
    setTimeout(() => {
      if (!this.input.locked && this.mode !== 'menu' && !this.gameEnded) {
        this.paused = true;
        this.ui.pause(this.mode === 'multiplayer');
      }
    }, 250);
    this.ui.announce(
      'THE LOST FOREST',
      'Broń obozu. Zbieraj zapasy. Las odsłania nowe szlaki z kolejnymi falami.',
    );
  }
  resume() {
    this.audio.start();
    this.input.lock();
  }
  openShop() {
    if (this.state?.phase === 'chapter') return;
    const player = this.state?.players.find((p) => p.id === this.id);
    if (!player || player.downed || player.eliminated || this.gameEnded) return;
    this.paused = true;
    this.input.clear();
    this.ui.showShop(this.state, player, this.mode === 'multiplayer');
    document.exitPointerLock?.();
  }
  openCraft() {
    if (this.state?.training) {
      this.openTraining();
      return;
    }
    const p = this.state?.players.find((p) => p.id === this.id);
    if (!p || p.downed || p.eliminated || this.gameEnded || this.state.phase === 'chapter') return;
    this.paused = true;
    this.input.clear();
    this.ui.showCraft(this.state, p, this.mode === 'multiplayer');
    document.exitPointerLock?.();
  }
  openTraining() {
    const p = this.state?.players.find((p) => p.id === this.id);
    if (!p || !this.state.training) return;
    this.paused = true;
    this.input.clear();
    this.ui.showTraining(this.state, p);
    document.exitPointerLock?.();
  }
  openMap() {
    const p = this.state?.players.find((p) => p.id === this.id);
    if (!p || this.state?.training || this.state?.phase === 'chapter' || this.gameEnded) return;
    this.paused = true;
    this.input.clear();
    this.ui.showMap(this.state, p);
    document.exitPointerLock?.();
  }
  openSkins() {
    if (this.state?.phase === 'chapter') return;
    const p = this.state?.players.find((p) => p.id === this.id);
    const key = this.knifeEquipped
      ? `knife:${this.settings.knifeModel}`
      : p?.inventory[p.slot]?.id || 'vx9';
    if (this.mode !== 'menu') {
      this.paused = true;
      this.input.clear();
    }
    this.ui.showArmory(key);
    if (this.mode !== 'menu') document.exitPointerLock?.();
  }
  syncSkins() {
    if (this.mode === 'multiplayer')
      this.network.action({
        type: 'skins',
        loadout: this.skins.loadout,
        knife: this.knifeEquipped ? this.settings.knifeModel : null,
      });
  }
  quit() {
    this.finishMatch();
    this.mode = 'menu';
    this.input.enabled = false;
    document.exitPointerLock?.();
    this.reset();
    this.network.disconnect();
    this.ui.resetLobby();
    this.ui.showMenu();
    this.state = null;
    this.audio.stop();
  }
  finishMatch() {
    const state = this.mode === 'solo' ? this.sim?.snapshot() : this.state;
    if (this.mode === 'menu' || !state || state.training) return 0;
    return this.skins.rewardMatch(state.matchId, state.clearedWaves);
  }
  action(action) {
    if (this.state?.phase === 'chapter') return;
    if (action.type === 'training') this.knifeEquipped = false;
    if (action.type === 'interact') {
      const p = this.state?.players.find((p) => p.id === this.id);
      if (p && this.interaction(p)?.type === 'workbench') {
        this.openCraft();
        return;
      }
      if (p && this.interaction(p)?.type === 'store') {
        this.openShop();
        return;
      }
    }
    if (action.type === 'inspect') {
      this.weapon.inspect();
      return;
    }
    if (action.type === 'knifeToggle') {
      this.knifeEquipped = !this.knifeEquipped;
      this.syncSkins();
      this.knifeFireHeld = false;
      this.ui.notice(this.knifeEquipped ? 'KNIFE EQUIPPED' : 'FIREARM EQUIPPED');
      return;
    }
    if (action.type === 'switch' || action.type === 'shopBuy') {
      this.knifeEquipped = false;
      this.syncSkins();
    }
    if (this.mode === 'solo') {
      this.sim.action(this.id, action);
      this.applyDevMoney();
    } else this.network.action(action);
  }
  applyDevMoney() {
    if (!import.meta.env.DEV) return;
    if (!this.devInfiniteMoney || this.mode !== 'solo' || !this.sim) return;
    const player = this.sim.players.get(this.id);
    if (player) player.points = 1_000_000_000;
  }
  receiveSnapshot(state) {
    if (this.mode !== 'multiplayer') return;
    const oldForest = this.state?.forest;
    this.setForest(state);
    if (state.forest && state.forest.revision !== oldForest?.revision)
      this.prediction?.syncForest({ ...state.forest, obstacles: this.map.obstacles });
    if ((state.chapter || 1) !== (this.state?.chapter || 1)) {
      this.setChapter(
        state.chapter,
        state.players.find((p) => p.id === this.id),
      );
      this.prediction?.dispose();
      this.prediction = new Physics(state.openDoors, state.chapter, {
        ...state.forest,
        obstacles: this.map.obstacles,
      });
      this.pending = [];
      this.snapshots = [];
    }
    this.state = state;
    this.snapshots.push({ received: performance.now(), state });
    if (this.snapshots.length > 6) this.snapshots.shift();
    const authority = state.players.find((p) => p.id === this.id);
    if (!authority) return;
    for (const door of state.openDoors) this.prediction.openDoor(door);
    this.pending = this.pending.filter((i) => i.seq > authority.ack);
    this.predicted = structuredClone(authority);
    for (const input of this.pending)
      if (!authority.downed && !authority.eliminated && state.phase !== 'chapter') {
        this.predicted.yaw = input.yaw;
        this.predicted.pitch = input.pitch;
        this.prediction.move(this.predicted, input, TICK);
        this.prediction.step();
      }
    this.handleEvents(state.events || []);
  }
  interpolation() {
    if (this.snapshots.length < 2) return this.state;
    const renderTime = performance.now() - 100;
    let before = this.snapshots[0],
      after = this.snapshots.at(-1);
    for (let i = 1; i < this.snapshots.length; i++) {
      if (this.snapshots[i].received >= renderTime) {
        before = this.snapshots[i - 1];
        after = this.snapshots[i];
        break;
      }
    }
    const t = Math.max(
      0,
      Math.min(1, (renderTime - before.received) / (after.received - before.received || 1)),
    );
    const old = new Map(before.state.zombies.map((z) => [z.id, z]));
    return {
      ...this.state,
      zombies: after.state.zombies.map((z) => {
        const a = old.get(z.id) || z;
        return {
          ...z,
          x: THREE.MathUtils.lerp(a.x, z.x, t),
          y: THREE.MathUtils.lerp(a.y || 0, z.y || 0, t),
          z: THREE.MathUtils.lerp(a.z, z.z, t),
        };
      }),
    };
  }
  handleEvents(events) {
    for (const e of events) {
      if (e.type === 'kill') this.zombies.recordDeath(e);
      if (e.type === 'spawn') this.effects.burst({ x: e.x, y: 0.06, z: e.z }, 0x5c4c38, 7, 0.9);
      if (e.type === 'acidImpact') this.effects.burst({ x: e.x, y: 0.18, z: e.z }, 0x9ab74c, 12, 2);
      if (e.type === 'landing') this.effects.burst({ x: e.x, y: 0.06, z: e.z }, 0x77664e, 12, 2.2);
      this.ui.event(e, this.id);
      if (e.type === 'campPulse')
        for (const d of this.state.forest?.defenses || [])
          this.effects.burst({ x: d.x, y: 0.5, z: d.z }, 0xe9c27b, 4, 1.1);
      this.audio.event(e, this.id);
      if (e.type === 'damage' && e.player === this.id && e.source) {
        const p = this.state.players.find((p) => p.id === this.id);
        if (p) {
          const angle = Math.atan2(e.source.x - p.x, e.source.z - p.z) + this.input.yaw + Math.PI;
          this.ui.el['direction-indicator'].style.transform =
            `translateX(-50%) rotate(${-angle}rad)`;
          this.ui.el['direction-indicator'].style.opacity = 1;
          this.damageDirectionUntil = this.time + 0.6;
        }
      }
      if (e.type === 'shot') {
        this.effects.shot(e);
        if (e.player === this.id) {
          this.weapon.shoot(e);
          const w = WEAPONS[e.weapon];
          this.recoil = Math.min(
            0.14,
            this.recoil + w.recoil[(e.index - 1) % w.recoil.length] * 0.008,
          );
          this.view.flash.position.copy(this.view.camera.position);
          this.view.flash.intensity = e.weapon === 'spectre' ? 3 : 22;
        }
      }
      if (e.type === 'knife' && e.player === this.id) this.weapon.slash();
      if (e.type === 'reload' && e.player === this.id) this.weapon.reload(e.duration);
      if (e.type === 'explosion') this.effects.explosion(e);
      if (e.type === 'grenade') this.effects.grenade(e, e.time);
      if (e.type === 'molotov') this.effects.grenade(e, e.time);
    }
  }
  interaction(p) {
    if (this.state?.training) return null;
    if (this.sim) return this.sim.nearest(p);
    const obs = this.state.forest
      ? this.map.obstacles
      : obstacles(this.state.openDoors, this.state.chapter || 1);
    const revive = this.state.players.find((o) => {
      if (o.id === p.id || !o.downed || o.eliminated || distance(o, p) >= 2.4) return false;
      const length = distance(o, p) || 1;
      const dir = { x: (o.x - p.x) / length, y: 0, z: (o.z - p.z) / length };
      return !obs.some((b) => rayBox({ x: p.x, y: 1, z: p.z }, dir, b) < length);
    });
    if (revive)
      return { name: `REVIVE ${revive.name}`, type: 'revive', progress: revive.revive / 3 };
    const list = this.state.forest
      ? this.map.interactions(this.state)
      : [
          ...DOORS.filter((d) => !this.state.openDoors.includes(d.id)).map((d) => ({
            ...d,
            type: 'door',
            name: 'UNLOCK SECTOR',
          })),
          ...STATIONS,
          ...(this.state.blueprints || []),
          ...COLLECTIBLES.filter((c) => !this.state.collected.includes(c.id)).map((c) => ({
            ...c,
            type: 'log',
            name: 'RECOVER FIELD LOG',
          })),
        ];
    let nearest = null,
      len = 2.5;
    for (const item of list) {
      const d = distance(item, p),
        dir = { x: (item.x - p.x) / (d || 1), y: 0, z: (item.z - p.z) / (d || 1) };
      if (
        d < len &&
        !obs.some((b) => b.id !== item.id && rayBox({ x: p.x, y: 1, z: p.z }, dir, b) < d - 0.1)
      ) {
        nearest = item;
        len = d;
      }
    }
    return nearest;
  }
  update(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - (this.lastTime || now)) / 1000);
    this.lastTime = now;
    this.time += dt;
    if (this.mode === 'menu') {
      this.view.camera.position.set(-17 + Math.sin(this.time * 0.08) * 0.8, 3.2, 17);
      this.view.camera.lookAt(-3, 1.6, -6);
      this.map.update(this.time, dt, null, this.view.camera.position);
      this.view.updateForest(this.time, this.map.seed);
      this.zombies.update(
        [
          {
            id: 'ambient',
            type: 'normal',
            x: -31.6 + Math.sin(this.time * 0.2) * 0.4,
            z: -24,
            yaw: 2.7,
            lastAttack: -100,
            hitAt: -100,
          },
          {
            id: 'ambient2',
            type: 'armored',
            x: 31,
            z: -25,
            yaw: -2,
            lastAttack: -100,
            hitAt: -100,
          },
        ],
        [],
        '',
        this.time,
        dt,
      );
      this.view.render(dt, false);
    } else if (this.state) {
      this.recoil = THREE.MathUtils.damp(this.recoil, 0, this.input.fire ? 3 : 9, dt);
      this.accumulator += dt;
      let frameInput = this.input.sample(
        !this.paused && !this.gameEnded && this.state.phase !== 'chapter',
      );
      frameInput.pitch = cameraPitch(frameInput.pitch, this.recoil);
      if (this.knifeEquipped && frameInput.fire && !this.knifeFireHeld)
        this.action({ type: 'knifeAttack' });
      this.knifeFireHeld = this.knifeEquipped && frameInput.fire;
      if (this.knifeEquipped) {
        frameInput.fire = false;
        frameInput.ads = false;
      }
      let inputStepped = false;
      while (this.accumulator >= TICK) {
        inputStepped = true;
        const input = { ...frameInput, seq: ++this.sequence };
        if (this.mode === 'solo') {
          if (!this.paused && !this.gameEnded) {
            this.sim.input(this.id, input);
            this.sim.tick(TICK);
            this.applyDevMoney();
          }
        } else if (!this.gameEnded) {
          this.network.sendInput(input);
          this.pending.push(input);
          if (this.pending.length > 120) this.pending.shift();
          if (
            this.predicted &&
            !this.predicted.downed &&
            !this.predicted.eliminated &&
            this.state.phase !== 'chapter'
          ) {
            this.predicted.yaw = input.yaw;
            this.predicted.pitch = input.pitch;
            this.prediction.move(this.predicted, input, TICK);
            this.prediction.step();
          }
        }
        this.accumulator -= TICK;
      }
      if (inputStepped) this.input.consumeFire();
      if (this.mode === 'solo') {
        this.state = this.sim.snapshot();
        this.setForest(this.state);
        this.setChapter(
          this.state.chapter || 1,
          this.state.players.find((p) => p.id === this.id),
        );
        this.handleEvents(this.sim.takeEvents());
      }
      const state = this.mode === 'multiplayer' ? this.interpolation() : this.state,
        authority = this.state.players.find((p) => p.id === this.id);
      if (authority) {
        const p =
          this.mode === 'multiplayer'
            ? {
                ...authority,
                x: this.predicted.x,
                y: this.predicted.y,
                z: this.predicted.z,
                vx: this.predicted.vx,
                vz: this.predicted.vz,
                grounded: this.predicted.grounded,
                crouch: this.predicted.crouch,
                sliding: this.predicted.sliding,
              }
            : authority;
        if (
          this.input.keys.has('KeyE') &&
          !this.paused &&
          !this.gameEnded &&
          this.time - this.interactAt > 0.1
        ) {
          this.action({ type: 'interact' });
          this.interactAt = this.time;
        }
        let cameraPlayer = p;
        if (p.eliminated) {
          cameraPlayer = state.players.find((o) => !o.downed && !o.eliminated) || p;
        }
        const moving = Math.min(1, Math.hypot(cameraPlayer.vx, cameraPlayer.vz) / 4.6),
          bob =
            this.settings.headBob && cameraPlayer.grounded
              ? Math.sin(this.time * 16) * 0.023 * moving
              : 0;
        const eye = cameraPlayer.downed
          ? 0.65
          : cameraPlayer.sliding
            ? 0.62
            : cameraPlayer.crouch
              ? 0.98
              : 1.58;
        const targetChanged = cameraPlayer.id !== this.cameraTargetId;
        if (targetChanged) {
          this.cameraTargetId = cameraPlayer.id;
          this.landing = 0;
        } else if (cameraPlayer.grounded && !this.wasGrounded) {
          this.landing = 0.09;
        }
        this.wasGrounded = cameraPlayer.grounded;
        this.landing = THREE.MathUtils.damp(this.landing, 0, 9, dt);
        const targetY = cameraPlayer.y + eye + bob - this.landing;
        if (targetChanged) {
          this.view.camera.position.set(cameraPlayer.x, targetY, cameraPlayer.z);
        } else {
          this.view.camera.position.x = cameraPlayer.x;
          this.view.camera.position.z = cameraPlayer.z;
          this.view.camera.position.y = THREE.MathUtils.damp(
            this.view.camera.position.y,
            targetY,
            18,
            dt,
          );
        }
        if (this.time > this.damageDirectionUntil)
          this.ui.el['direction-indicator'].style.opacity = 0;
        this.view.camera.rotation.set(
          cameraPlayer === p
            ? cameraPitch(this.input.pitch, this.recoil)
            : cameraPitch(cameraPlayer.pitch),
          cameraPlayer === p ? this.input.yaw : cameraPlayer.yaw,
          cameraPlayer.downed ? -0.15 : 0,
          'YXZ',
        );
        const fov =
          this.settings.fov -
          (frameInput.ads
            ? (WEAPONS[p.inventory[p.slot].id].zoom || 15) + (p.inventory[p.slot].optic ? 5 : 0)
            : 0);
        const cameraFov = THREE.MathUtils.damp(this.view.camera.fov, fov, 13, dt);
        if (Math.abs(this.view.camera.fov - cameraFov) > 0.001) {
          this.view.camera.fov = cameraFov;
          this.view.camera.updateProjectionMatrix();
        }
        this.weapon.update(p, frameInput, dt, this.state.time, this.settings, this.knifeEquipped);
        this.map.update(this.time, dt, this.state, p);
        this.view.updateForest(this.state.time, this.state.forest?.seed || this.map.seed, p);
        this.zombies.update(state.zombies, state.players, this.id, this.state.time, dt);
        this.effects.update(dt, this.time, this.state);
        this.audio.update(p, state.zombies, this.state.time, this.state.forest);
        this.ui.update(this.state, p, this.interaction(p), dt, {
          multiplayer: this.mode === 'multiplayer',
          scoreboard: this.input.keys.has('Tab'),
          ads: frameInput.ads,
          knifeEquipped: this.knifeEquipped,
          sliding: p.sliding,
          cameraFov: this.view.camera.fov,
        });
        this.view.render(dt, !p.downed && !p.eliminated && this.state.phase !== 'chapter');
        if (this.state.state === 'over' && !this.gameEnded) {
          const skinReward = this.finishMatch();
          this.gameEnded = true;
          this.input.enabled = false;
          document.exitPointerLock?.();
          this.ui.gameover(
            this.state,
            p,
            this.mode === 'multiplayer',
            this.network.lobby?.host === this.id,
            skinReward,
          );
        }
      }
    }
    this.input.endFrame();
    this.preview?.update(dt);
    this.frameId = requestAnimationFrame(this.frame);
  }
}
