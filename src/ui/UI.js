import { WEAPONS, ZOMBIES, PERKS } from '../../shared/config.js';
import { NEW_INFECTED } from '../../shared/Infected.js';
import { chapterDefinition, WAVES_PER_CHAPTER } from '../../shared/Chapters.js';
import { chapterSectors } from '../../shared/map.js';
import { sectorAt } from '../../shared/map.js';
import { spreadFor } from '../../shared/Ballistics.js';
import { KNIFE_MODELS, canonicalKnifeId } from '../../shared/Knives.js';
import { ShopUI } from './ShopUI.js';
import { SkinsUI } from './SkinsUI.js';
import { SkinInventory } from '../weapons/SkinInventory.js';
import { SKIN_WEAPONS, SKIN_FINISHES_PER_WEAPON, skinKey } from '../../shared/Skins.js';
import { CraftUI } from './CraftUI.js';
import { TrainingUI } from './TrainingUI.js';
import { TacticalMap } from './TacticalMap.js';
import { campUpgradeCost } from '../../shared/CampSystems.js';
import { Localization } from './Localization.js';
import { TRAINING_DRILLS } from '../../shared/Training.js';
import {
  inCamp,
  forestBounds,
  forestWeather,
  forestChapterDefinition,
} from '../../shared/Forest.js';

export const DEFAULT_SETTINGS = {
  quality: 'high',
  sensitivity: 2.2,
  fov: 84,
  viewmodelFov: 65,
  volume: 0.55,
  headBob: true,
  dynamicResolution: false,
  knifeModel: 'karambit',
  language: 'pl',
};
export function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('deadzone-settings') || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      knifeModel: canonicalKnifeId(saved.knifeModel),
      language: saved.language === 'en' ? 'en' : 'pl',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const emblem =
  '<svg viewBox="0 0 40 40" fill="none"><path d="M20 3 36 12v17L20 38 4 29V12Z" stroke="currentColor" stroke-width="1.4"/><path d="m20 10 10 6v10l-10 6-10-6V16l10-6Zm0 7-4 3v5l4 2 4-2v-5l-4-3Z" fill="currentColor"/></svg>';
const CODEX_KEY = 'deadzone-field-index';
const ZOMBIE_INFO = {
  ...Object.fromEntries(
    Object.entries(NEW_INFECTED).map(([id, z]) => [id, { name: z.name, note: z.note }]),
  ),
  normal: {
    name: 'SHAMBLER',
    note: 'Standard infected. Slow, persistent, and dangerous in numbers.',
  },
  runner: {
    name: 'RUNNER',
    note: 'Fast-moving infected that closes distance before you can react.',
  },
  armored: { name: 'ARMORED', note: 'Heavy plating absorbs punishment. Use high-damage weapons.' },
  crawler: {
    name: 'CRAWLER',
    note: 'Low-profile infected that attacks from below your sightline.',
  },
  exploder: { name: 'EXPLODER', note: 'Volatile organism. Keep your distance when it gets close.' },
  boss: {
    name: 'THE HOLLOW',
    note: 'A massive infected. Watch for its shockwave wind-up.',
  },
};
const WEAPON_INFO = {
  vx9: 'Reliable sidearm issued to every operator.',
  desertEagle: 'A slow, heavy pistol with punishing headshots and difficult recoil.',
  tec9: 'A fast machine pistol that stays controllable while moving.',
  raven:
    'AK-47 in 7.62×39mm: steel receiver, wooden furniture and curved 30-round magazine. Powerful rounds and pronounced recoil; best in short bursts.',
  spectre: 'Suppressed rifle with precise, controlled fire.',
  vortex: 'High-rate submachine gun built for close quarters.',
  iron: 'Pump-action shotgun that devastates at short range.',
  lynx: 'Precision rifle capable of eliminating threats at long range.',
  scout: 'A light scoped rifle with lethal headshots but modest body damage.',
  pbs1: 'A precise, powerful scoped rifle with an integrated suppressor.',
};
const KNIFE_INFO = {
  karambit: {
    name: 'KARAMBIT',
    note: 'A curved field blade with a moulded grip and finger ring. Built for close-range slashes.',
  },
  skeleton: {
    name: 'SKELETON KNIFE',
    note: 'A lightweight pierced blade with a large finger opening and a wrapped handle.',
  },
  stiletto: {
    name: 'STILETTO',
    note: 'A narrow folding blade with walnut scales and steel bolsters. Opens on deployment.',
  },
};
const emptyCodex = () => ({ weapons: new Set(), zombies: new Set() });
function readCodex() {
  try {
    const saved = JSON.parse(localStorage.getItem(CODEX_KEY) || '{}');
    return {
      weapons: new Set(
        (Array.isArray(saved.weapons) ? saved.weapons : []).filter((id) =>
          Object.hasOwn(WEAPONS, id),
        ),
      ),
      zombies: new Set(
        (Array.isArray(saved.zombies) ? saved.zombies : []).filter((id) =>
          Object.hasOwn(ZOMBIES, id),
        ),
      ),
    };
  } catch (error) {
    console.error('Unable to read the field index:', error);
    return emptyCodex();
  }
}
export class UI {
  constructor(settings, skins = new SkinInventory()) {
    this.settings = settings;
    this.skins = skins;
    this.root = document.getElementById('app');
    this.noticeTimer = 0;
    this.hitTimer = 0;
    this.damage = 0;
    this.roundTimer = 0;
    this.on = {};
    this.menuScreen = 'home';
    this.codex = readCodex();
    this.codex.weapons.add('vx9');
    this.build();
    this.bind();
    this.saveCodex();
    this.renderIndex();
    this.i18n = new Localization(this.root, settings.language);
  }
  build() {
    this.root.innerHTML = `
    <div id="loading" class="loading"><div class="loader-emblem">${emblem}</div><p class="eyebrow">BLACKSITE–13 / SECURE CONNECTION</p><h2>INITIALIZING<span> OUTBREAK</span></h2><div class="load-track"><i></i></div><p id="load-status">Building the containment zone…</p></div>
    <div class="grain"></div><div class="screen-shade" id="menu-shade"></div>
    <main id="menu" class="menu hidden">
      <header class="topbar"><a href="#" id="brand" aria-label="Main menu">${emblem}<span>DEADZONE<span class="brand-small">OUTBREAK</span></span></a><div class="top-right"><span class="system-status"><i></i> LOCAL SYSTEM ONLINE</span><button class="icon-button" id="settings-top" aria-label="Settings">⚙</button></div></header>
      <div id="home" class="home">
        <section class="hero"><div class="eyebrow warning-label"><span class="tiny-cross">✛</span> CONTAINMENT PROTOCOL / FAILED</div><h1>DEADZONE<span>OUTBREAK</span></h1><p class="hero-copy">The perimeter is gone. The experiment is loose.<br>Make every round count.</p>
          <div class="menu-actions"><button id="solo" class="deploy-button"><span class="button-index">01</span><span><strong>DEPLOY SOLO</strong><small>One operator. No backup.</small></span>${arrow}</button><button id="multiplayer" class="secondary-button"><span class="button-index">02</span><span><strong>CO-OP OPERATIONS</strong><small>Assemble a squad of up to four.</small></span>${arrow}</button><button id="open-index" class="secondary-button"><span class="button-index">03</span><span><strong>FIELD INDEX</strong><small id="index-summary">Known threats and recovered weapons.</small></span>${arrow}</button><button id="how" class="text-button">FIELD MANUAL <span>↗</span></button></div>
          <div class="hero-meta"><span><b>06</b> SECTORS</span><span><b>∞</b> ROUNDS</span><span><b>01–04</b> OPERATORS</span></div>
        </section>
        <aside class="operation-card"><div class="card-top"><span class="eyebrow">ACTIVE OPERATION</span><span class="live-badge">● LIVE</span></div><div class="map-diagram" aria-label="Blacksite 13 sector diagram"><div class="map-lines"></div><span class="sector-cell">04</span><span class="sector-cell">05</span><span class="sector-cell">06</span><span class="sector-cell active">01<span class="map-dot"></span></span><span class="sector-cell">02</span><span class="sector-cell">03</span><i class="map-crosshair"></i></div><div class="operation-title"><span class="eyebrow">EXCLUSION ZONE / 13</span><h2>BLACKSITE–13</h2><p>Abandoned military research facility</p></div><div class="operation-details"><span>THREAT LEVEL</span><b>CRITICAL <i></i><i></i><i></i><i></i><i></i></b></div><div class="operation-details"><span>OBJECTIVE</span><b>SURVIVE THE OUTBREAK</b></div><div class="card-bottom"><i></i> NO EXTRACTION AVAILABLE</div></aside>
      </div>
      <section id="lobby-panel" class="lobby-panel hidden"><button id="lobby-back" class="text-button">← RETURN TO OPERATIONS</button><div class="eyebrow">TACTICAL CO-OP / UP TO FOUR OPERATORS</div><h2>ASSEMBLE YOUR SQUAD<span>.</span></h2><p class="muted">Stay together. Watch your ammunition. Bring everyone back.</p><div id="lobby-setup" class="lobby-setup"><label>CALLSIGN<input id="player-name" maxlength="18" autocomplete="off" value="OPERATOR" placeholder="Your callsign"></label><button id="create-lobby" class="primary">CREATE PRIVATE LOBBY ${arrow}</button><div class="or"><span></span> OR JOIN A SQUAD <span></span></div><div class="join-row"><input id="room-input" maxlength="6" placeholder="ROOM CODE" aria-label="Room code" autocomplete="off"><button id="join-lobby" class="outline">JOIN ${arrow}</button></div></div><div id="lobby-room" class="hidden"><div class="room-code-label">PRIVATE ROOM CODE <strong id="room-code"></strong><button id="copy-code" class="text-button">COPY</button></div><div id="player-list" class="player-list"></div><div class="lobby-buttons"><button id="ready" class="primary">READY UP</button><button id="start-match" class="outline">DEPLOY SQUAD ${arrow}</button></div><p class="muted small">All operators must be ready. The host begins deployment.</p></div><p id="lobby-error" role="status" class="error"></p></section>
      <section id="index-panel" class="field-index hidden"><button id="index-back" class="text-button">← RETURN TO OPERATIONS</button><div class="index-heading"><div><div class="eyebrow">BLACKSITE–13 / OPERATOR DATABASE</div><h2>FIELD INDEX<span>.</span></h2></div><p id="index-counts" class="index-counts"></p></div><div class="index-content"><section class="index-section"><div class="index-section-heading"><h3>HOSTILE BIOLOGY</h3><span class="eyebrow">ENCOUNTERED THREATS</span></div><div id="zombie-index" class="index-grid"></div></section><section class="index-section"><div class="index-section-heading"><h3>WEAPON REGISTRY</h3><span class="eyebrow">RECOVERED WEAPONS</span></div><div id="weapon-index" class="index-grid"></div></section></div></section>
      <footer class="menu-footer"><span><i class="status-square"></i> EUROPEAN RESEARCH DIVISION <b>/</b> CLASSIFIED</span><span class="footer-right">ENDLESS SURVIVAL <b>•</b> BLACKSITE–13</span></footer>
    </main>
    <div id="hud" class="hud hidden"><div class="hud-top"><div class="sector-info"><span class="eyebrow">BLACKSITE–13</span><strong id="sector-name">SPAWN COURTYARD</strong><span id="connection">SOLO / LOCAL</span></div><div class="round-block"><span class="eyebrow" id="round-label">ROUND</span><strong id="round">01</strong><span id="remaining">PREPARING</span></div><div class="hud-currency"><strong id="points">500</strong><span>POINTS</span><small id="kills">0 ELIMINATIONS</small></div></div>
      <div id="crosshair" class="crosshair"><i></i><i></i><i></i><i></i><b></b></div><div id="hitmarker" class="hitmarker">╳</div><div id="hit-text" class="hit-text"></div><div id="damage-vignette" class="damage-vignette"></div><div id="direction-indicator" class="direction-indicator">⌃</div>
      <div id="round-announcement" class="round-announcement"><span class="eyebrow">CONTAINMENT BREACH</span><strong>ROUND 01</strong><p>Hold your ground.</p></div>
      <div id="interaction" class="interaction hidden"><kbd>E</kbd><div><strong id="interact-name"></strong><span id="interact-price"></span><div id="revive-track"><i></i></div></div></div>
      <div id="notice" class="notice" role="status"></div><div id="boss-bar" class="boss-bar hidden"><div><span>THE EXPERIMENT</span><span id="boss-phase"></span></div><i><b></b></i></div>
      <div class="hud-bottom"><div class="vitals"><div class="health-row"><span class="health-icon">✚</span><strong id="health">100</strong><small id="max-health">/ 100</small><span id="armor">⬡ 25</span></div><div class="health-track"><i id="health-fill"></i></div><div id="perks" class="perks"></div><div id="teammates" class="teammates"></div></div><div class="hud-hints"><span><kbd>R</kbd> RELOAD</span><span><kbd>G</kbd> GRENADE <b id="grenades">2</b></span><span><kbd>TAB</kbd> SQUAD</span><span><kbd>ESC</kbd> MENU</span></div><div class="ammo-block"><div id="weapon-slots" class="weapon-slots"></div><span class="eyebrow" id="weapon-type">TACTICAL PISTOL</span><strong id="weapon-name">VX-9</strong><div class="ammo-row"><b id="ammo">14</b><span>/</span><small id="reserve">112</small></div><span id="reload-status"></span></div></div>
      <div id="scoreboard" class="scoreboard hidden"><span class="eyebrow">OPERATION / BLACKSITE–13</span><h2>SQUAD STATUS</h2><table><thead><tr><th>OPERATOR</th><th>KILLS</th><th>ASSISTS</th><th>POINTS</th><th>STATUS</th></tr></thead><tbody id="score-rows"></tbody></table></div><div id="downed" class="downed hidden"><span class="eyebrow">OPERATOR DOWN</span><h2>HOLD ON.</h2><p id="downed-text"></p></div>
    </div>
    <div id="modal-backdrop" class="modal-backdrop hidden"><section id="settings-modal" class="modal hidden"><button class="modal-close" aria-label="Close settings">×</button><span class="eyebrow">OPERATOR PREFERENCES</span><h2>SETTINGS</h2><div class="settings-grid"><label>GRAPHICS QUALITY<select id="quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select></label><label>MOUSE SENSITIVITY <output id="sensitivity-out"></output><input id="sensitivity" type="range" min="0.5" max="6" step="0.1"></label><label>FIELD OF VIEW <output id="fov-out"></output><input id="fov" type="range" min="65" max="110" step="1"></label><label>VIEWMODEL FOV <output id="viewmodelFov-out"></output><input id="viewmodelFov" type="range" min="50" max="90" step="1"></label><label>MASTER VOLUME <output id="volume-out"></output><input id="volume" type="range" min="0" max="1" step="0.05"></label><label class="toggle">HEAD BOB<input id="headBob" type="checkbox"></label><label class="toggle">DYNAMIC RESOLUTION<input id="dynamicResolution" type="checkbox"></label></div><button id="settings-done" class="primary">APPLY & RETURN ${arrow}</button></section>
      <section id="how-modal" class="modal hidden"><button class="modal-close" aria-label="Close field manual">×</button><span class="eyebrow">READ BEFORE DEPLOYMENT</span><h2>FIELD MANUAL</h2><p class="muted">Survive each wave. Eliminate threats to earn points. Explore the facility and buy better equipment before the next breach.</p><div class="controls-grid"><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>LMB</kbd> Fire / knife attack</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>E</kbd> Buy / interact / hold to revive</span><span><kbd>SHIFT</kbd> Walk quietly</span><span><kbd>CTRL</kbd> Crouch / slide while running</span><span><kbd>F</kbd> Equip / stow knife</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>G</kbd> Grenade</span><span><kbd>1 2 3</kbd> Switch firearm</span><span><kbd>TAB</kbd> Scoreboard</span></div><div class="manual-note"><b>KEEP MOVING. AIM FOR THE HEAD.</b><p>Health regenerates after 6 seconds without damage. Start with 500 points. Buy the AK-47 for 1,800 or open the checkpoint for 750. Bosses arrive every fifth round.</p><p>In co-op, hold E beside a downed teammate for 3 seconds. Complete a round to bring eliminated operators back.</p></div><p class="muted small">Desktop keyboard & mouse required. Click DEPLOY to capture the pointer; Esc releases it.</p></section>
      <section id="pause-modal" class="modal narrow hidden"><span class="eyebrow" id="pause-label">OPERATION SUSPENDED</span><h2>TAKE A BREATH.</h2><button id="resume" class="primary">RESUME OPERATION ${arrow}</button><button id="pause-settings" class="outline">SETTINGS</button><button id="quit" class="text-button">ABORT TO MAIN MENU</button></section>
      <section id="over-modal" class="modal narrow hidden"><span class="eyebrow red">SIGNAL LOST / OPERATION FAILED</span><h2>OVERRUN.</h2><p class="muted">The facility claims another squad.</p><div class="end-stats"><div><strong id="end-round">1</strong><span>ROUND REACHED</span></div><div><strong id="end-kills">0</strong><span>ELIMINATIONS</span></div><div><strong id="end-time">00:00</strong><span>TIME SURVIVED</span></div></div><button id="restart" class="primary">DEPLOY AGAIN ${arrow}</button><button id="over-menu" class="text-button">RETURN TO MAIN MENU</button></section>
    </div><div id="fatal" class="fatal hidden" role="alert"></div><div class="desktop-note">A keyboard and mouse are required for deployment.</div>`;
    this.el = {};
    for (const node of this.root.querySelectorAll('[id]')) this.el[node.id] = node;
    const chapterLabel = this.el.hud.querySelector('.sector-info .eyebrow');
    chapterLabel.id = 'chapter-label';
    this.el['chapter-label'] = chapterLabel;
    const transition = document.createElement('div');
    transition.id = 'chapter-transition';
    transition.className = 'chapter-transition hidden';
    transition.innerHTML =
      '<span id="chapter-number" class="eyebrow"></span><h2 id="chapter-title"></h2><p id="chapter-subtitle"></p><span class="chapter-rule"></span><small>WEAPONS · POINTS · PERKS SECURED</small><small id="chapter-transfer"></small>';
    this.el.hud.append(transition);
    this.el['chapter-transition'] = transition;
    for (const node of transition.querySelectorAll('[id]')) this.el[node.id] = node;
    const detail = document.createElement('div');
    detail.id = 'index-detail';
    detail.className = 'index-detail hidden';
    detail.innerHTML =
      '<button id="detail-back" class="text-button">← ALL PROFILES</button><div class="detail-layout"><div class="model-stage"><canvas id="index-canvas" aria-label="Rotating 3D model"></canvas><span class="model-stage-label">3D PROFILE / AUTOMATIC ROTATION</span></div><article class="detail-copy"><span id="detail-category" class="eyebrow"></span><h3 id="detail-title"></h3><p id="detail-description" class="muted"></p><dl id="detail-stats"></dl><p id="detail-status" class="detail-status"></p></article></div>';
    this.el['index-panel'].append(detail);
    const soundButton = document.createElement('button');
    soundButton.id = 'detail-sound';
    soundButton.className = 'outline detail-sound';
    soundButton.textContent = '▶ PLAY SHOT SOUND';
    soundButton.type = 'button';
    detail.querySelector('.detail-copy').append(soundButton);
    const customize = document.createElement('button');
    customize.id = 'customize-skin';
    customize.className = 'outline';
    customize.textContent = 'WYBIERZ SKIN';
    detail.querySelector('.detail-copy').append(customize);
    const skinPanel = document.createElement('section');
    skinPanel.id = 'skin-panel';
    detail
      .querySelector('.detail-copy')
      .insertBefore(skinPanel, detail.querySelector('#detail-stats'));
    this.skinPanel = new SkinsUI(skinPanel, this.skins, {
      preview: (finish) => this.on.previewSkin?.(finish),
      equip: (key, finish) => this.on.skinEquipped?.(key, finish),
      rotate: (on) => this.on.rotatePreview?.(on),
      weapon: (key) => {
        const w = SKIN_WEAPONS.find((w) => w.key === key);
        if (w) this.openIndexEntry(w.kind, w.id);
      },
    });
    const armory = document.createElement('button');
    armory.id = 'open-skins';
    armory.className = 'secondary-button armory-button';
    armory.innerHTML = `<span class="button-index">✦</span><span><strong>SKINS / ARMORY</strong><small>Wykończenia za punkty fal</small></span>`;
    this.el.home.querySelector('.menu-actions').insertBefore(armory, this.el.how);
    this.el['open-skins'] = armory;
    const pauseSkins = document.createElement('button');
    pauseSkins.id = 'pause-skins';
    pauseSkins.className = 'outline';
    pauseSkins.textContent = 'SKINS / ARMORY';
    this.el['pause-modal'].insertBefore(pauseSkins, this.el['pause-settings']);
    this.el['pause-skins'] = pauseSkins;
    const skinModal = document.createElement('section');
    skinModal.id = 'skin-modal';
    skinModal.className = 'modal skin-modal hidden';
    skinModal.innerHTML =
      '<button id="skin-close" class="shop-close" aria-label="Zamknij kolekcję skinów">×</button><div id="skin-host"></div>';
    this.el['modal-backdrop'].append(skinModal);
    this.el['skin-modal'] = skinModal;
    for (const node of skinModal.querySelectorAll('[id]')) this.el[node.id] = node;
    const knifeSection = document.createElement('section');
    knifeSection.className = 'index-section';
    knifeSection.innerHTML =
      '<div class="index-section-heading"><h3>FIELD BLADES</h3><span class="eyebrow">OPERATOR EQUIPMENT</span></div><div id="knife-index" class="index-grid"></div>';
    this.el['index-panel'].querySelector('.index-content').append(knifeSection);
    const shop = document.createElement('section');
    shop.id = 'shop-modal';
    shop.className = 'modal shop-modal hidden';
    this.el['modal-backdrop'].append(shop);
    this.shop = new ShopUI(shop, (id) => this.on.buy?.(id));
    for (const parent of [detail, knifeSection, shop])
      for (const node of parent.querySelectorAll('[id]')) this.el[node.id] = node;
    this.el['shop-modal'] = shop;
    const craft = document.createElement('section');
    craft.id = 'craft-modal';
    craft.className = 'modal craft-modal hidden';
    this.el['modal-backdrop'].append(craft);
    this.el['craft-modal'] = craft;
    this.crafting = new CraftUI(craft, (recipe) => this.on.craft?.(recipe));
    craft.querySelector('#craft-close').addEventListener('click', () => this.on.resume?.());
    const training = document.createElement('section');
    training.id = 'training-modal';
    training.className = 'modal training-modal hidden';
    this.el['modal-backdrop'].append(training);
    this.el['training-modal'] = training;
    this.trainingPanel = new TrainingUI(training, (options) => this.on.trainingSetup?.(options));
    const map = document.createElement('section');
    map.id = 'map-modal';
    map.className = 'modal map-modal hidden';
    this.el['modal-backdrop'].append(map);
    this.el['map-modal'] = map;
    this.mapPanel = new TacticalMap(map, (x, z) => this.on.ping?.(x, z), this.settings);
    map.querySelector('#map-close').addEventListener('click', () => this.on.resume?.());
    training.querySelector('#training-close').addEventListener('click', () => this.on.resume?.());
    const trainingButton = document.createElement('button');
    trainingButton.id = 'open-training';
    trainingButton.className = 'secondary-button training-menu-button';
    trainingButton.innerHTML =
      '<span class="button-index">◎</span><span><strong>ARENA TRENINGOWA</strong><small>Precyzja · tracking · refleks / pełny arsenał</small></span>';
    this.el.home.querySelector('.menu-actions').insertBefore(trainingButton, this.el['open-index']);
    trainingButton.addEventListener('click', () => this.on.training?.());
    const forestStatus = document.createElement('div');
    forestStatus.id = 'forest-status';
    forestStatus.className = 'forest-status';
    this.el.hud.append(forestStatus);
    this.el['forest-status'] = forestStatus;
    const kit = document.createElement('div');
    kit.id = 'survival-kit';
    kit.className = 'survival-kit';
    this.el.hud.append(kit);
    this.el['survival-kit'] = kit;
    this.el['index-detail'] = detail;
    const scope = document.createElement('div');
    scope.id = 'scope-overlay';
    scope.className = 'scope-overlay hidden';
    scope.innerHTML =
      '<i class="scope-line horizontal"></i><i class="scope-line vertical"></i><b class="scope-dot"></b>';
    this.el.hud.append(scope);
    this.el['scope-overlay'] = scope;
    const inspectControl = document.createElement('span');
    inspectControl.innerHTML = '<kbd>V</kbd> Inspect weapon / knife';
    this.el['how-modal'].querySelector('.controls-grid').append(inspectControl);
    const knifeLabel = document.createElement('label'),
      knifeSelect = document.createElement('select');
    knifeLabel.textContent = 'KNIFE MODEL';
    knifeSelect.id = 'knifeModel';
    for (const [value, name] of Object.entries(KNIFE_MODELS)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      knifeSelect.append(option);
    }
    knifeLabel.append(knifeSelect);
    this.el['settings-modal'].querySelector('.settings-grid').append(knifeLabel);
    const langLabel = document.createElement('label');
    langLabel.innerHTML =
      'JĘZYK<select id="language"><option value="pl">Polski</option><option value="en">English</option></select>';
    this.el['settings-modal'].querySelector('.settings-grid').prepend(langLabel);
    this.el.language = langLabel.querySelector('select');
    this.el.knifeModel = knifeSelect;
    const knifeHint = document.createElement('span');
    knifeHint.innerHTML = '<kbd>F</kbd> KNIFE';
    this.el.hud.querySelector('.hud-hints').prepend(knifeHint);
    const slideHint = document.createElement('span');
    slideHint.innerHTML = '<kbd>CTRL</kbd> SLIDE';
    this.el.hud.querySelector('.hud-hints').prepend(slideHint);
    const shopHint = document.createElement('span');
    shopHint.innerHTML = '<kbd>B</kbd> SHOP';
    this.el.hud.querySelector('.hud-hints').prepend(shopHint);
    const shopControl = document.createElement('span');
    shopControl.innerHTML = '<kbd>B</kbd> Supply shop';
    this.el['how-modal'].querySelector('.controls-grid').append(shopControl);
    this.el['how-modal'].querySelector('.manual-note p').textContent =
      'Health regenerates after 6 seconds without damage. Use E at weapon stations to unlock their blueprints for free, then B to buy weapons, ammo, shield plates and supplies. Bosses arrive every fifth round.';
    this.forestTheme();
  }
  forestTheme() {
    this.el['load-status'].textContent = 'Wyznaczanie szlaków i budowa obozu…';
    this.el.home.querySelector('.hero-copy').innerHTML =
      'Las pochłonął ostatnie drogi.<br>Utrzymaj obóz. Odkryj, co zostało.';
    this.el.home.querySelector('.warning-label').innerHTML =
      '<span class="tiny-cross">✛</span> OSTATNI SYGNAŁ / OBÓZ 07';
    this.el.home.querySelector('.hero-meta').innerHTML =
      '<span><b>01</b> WSPÓLNY OBÓZ</span><span><b>∞</b> FALE</span><span><b>01–04</b> OCALAŁYCH</span>';
    const card = this.el.home.querySelector('.operation-card');
    card.querySelector('.map-diagram').outerHTML =
      '<div class="forest-map" aria-label="Mapa obozu i rozszerzających się rejonów lasu"><svg viewBox="0 0 280 210"><g fill="none" stroke="#849273" stroke-width=".6"><path d="M25 20 80 185 130 24 185 185 250 20M10 75 270 75M10 145 270 145" opacity=".25"/><circle cx="140" cy="105" r="78" stroke-dasharray="3 5"/><circle cx="140" cy="105" r="52"/><path d="M140 15v180M30 105h220" stroke-dasharray="3 3"/></g><path class="map-camp" d="m124 90 30-4 9 27-35 10Z"/><text x="104" y="144">OBÓZ 07</text><text x="103" y="24">GŁĘBOKI LAS</text><text x="12" y="200">NOWE SZLAKI / NOWE ZAPASY</text></svg></div>';
    card.querySelector('.operation-title .eyebrow').textContent = 'STREFA ZAKAŻENIA / DZIKI LAS';
    card.querySelector('.operation-title h2').textContent = 'THE LOST FOREST';
    card.querySelector('.operation-title p').textContent = 'Obóz ocalałych w porzuconym lesie';
    card.querySelector('.card-bottom').innerHTML = '<i></i> UTRZYMAJ OSTATNIE SCHRONIENIE';
    this.el.menu.querySelector('.menu-footer > span').innerHTML =
      '<i class="status-square"></i> OBÓZ OCALAŁYCH <b>/</b> DZIEŃ 38';
    this.el.menu.querySelector('.footer-right').textContent =
      'DEADZONE: OUTBREAK • THE LOST FOREST';
    this.el['how-modal'].querySelector('.muted').textContent =
      'Broń obozu i zbieraj zasoby. Las rośnie przy falach 4, 7, 11, 16 i kolejnych. Co 15 fal zaczynasz nowy rozdział wyprawy, zachowując obóz, ekwipunek i odkryte skrytki.';
    this.el['how-modal'].querySelector('.manual-note p').textContent =
      '15 broni podstawowych ma schematy od startu. Schematy 12 specjalnych znajdziesz wyłącznie w ukrytych skrzyniach w lesie; Barrett jest w głębokim lesie od fali 11. B otwiera magazyn. E przy stole lub K otwiera crafting. E przy barykadzie naprawia ją za 2 drewna. Arena treningowa w menu pozwala ćwiczyć wszystkimi broniami bez opłat. M otwiera mapę, a tablica przy radiostacji zleca wyprawy.';
    const recoveryNote = document.createElement('p');
    recoveryNote.textContent =
      'Leczenie: do 5 m od ogniska, po 5 sekundach bez obrażeń, 4 HP/s. H używa apteczki także w lesie. B / Zapasy: latarka i baterie oraz latarnia ochronna. O stawia latarnię na 180 sekund; zwykłe zombie boją się jej w promieniu 6 m. W ostatniej fali pokonaj obstawę BIG BOSSA, aby zdjąć jego tarczę. N: skiny za 25 punktów od ukończonej fali, wypłata po meczu.';
    this.el['how-modal'].querySelector('.manual-note').append(recoveryNote);
    for (const [key, label] of [
      ['L', 'Latarka'],
      ['O', 'Postaw latarnię ochronną'],
      ['H', 'Użyj apteczki'],
      ['J', 'Rzuć Mołotowem'],
      ['T', 'Ustaw pułapkę'],
      ['K', 'Warsztat / receptury'],
      ['N', `${SKIN_WEAPONS.length * SKIN_FINISHES_PER_WEAPON} wykończeń / punkty za fale`],
      ['M', 'Mapa taktyczna / znaczniki'],
      ['P', 'Trening / wybór broni'],
      ['U', 'Trening / nowa próba'],
    ]) {
      const node = document.createElement('span');
      node.innerHTML = `<kbd>${key}</kbd> ${label}`;
      this.el['how-modal'].querySelector('.controls-grid').append(node);
    }
    const replacements = {
      'BLACKSITE–13 / SECURE CONNECTION': 'THE LOST FOREST / PRZYGOTOWANIE WYPRAWY',
      'BLACKSITE–13 / OPERATOR DATABASE': 'THE LOST FOREST / DZIENNIK OCALAŁYCH',
      'EUROPEAN RESEARCH DIVISION': 'OBÓZ OCALAŁYCH',
      'LOCAL SYSTEM ONLINE': 'OGNISKO NADAL PŁONIE',
      'CONTAINMENT BREACH': 'HORDA NADCHODZI',
      'THE EXPERIMENT': 'THE HOLLOW',
      'The facility claims another squad.': 'Las pochłonął kolejną grupę.',
      POINTS: 'KREDYTY',
      'TRANSFERRING SQUAD': 'NOWY ROZDZIAŁ WYPRAWY',
    };
    const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (replacements[node.textContent.trim()])
        node.textContent = replacements[node.textContent.trim()];
      else if (node.textContent.includes('BLACKSITE'))
        node.textContent = node.textContent.replaceAll('BLACKSITE–13', 'THE LOST FOREST');
    }
  }
  bind() {
    const click = (id, fn) => this.el[id].addEventListener('click', fn);
    click('solo', () => this.on.solo?.());
    click('multiplayer', () => this.showLobby());
    click('open-index', () => this.showIndex());
    click('index-back', () => this.home());
    click('detail-back', () => this.closeIndexDetail());
    click('open-skins', () => this.on.armory?.());
    click('pause-skins', () => this.on.armory?.());
    click('skin-close', () => this.on.resume?.());
    click('customize-skin', () => this.enterFinishMode());
    click('detail-sound', () => {
      if (this.indexSelection?.kind === 'weapon') this.on.previewSound?.(this.indexSelection.id);
    });
    click('shop-close', () => this.on.resume?.());
    click('how', () => this.modal('how'));
    click('settings-top', () => this.modal('settings'));
    click('brand', (e) => {
      e.preventDefault();
      this.home();
    });
    click('lobby-back', () => {
      this.on.leaveLobby?.();
      this.home();
    });
    click('create-lobby', () => this.on.createLobby?.());
    click('join-lobby', () => this.on.joinLobby?.());
    click('ready', () => this.on.ready?.());
    click('start-match', () => this.on.startMatch?.());
    click('copy-code', async () => {
      try {
        await navigator.clipboard.writeText(this.el['room-code'].textContent);
        this.el['copy-code'].textContent = 'COPIED';
        setTimeout(() => (this.el['copy-code'].textContent = 'COPY'), 1500);
      } catch {
        this.el['lobby-error'].textContent = 'Select and copy the room code above.';
      }
    });
    click('resume', () => this.on.resume?.());
    click('quit', () => this.on.quit?.());
    click('over-menu', () => this.on.quit?.());
    click('restart', () => this.on.restart?.());
    click('pause-settings', () => this.modal('settings'));
    click('settings-done', () => this.closeModal());
    this.root
      .querySelectorAll('.modal-close')
      .forEach((b) => b.addEventListener('click', () => this.closeModal()));
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const input = this.el[key];
      input.type === 'checkbox'
        ? (input.checked = this.settings[key])
        : (input.value = this.settings[key]);
      input.addEventListener('input', () => {
        this.settings[key] =
          input.type === 'checkbox'
            ? input.checked
            : key === 'quality' || key === 'knifeModel' || key === 'language'
              ? input.value
              : Number(input.value);
        this.settingLabels();
        this.on.settings?.(this.settings);
        this.i18n?.setLocale(this.settings.language);
        try {
          localStorage.setItem('deadzone-settings', JSON.stringify(this.settings));
        } catch {}
      });
    }
    this.settingLabels();
    addEventListener('keydown', (e) => {
      if (this.inGame && this.activeModal === 'map' && ['KeyM', 'Escape'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.on.resume?.();
        return;
      }
      if (this.inGame && this.activeModal === 'training' && ['KeyP', 'Escape'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.on.resume?.();
        return;
      }
      if (this.inGame && this.activeModal === 'craft' && ['KeyK', 'Escape'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.on.resume?.();
        return;
      }
      if (this.inGame && this.activeModal === 'skin' && ['KeyN', 'Escape'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.on.resume?.();
        return;
      }
      if (this.inGame && this.activeModal === 'shop' && ['KeyB', 'Escape'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) this.on.resume?.();
        return;
      }
      if (
        !this.inGame &&
        this.menuScreen === 'index' &&
        this.indexSelection &&
        e.code === 'Escape'
      ) {
        this.closeIndexDetail();
        return;
      }
      if (e.code === 'Escape' && !this.inGame) this.closeModal();
    });
  }
  settingLabels() {
    for (const key of ['sensitivity', 'fov', 'viewmodelFov', 'volume'])
      this.el[`${key}-out`].textContent =
        key === 'volume' ? `${Math.round(this.settings[key] * 100)}%` : this.settings[key];
  }
  ready() {
    this.el.loading.classList.add('hidden');
    this.el.menu.classList.remove('hidden');
  }
  home() {
    this.closeIndexDetail();
    this.menuScreen = 'home';
    this.el.home.classList.remove('hidden');
    this.el['lobby-panel'].classList.add('hidden');
    this.el['index-panel'].classList.add('hidden');
    this.closeModal();
  }
  showLobby() {
    this.menuScreen = 'lobby';
    this.el.home.classList.add('hidden');
    this.el['index-panel'].classList.add('hidden');
    this.el['lobby-panel'].classList.remove('hidden');
    this.el['lobby-error'].textContent = '';
  }
  showIndex() {
    this.closeIndexDetail();
    this.menuScreen = 'index';
    this.el.home.classList.add('hidden');
    this.el['lobby-panel'].classList.add('hidden');
    this.el['index-panel'].classList.remove('hidden');
    this.renderIndex();
  }
  saveCodex() {
    try {
      localStorage.setItem(
        CODEX_KEY,
        JSON.stringify({
          weapons: [...this.codex.weapons],
          zombies: [...this.codex.zombies],
        }),
      );
    } catch (error) {
      console.error('Unable to save the field index:', error);
    }
  }
  discover(state, player) {
    let updated = false;
    for (const item of player.inventory) {
      if (Object.hasOwn(WEAPONS, item.id) && !this.codex.weapons.has(item.id)) {
        this.codex.weapons.add(item.id);
        updated = true;
      }
    }
    for (const zombie of state.zombies) {
      if (Object.hasOwn(ZOMBIES, zombie.type) && !this.codex.zombies.has(zombie.type)) {
        this.codex.zombies.add(zombie.type);
        updated = true;
      }
    }
    if (updated) {
      this.saveCodex();
      this.renderIndex();
    }
  }
  renderIndex() {
    if (!this.el) return;
    const entries = (container, definitions, discovered, info, kind) => {
      const fragment = document.createDocumentFragment();
      Object.entries(definitions).forEach(([id, definition], index) => {
        const known = discovered.has(id);
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.profile = `${kind}:${id}`;
        card.addEventListener('click', () => this.openIndexEntry(kind, id));
        card.className = `index-card${known ? '' : ' undiscovered'}`;
        const header = document.createElement('div');
        header.className = 'index-card-header';
        const number = document.createElement('span');
        number.className = 'index-number';
        number.textContent = String(index + 1).padStart(2, '0');
        const status = document.createElement('span');
        status.className = 'eyebrow';
        status.textContent = known
          ? kind === 'weapon'
            ? definition.type
            : kind === 'knife'
              ? 'FIELD BLADE'
              : 'THREAT PROFILE'
          : 'CLASSIFIED';
        header.append(number, status);
        const title = document.createElement('h4');
        title.textContent = known
          ? kind === 'weapon'
            ? definition.name
            : info[id].name
          : 'UNKNOWN';
        const description = document.createElement('p');
        description.textContent = known
          ? kind === 'weapon'
            ? definition.description || info[id]
            : info[id].note
          : kind === 'weapon'
            ? 'Acquire this weapon to recover its specifications.'
            : 'Encounter this threat to identify its capabilities.';
        const stats = document.createElement('div');
        stats.className = 'index-stats';
        const values = !known
          ? ['—', '—', '—']
          : kind === 'knife'
            ? ['115 DMG', '2.15M REACH', '0.55S CYCLE']
            : kind === 'weapon'
              ? [
                  `${definition.damage} DMG`,
                  `${definition.magazine} MAG`,
                  `${definition.range}M RANGE`,
                ]
              : [
                  `${definition.health} HP`,
                  `SPEED ${definition.speed.toFixed(1)}`,
                  `${definition.damage} DMG`,
                ];
        for (const value of values) {
          const stat = document.createElement('span');
          stat.textContent = value;
          stats.append(stat);
        }
        card.append(header, title, description, stats);
        const open = document.createElement('span');
        open.className = 'index-open';
        open.textContent = 'VIEW 3D PROFILE →';
        card.append(open);
        fragment.append(card);
      });
      container.replaceChildren(fragment);
    };
    entries(this.el['zombie-index'], ZOMBIES, this.codex.zombies, ZOMBIE_INFO, 'zombie');
    entries(this.el['weapon-index'], WEAPONS, this.codex.weapons, WEAPON_INFO, 'weapon');
    entries(
      this.el['knife-index'],
      KNIFE_INFO,
      new Set(Object.keys(KNIFE_INFO)),
      KNIFE_INFO,
      'knife',
    );
    this.el['index-counts'].textContent =
      `${this.codex.zombies.size} / ${Object.keys(ZOMBIES).length} THREATS  ·  ${this.codex.weapons.size} / ${Object.keys(WEAPONS).length} WEAPONS`;
    this.el['index-summary'].textContent =
      `${this.codex.zombies.size} / ${Object.keys(ZOMBIES).length} threats · ${this.codex.weapons.size} / ${Object.keys(WEAPONS).length} weapons`;
  }
  openIndexEntry(kind, id) {
    const definition =
      kind === 'weapon' ? WEAPONS[id] : kind === 'zombie' ? ZOMBIES[id] : KNIFE_INFO[id];
    if (!definition) return;
    this.indexSelection = { kind, id };
    this.el['index-panel'].querySelector('.index-content').classList.add('hidden');
    this.el['index-detail'].classList.remove('hidden');
    this.el['detail-title'].textContent =
      kind === 'weapon'
        ? definition.name
        : kind === 'zombie'
          ? ZOMBIE_INFO[id].name
          : KNIFE_INFO[id].name;
    this.el['detail-category'].textContent =
      kind === 'weapon'
        ? definition.type
        : kind === 'zombie'
          ? 'HOSTILE BIOLOGY'
          : 'FIELD EQUIPMENT';
    this.el['detail-description'].textContent =
      kind === 'weapon'
        ? definition.description || WEAPON_INFO[id]
        : kind === 'zombie'
          ? ZOMBIE_INFO[id].note
          : KNIFE_INFO[id].note;
    const values =
      kind === 'weapon'
        ? [
            ['BODY DAMAGE', definition.damage],
            [
              'HEAD DAMAGE',
              Math.round(definition.headDamage ?? definition.damage * definition.head),
            ],
            ['PRICE', `${definition.price || 250} POINTS`],
            ...(definition.caliber ? [['CALIBRE', definition.caliber]] : []),
            ['MAGAZINE', `${definition.magazine} ROUNDS`],
            ['RESERVE', definition.reserve],
            ['FIRE RATE', `${Math.round(60 / definition.rate)} RPM`],
            ['RELOAD', `${definition.reload}s`],
            ['EFFECTIVE RANGE', `${definition.range}m`],
          ]
        : kind === 'zombie'
          ? [
              ['BASE HEALTH', definition.health],
              ['MOVEMENT SPEED', `${definition.speed} m/s`],
              ['MELEE DAMAGE', definition.damage],
              ['HEIGHT', `${definition.height}m`],
              ['WEAK POINT', 'HEAD'],
            ]
          : [
              ['DAMAGE', 115],
              ['REACH', '2.15m'],
              ['ATTACK CYCLE', '0.55s'],
              ['CONTROLS', 'F EQUIP · V INSPECT'],
            ];
    const list = this.el['detail-stats'];
    this.el['detail-sound'].classList.toggle('hidden', kind !== 'weapon');
    this.el['customize-skin'].classList.toggle('hidden', kind === 'zombie' || this.skinMode);
    this.skinPanel.container.classList.toggle('hidden', kind === 'zombie' || !this.skinMode);
    if (kind !== 'zombie') this.skinPanel.setWeapon(skinKey(kind, id));
    list.replaceChildren();
    for (const [label, value] of values) {
      const dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      list.append(dt, dd);
    }
    const known =
      kind === 'knife' || (kind === 'weapon' ? this.codex.weapons : this.codex.zombies).has(id);
    this.el['detail-status'].textContent = known
      ? 'PROFILE RECORDED'
      : kind === 'weapon'
        ? 'PREVIEW / ACQUIRE THIS WEAPON TO RECORD IT'
        : 'PREVIEW / ENCOUNTER THIS THREAT TO RECORD IT';
    this.on.inspectEntry?.(
      kind,
      id,
      kind === 'zombie' ? 'factory' : this.skins.equipped(skinKey(kind, id)),
    );
  }
  enterFinishMode() {
    if (!this.indexSelection || this.indexSelection.kind === 'zombie') return;
    this.skinMode = true;
    this.el['index-detail'].classList.add('finish-mode');
    this.el['index-panel'].querySelector('.index-heading h2').innerHTML = 'ARMORY<span>.</span>';
    this.el['index-counts'].textContent =
      `${SKIN_WEAPONS.length * SKIN_FINISHES_PER_WEAPON} FINISHES / 25 PTS PER CLEARED WAVE`;
    this.el['customize-skin'].classList.add('hidden');
    this.skinPanel.container.classList.remove('hidden');
    this.on.resizePreview?.();
  }
  showArmory(key = 'vx9') {
    const w = SKIN_WEAPONS.find((w) => w.key === key) || SKIN_WEAPONS[0];
    if (this.inGame) {
      this.el['skin-host'].append(this.el['index-detail']);
      this.modal('skin');
      this.el['detail-back'].classList.add('hidden');
    } else this.showIndex();
    this.skinMode = true;
    this.el['index-detail'].classList.add('finish-mode');
    if (!this.inGame) {
      this.el['index-panel'].querySelector('.index-heading h2').innerHTML = 'ARMORY<span>.</span>';
      this.el['index-counts'].textContent =
        `${SKIN_WEAPONS.length * SKIN_FINISHES_PER_WEAPON} FINISHES / 25 PTS PER CLEARED WAVE`;
    }
    this.openIndexEntry(w.kind, w.id);
  }
  closeIndexDetail() {
    if (this.el?.['index-detail']?.parentElement === this.el?.['skin-host'])
      this.el['index-panel'].append(this.el['index-detail']);
    this.skinMode = false;
    this.el?.['index-detail']?.classList.remove('finish-mode');
    const heading = this.el?.['index-panel']?.querySelector('.index-heading h2');
    if (heading) heading.innerHTML = 'FIELD INDEX<span>.</span>';
    this.el?.['detail-back']?.classList.remove('hidden');
    this.indexSelection = null;
    this.el?.['index-detail']?.classList.add('hidden');
    this.el?.['index-panel']?.querySelector('.index-content').classList.remove('hidden');
    this.on.closeEntry?.();
    if (this.el?.['index-counts'])
      this.el['index-counts'].textContent =
        `${this.codex.zombies.size} / ${Object.keys(ZOMBIES).length} THREATS · ${this.codex.weapons.size} / ${Object.keys(WEAPONS).length} WEAPONS`;
  }
  showCraft(state, player, multiplayer) {
    this.modal('craft');
    this.crafting.update(player, multiplayer);
  }
  showTraining(state, p) {
    this.modal('training');
    this.trainingPanel.update(state, p);
  }
  showMap(state, p) {
    this.modal('map');
    this.mapPanel.update(state, p);
  }
  showShop(state, player, multiplayer) {
    this.modal('shop');
    this.shop.feedback(
      player.training
        ? 'POLIGON / wszystkie bronie za darmo. B lub Esc wraca do treningu.'
        : 'Podstawowe schematy są gotowe. Specjalnych szukaj w skrzyniach w lesie. B lub Esc wraca do gry.',
    );
    this.shop.update(player, multiplayer);
  }
  lobby(lobby, id) {
    this.el['lobby-setup'].classList.add('hidden');
    this.el['lobby-room'].classList.remove('hidden');
    this.el['room-code'].textContent = lobby.code;
    const list = this.el['player-list'];
    list.replaceChildren();
    for (let i = 0; i < 4; i++) {
      const player = lobby.players[i],
        row = document.createElement('div');
      row.className = 'lobby-player';
      const number = document.createElement('span');
      number.className = 'operator-number';
      number.textContent = `0${i + 1}`;
      const name = document.createElement('strong');
      name.textContent = player
        ? `${player.name}${player.id === lobby.host ? ' / HOST' : ''}`
        : 'AWAITING OPERATOR';
      const status = document.createElement('span');
      status.className = player?.ready ? 'ready-status' : 'muted';
      status.textContent = player ? (player.ready ? '● READY' : 'NOT READY') : '—';
      row.append(number, name, status);
      list.append(row);
    }
    const me = lobby.players.find((p) => p.id === id);
    this.el.ready.textContent = me?.ready ? 'CANCEL READY' : 'READY UP';
    this.el['start-match'].disabled = lobby.host !== id || !lobby.players.every((p) => p.ready);
  }
  resetLobby() {
    this.el['lobby-setup'].classList.remove('hidden');
    this.el['lobby-room'].classList.add('hidden');
  }
  modal(type) {
    this.el['modal-backdrop'].classList.remove('hidden');
    if (this.activeModal === 'skin' && type !== 'skin') this.closeIndexDetail();
    for (const key of [
      'settings',
      'how',
      'pause',
      'over',
      'shop',
      'skin',
      'craft',
      'training',
      'map',
    ])
      this.el[`${key}-modal`].classList.toggle('hidden', key !== type);
    this.activeModal = type;
  }
  closeModal() {
    if (this.inGame && this.activeModal !== 'over') {
      this.modal('pause');
      return;
    }
    this.el['modal-backdrop'].classList.add('hidden');
    this.activeModal = null;
  }
  gameplay() {
    this.closeIndexDetail();
    this.inGame = true;
    this.el.menu.classList.add('hidden');
    this.el['menu-shade'].classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.hideModal();
    this.damage = 0;
    this.hitTimer = 0;
    this.roundTimer = 0;
    this.noticeTimer = 0;
    this.el['hit-text'].textContent = '';
  }
  hideModal() {
    if (this.activeModal === 'skin') this.closeIndexDetail();
    this.el['modal-backdrop'].classList.add('hidden');
    this.activeModal = null;
  }
  pause(multiplayer) {
    this.el['pause-label'].textContent = multiplayer
      ? 'CO-OP / MATCH CONTINUES'
      : 'OPERATION SUSPENDED';
    this.modal('pause');
  }
  showMenu() {
    this.inGame = false;
    this.el.menu.classList.remove('hidden');
    this.el['menu-shade'].classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.home();
  }
  notice(message, duration = 2.5) {
    this.el.notice.textContent = message;
    this.noticeTimer = duration;
    if (this.activeModal === 'shop') this.shop.feedback(message);
    if (this.activeModal === 'craft') this.crafting.feedback(message);
  }
  announce(title, subtitle = 'Hold your ground.') {
    this.el['round-announcement'].querySelector('strong').textContent = title;
    this.el['round-announcement'].querySelector('p').textContent = subtitle;
    this.roundTimer = 3;
  }
  event(e, id) {
    if (e.type === 'contractReward')
      this.announce('WYPRAWA UKOŃCZONA', '+450 kredytów i materiały dla każdego ocalałego.');
    if (e.type === 'unlock' && e.player === id)
      this.notice(`${e.name} BLUEPRINT UNLOCKED — PRESS B TO BUY`, 4);
    if (e.type === 'hit' && e.player === id) {
      this.hitTimer = 0.15;
      this.el.hitmarker.classList.toggle('headshot', e.head);
      this.el['hit-text'].textContent = e.killed
        ? e.head
          ? 'HEADSHOT  +150'
          : 'ELIMINATION  +100'
        : e.head
          ? 'HEADSHOT'
          : '';
    }
    if (e.type === 'trainingStart') this.announce('TRENING / 60 SEKUND', TRAINING_DRILLS[e.drill]);
    if (e.type === 'trainingComplete')
      this.announce(
        'WYNIK TRENINGU',
        `${e.kills} eliminacji · ${e.headshots} trafień w głowę · celność ${Math.round((e.hits / Math.max(1, e.shots)) * 100)}% · U — ponów · P — wybór`,
      );
    if (e.type === 'damage' && e.player === id) this.damage = Math.min(0.8, this.damage + 0.35);
    if (e.type === 'round')
      this.announce(
        e.finalBoss
          ? 'BIG BOSS / WŁADCA LASU'
          : e.boss
            ? 'THE HOLLOW'
            : `WAVE ${String(e.wave || e.round).padStart(2, '0')}`,
        e.finalBoss
          ? 'Pokonaj przywołaną obstawę, aby zranić bossa. Trzy etapy walki.'
          : e.boss
            ? 'Unstable organism detected. Keep your distance.'
            : 'Horda wychodzi z lasu. Obroń obóz i oczyść szlaki.',
      );
    if (e.type === 'clear')
      this.announce(
        'SECTOR SECURED',
        `Uzupełnij zapasy. Następna fala za ${e.duration || 25} sekund.`,
      );
    if (e.type === 'forestExpanded')
      this.announce(
        'NOWY SZLAK W LESIE',
        `Las jest dostępny do ${e.edge} m od środka obozu. Szukaj opuszczonych schronień i zapasów.`,
      );
    if (e.type === 'chapterReady')
      this.announce(
        forestChapterDefinition(e.chapter).name,
        'Nowy rozdział wyprawy. Uzupełnij zapasy — obóz nadal stoi.',
      );
    if (e.type === 'ability' && e.ability === 'scream')
      this.notice('SCREAMER CHARGING — INTERRUPT IT', 1.2);
    if (e.type === 'notice' && e.player === id) this.notice(e.message);
    if (e.type === 'purchase' && e.player === id) this.notice(`${e.name} / ACQUIRED`);
    if (e.type === 'log' && e.player === id) this.notice(`${e.title} — ${e.text}`, 9);
    if (e.type === 'bosswindup') this.notice('SHOCKWAVE INCOMING — MOVE AWAY', 1.4);
    if (e.type === 'bossSummon')
      this.announce(
        'BOSS PRZYWOŁUJE OBSTAWĘ',
        `Etap ${e.stage}/3 — najpierw pokonaj przywołane zombie.`,
      );
    if (e.type === 'bossExposed')
      this.announce('BOSS ODSŁONIĘTY', 'Obstawa pokonana — teraz atakuj bossa!');
    if (e.type === 'revived') this.notice('OPERATOR REVIVED');
  }
  update(
    state,
    p,
    interaction,
    dt,
    {
      multiplayer = false,
      scoreboard = false,
      ads = false,
      knifeEquipped = false,
      sliding = false,
      cameraFov = 84,
    } = {},
  ) {
    this.discover(state, p);
    if (this.activeModal === 'shop') this.shop.update(p, multiplayer);
    if (this.activeModal === 'craft') this.crafting.update(p, multiplayer);
    if (this.activeModal === 'map') this.mapPanel.update(state, p);
    const text = (id, value) => {
      const el = this.el[id],
        str = this.i18n?.t(value) || String(value);
      if (el.textContent !== str) el.textContent = str;
    };
    const inv = p.inventory[p.slot],
      w = WEAPONS[inv.id];
    const chapter = state.chapter || 1,
      chapterInfo = state.forest ? forestChapterDefinition(chapter) : chapterDefinition(chapter);
    text('chapter-label', `CHAPTER ${String(chapter).padStart(2, '0')} / ${chapterInfo.name}`);
    text(
      'sector-name',
      state.forest
        ? inCamp(p.x, p.z)
          ? 'OBÓZ OCALAŁYCH / 07'
          : `LEŚNY SZLAK / ${Math.round(p.x)} : ${Math.round(p.z)}`
        : chapterSectors(chapter).find((s) => s.id === sectorAt(p).id).name,
    );
    if (state.training) {
      const t = state.training;
      text('chapter-label', 'POLIGON OCALAŁYCH / TRENING');
      text('sector-name', TRAINING_DRILLS[t.drill]);
      text(
        'forest-status',
        `CELNOŚĆ ${Math.round(t.accuracy * 100)}% · TRAFIENIA ${t.hits}/${t.shots}\nHEADSHOTY ${t.headshots} · ELIMINACJE ${t.kills}`,
      );
      text(
        'survival-kit',
        '[P] BROŃ I ĆWICZENIE · [U] NOWA PRÓBA\n[B] WYPRÓBUJ BROŃ · [N] TWOJE SKINY',
      );
      this.el['forest-status'].style.whiteSpace = this.el['survival-kit'].style.whiteSpace =
        'pre-line';
    } else if (state.forest) {
      const weather = forestWeather(state.forest.seed, state.time),
        edge = forestBounds(state.forest.ring).maxX;
      const defense = state.forest.defenses.reduce((n, d) => n + d.hp, 0),
        max = state.forest.defenses.reduce((n, d) => n + d.maxHp, 0);
      text(
        'forest-status',
        `${weather.daylight < 0.3 ? 'NOC' : 'DZIEŃ'} / ${weather.rain > 0.3 ? 'DESZCZ' : 'MGŁA'} · OBSZAR ${Math.round(edge * 2)} × ${Math.round(edge * 2)} m\nOBÓZ: ${Math.round(Math.hypot(p.x, p.z))} m · OBRONA ${Math.ceil(defense)}/${max} HP${edge - Math.max(Math.abs(p.x), Math.abs(p.z)) < 5 ? ' · KONIEC SZLAKU — PRZETRWAJ KOLEJNE FALE' : ''}`,
      );
      this.el['forest-status'].style.whiteSpace = 'pre-line';
      text(
        'survival-kit',
        `[L] LATARKA ${p.flashlightUnlocked ? `${p.flashlight ? 'ON' : 'OFF'} ${Math.ceil((p.flashlightCharge || 0) / 1.2)}% · BATERIE ${p.spareBatteries || 0}` : 'DO KUPIENIA: B / ZAPASY'} · [H] APTECZKI ${p.equipment?.medkit || 0}\n[J] MOŁOTOW ${p.equipment?.molotov || 0} · [T] PUŁAPKI ${p.equipment?.trap || 0} · [O] LATARNIE ${p.equipment?.lantern || 0}\nDREWNO ${p.resources?.wood || 0} · ZŁOM ${p.resources?.scrap || 0} · CZĘŚCI ${p.resources?.parts || 0} · MED ${p.resources?.medicine || 0} · [K] WARSZTAT${p.nearCampfire && p.hp < p.maxHp ? `\nOGNISKO: ${p.regenerating ? '+4 HP/s' : `LECZENIE ZA ${Math.max(0, Math.ceil(5 - (state.time - p.lastDamage)))}s`}` : ''}`,
      );
      this.el['survival-kit'].style.whiteSpace = 'pre-line';
      const contract = state.contract,
        mark = state.pings?.at(-1);
      if (contract)
        this.el['forest-status'].textContent +=
          `\n${contract.name}: ${contract.ready ? 'WRÓĆ DO TABLICY' : `${contract.progress}/${contract.goal}`}${contract.x !== undefined ? ` · ${Math.round(Math.hypot(contract.x - p.x, contract.z - p.z))} m` : ''}`;
      if (mark)
        this.el['forest-status'].textContent +=
          `\nZNACZNIK DRUŻYNY: ${Math.round(Math.hypot(mark.x - p.x, mark.z - p.z))} m · M / MAPA`;
    }
    text('connection', multiplayer ? 'CO-OP / CONNECTED' : 'SOLO / LOCAL');
    text('round', String(state.wave || Math.max(1, state.round)).padStart(2, '0'));
    text(
      'round-label',
      state.phase === 'chapter'
        ? 'TRANSFER'
        : `${state.phase === 'prepare' ? 'PREPARE' : 'WAVE'} / ${WAVES_PER_CHAPTER}`,
    );
    this.el['chapter-transition'].classList.toggle('hidden', state.phase !== 'chapter');
    if (state.phase === 'chapter') {
      text('chapter-number', `CHAPTER ${String(chapter).padStart(2, '0')}`);
      text('chapter-title', chapterInfo.name);
      text('chapter-subtitle', chapterInfo.subtitle);
      text('chapter-transfer', `TRANSFER IN ${Math.max(0, Math.ceil(state.countdown))}s`);
      this.el['chapter-transition'].style.opacity = Math.min(1, Math.max(0, state.countdown / 1.2));
    }
    text(
      'remaining',
      state.phase === 'chapter'
        ? 'NOWY ROZDZIAŁ WYPRAWY'
        : state.phase === 'prepare'
          ? `BREACH IN ${Math.max(0, Math.ceil(state.countdown))}s`
          : `${state.remaining} HOSTILES`,
    );
    text('points', p.points.toLocaleString());
    this.el.hud.querySelector('.hud-currency').style.visibility = state.training ? 'hidden' : '';
    if (state.training) {
      text('round-label', state.training.finished ? 'WYNIK' : 'POZOSTAŁO');
      text('round', String(Math.ceil(state.training.remaining)).padStart(2, '0'));
      text('remaining', state.training.finished ? 'U / NOWA PRÓBA' : 'TRENING / 60 SEKUND');
    }
    text('kills', `${p.kills} ELIMINATIONS`);
    text('health', Math.ceil(p.hp));
    text('max-health', `/ ${p.maxHp}`);
    text('armor', `⬡ ${Math.ceil(p.armor)}`);
    this.el['health-fill'].style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.el.vitals?.classList.toggle('critical', p.hp < 30);
    text('grenades', p.grenades);
    const knifeName = KNIFE_MODELS[this.settings.knifeModel] || KNIFE_MODELS.karambit;
    text(
      'weapon-name',
      knifeEquipped ? knifeName : `${w.name}${inv.upgraded ? ' / ENHANCED' : ''}`,
    );
    text(
      'weapon-type',
      sliding ? 'MOVEMENT / SLIDING' : knifeEquipped ? 'MELEE / FIELD KNIFE' : w.type,
    );
    this.el.ammo.parentElement.style.display = knifeEquipped ? 'none' : '';
    this.el['reload-status'].style.display = knifeEquipped ? 'none' : '';
    text('ammo', String(inv.ammo).padStart(2, '0'));
    text('reserve', inv.reserve);
    text(
      'reload-status',
      p.reloadEnd > state.time ? 'RELOADING…' : inv.ammo === 0 ? 'PRESS R TO RELOAD' : '',
    );
    this.el.ammo.classList.toggle('low', inv.ammo < 5);
    const slots =
      p.inventory
        .map(
          (item, index) =>
            `<span class="${!knifeEquipped && index === p.slot ? 'selected' : ''}"><b>${index + 1}</b> ${WEAPONS[item.id].name}</span>`,
        )
        .join('') + (knifeEquipped ? `<span class="selected"><b>F</b> ${knifeName}</span>` : '');
    if (this.el['weapon-slots'].innerHTML !== slots) this.el['weapon-slots'].innerHTML = slots;
    this.el['weapon-type'].classList.toggle('sliding-label', sliding);
    text('perks', p.perks.map((key) => PERKS[key].name).join(' / '));
    this.el.crosshair.classList.toggle('aiming', ads);
    const cone = spreadFor(p, { ads }, state.time);
    const conePixels =
      (Math.tan(cone.aim + cone.pellets) * innerHeight) /
      (2 * Math.tan((cameraFov * Math.PI) / 360));
    this.el.crosshair.style.setProperty(
      '--spread',
      `${knifeEquipped ? 5 : Math.max(4, Math.min(100, conePixels))}px`,
    );
    this.el['scope-overlay'].classList.toggle(
      'hidden',
      !(
        ads &&
        !knifeEquipped &&
        WEAPONS[inv.id].zoom &&
        p.aimAlpha > 0.9 &&
        p.reloadEnd <= state.time &&
        !p.downed &&
        !p.eliminated
      ),
    );
    this.el.interaction.classList.toggle('hidden', !interaction || p.downed || p.eliminated);
    if (interaction) {
      text('interact-name', interaction.name);
      text(
        'interact-price',
        interaction.type === 'revive'
          ? 'HOLD TO REVIVE'
          : interaction.type === 'blueprint'
            ? 'RECOVER BLUEPRINT / FREE'
            : interaction.type === 'weapon'
              ? p.unlockedWeapons?.includes(interaction.weapon)
                ? 'BLUEPRINT READY / PRESS B'
                : 'UNLOCK BLUEPRINT / FREE'
              : interaction.price
                ? `${interaction.price.toLocaleString()} KREDYTÓW`
                : interaction.type === 'defense'
                  ? 'E / NAPRAW LUB WZMOCNIJ · 2 DREWNA'
                  : interaction.type === 'workbench'
                    ? 'E / OTWÓRZ WARSZTAT'
                    : interaction.type === 'cache'
                      ? 'E / ZBIERZ ZAPASY'
                      : interaction.type === 'route'
                        ? 'E / 3 DREWNA · 2 ZŁOMU'
                        : interaction.type === 'contract'
                          ? 'E / PRZYJMIJ WYPRAWĘ LUB ODBIERZ NAGRODĘ'
                          : interaction.type === 'campUpgrade'
                            ? Object.entries(
                                campUpgradeCost(state.campLevels?.[interaction.id] || 0),
                              )
                                .map(([k, n]) => `${n} ${k}`)
                                .join(' · ')
                            : 'HOLD TO INTERACT',
      );
      this.el['revive-track'].style.display = interaction.type === 'revive' ? 'block' : 'none';
      this.el['revive-track'].firstElementChild.style.width =
        `${(interaction.progress || 0) * 100}%`;
    }
    this.hitTimer -= dt;
    this.noticeTimer -= dt;
    this.roundTimer -= dt;
    this.damage = Math.max(0, this.damage - dt * 0.35);
    this.el.hitmarker.style.opacity = this.hitTimer > 0 ? 1 : 0;
    this.el['hit-text'].style.opacity = Math.max(0, this.hitTimer + 1);
    this.el.notice.style.opacity = this.noticeTimer > 0 ? 1 : 0;
    this.el['round-announcement'].style.opacity = Math.min(1, Math.max(0, this.roundTimer));
    this.el['damage-vignette'].style.opacity = this.damage + (p.hp < 30 ? 0.2 : 0);
    const boss =
      state.zombies.find((z) => z.finalBoss) || state.zombies.find((z) => z.type === 'boss');
    this.el['boss-bar'].classList.toggle('hidden', !boss);
    if (boss) {
      this.el['boss-bar'].querySelector('b').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      this.el['boss-bar'].querySelector('div > span').textContent = boss.finalBoss
        ? 'BIG BOSS / WŁADCA LASU'
        : 'THE HOLLOW';
      text(
        'boss-phase',
        boss.finalBoss
          ? boss.shielded
            ? `TARCZA · OBSTAWA ${boss.guardsAlive || 0} · ETAP ${Math.max(1, boss.bossStage)}/3`
            : `ODSŁONIĘTY · ETAP ${boss.bossStage}/3`
          : `PHASE ${boss.phase}`,
      );
    }
    this.el.scoreboard.classList.toggle('hidden', !scoreboard);
    if (scoreboard) {
      const rows = this.el['score-rows'];
      rows.replaceChildren();
      for (const player of state.players) {
        const tr = document.createElement('tr');
        for (const val of [
          player.name,
          player.kills,
          player.assists,
          player.points,
          player.eliminated ? 'LOST' : player.downed ? 'DOWN' : 'ACTIVE',
        ]) {
          const td = document.createElement('td');
          td.textContent = val;
          tr.append(td);
        }
        rows.append(tr);
      }
    }
    text(
      'teammates',
      state.players
        .filter((o) => o.id !== p.id)
        .map((o) => `${o.downed ? '✚' : o.eliminated ? '×' : '●'} ${o.name}  ${Math.ceil(o.hp)} HP`)
        .join('   /   '),
    );
    this.el.downed.classList.toggle('hidden', !(p.downed || p.eliminated));
    text(
      'downed-text',
      p.eliminated
        ? 'Spectating surviving operators. Reinsertion next round.'
        : `Hold out for your squad. ${Math.ceil(p.bleed)}s / REVIVE ${Math.round((p.revive / 3) * 100)}%`,
    );
  }
  gameover(state, p, multiplayer, isHost, skinReward = 0) {
    this.modal('over');
    this.el['end-round'].textContent = state.round;
    this.el['end-kills'].textContent = p.kills;
    let reward = this.el['over-modal'].querySelector('#end-skin-reward');
    if (!reward) {
      reward = document.createElement('p');
      reward.id = 'end-skin-reward';
      reward.className = 'skin-reward';
      this.el['over-modal'].querySelector('.end-stats').after(reward);
    }
    reward.textContent = `${state.clearedWaves || 0} UKOŃCZONE FALE · +${skinReward} PTS NA SKINY · PORTFEL ${this.skins.balance} PTS`;
    this.el['end-time'].textContent =
      `${String(Math.floor(state.time / 60)).padStart(2, '0')}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`;
    this.el.restart.disabled = multiplayer && !isHost;
    this.el.restart.textContent = multiplayer
      ? isHost
        ? 'REDEPLOY SQUAD'
        : 'WAITING FOR HOST'
      : 'DEPLOY AGAIN';
  }
  fatal(message) {
    this.el.loading.classList.add('hidden');
    this.el.fatal.classList.remove('hidden');
    this.el.fatal.textContent = message;
  }
}
