import { WEAPONS, PERKS } from '../../shared/config.js';
import { sectorAt } from '../../shared/map.js';

export const DEFAULT_SETTINGS = {
  quality: 'high',
  sensitivity: 2.2,
  fov: 84,
  viewmodelFov: 65,
  volume: 0.55,
  headBob: true,
  dynamicResolution: false,
};
export function readSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(localStorage.getItem('deadzone-settings') || '{}'),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const emblem =
  '<svg viewBox="0 0 40 40" fill="none"><path d="M20 3 36 12v17L20 38 4 29V12Z" stroke="currentColor" stroke-width="1.4"/><path d="m20 10 10 6v10l-10 6-10-6V16l10-6Zm0 7-4 3v5l4 2 4-2v-5l-4-3Z" fill="currentColor"/></svg>';
export class UI {
  constructor(settings) {
    this.settings = settings;
    this.root = document.getElementById('app');
    this.noticeTimer = 0;
    this.hitTimer = 0;
    this.damage = 0;
    this.roundTimer = 0;
    this.on = {};
    this.menuScreen = 'home';
    this.build();
    this.bind();
  }
  build() {
    this.root.innerHTML = `
    <div id="loading" class="loading"><div class="loader-emblem">${emblem}</div><p class="eyebrow">BLACKSITE–13 / SECURE CONNECTION</p><h2>INITIALIZING<span> OUTBREAK</span></h2><div class="load-track"><i></i></div><p id="load-status">Building the containment zone…</p></div>
    <div class="grain"></div><div class="screen-shade" id="menu-shade"></div>
    <main id="menu" class="menu hidden">
      <header class="topbar"><a href="#" id="brand" aria-label="Main menu">${emblem}<span>DEADZONE<span class="brand-small">OUTBREAK</span></span></a><div class="top-right"><span class="system-status"><i></i> LOCAL SYSTEM ONLINE</span><button class="icon-button" id="settings-top" aria-label="Settings">⚙</button></div></header>
      <div id="home" class="home">
        <section class="hero"><div class="eyebrow warning-label"><span class="tiny-cross">✛</span> CONTAINMENT PROTOCOL / FAILED</div><h1>DEADZONE<span>OUTBREAK</span></h1><p class="hero-copy">The perimeter is gone. The experiment is loose.<br>Make every round count.</p>
          <div class="menu-actions"><button id="solo" class="deploy-button"><span class="button-index">01</span><span><strong>DEPLOY SOLO</strong><small>One operator. No backup.</small></span>${arrow}</button><button id="multiplayer" class="secondary-button"><span class="button-index">02</span><span><strong>CO-OP OPERATIONS</strong><small>Assemble a squad of up to four.</small></span>${arrow}</button><button id="how" class="text-button">FIELD MANUAL <span>↗</span></button></div>
          <div class="hero-meta"><span><b>06</b> SECTORS</span><span><b>∞</b> ROUNDS</span><span><b>01–04</b> OPERATORS</span></div>
        </section>
        <aside class="operation-card"><div class="card-top"><span class="eyebrow">ACTIVE OPERATION</span><span class="live-badge">● LIVE</span></div><div class="map-diagram" aria-label="Blacksite 13 sector diagram"><div class="map-lines"></div><span class="sector-cell">04</span><span class="sector-cell">05</span><span class="sector-cell">06</span><span class="sector-cell active">01<span class="map-dot"></span></span><span class="sector-cell">02</span><span class="sector-cell">03</span><i class="map-crosshair"></i></div><div class="operation-title"><span class="eyebrow">EXCLUSION ZONE / 13</span><h2>BLACKSITE–13</h2><p>Abandoned military research facility</p></div><div class="operation-details"><span>THREAT LEVEL</span><b>CRITICAL <i></i><i></i><i></i><i></i><i></i></b></div><div class="operation-details"><span>OBJECTIVE</span><b>SURVIVE THE OUTBREAK</b></div><div class="card-bottom"><i></i> NO EXTRACTION AVAILABLE</div></aside>
      </div>
      <section id="lobby-panel" class="lobby-panel hidden"><button id="lobby-back" class="text-button">← RETURN TO OPERATIONS</button><div class="eyebrow">TACTICAL CO-OP / UP TO FOUR OPERATORS</div><h2>ASSEMBLE YOUR SQUAD<span>.</span></h2><p class="muted">Stay together. Watch your ammunition. Bring everyone back.</p><div id="lobby-setup" class="lobby-setup"><label>CALLSIGN<input id="player-name" maxlength="18" autocomplete="off" value="OPERATOR" placeholder="Your callsign"></label><button id="create-lobby" class="primary">CREATE PRIVATE LOBBY ${arrow}</button><div class="or"><span></span> OR JOIN A SQUAD <span></span></div><div class="join-row"><input id="room-input" maxlength="6" placeholder="ROOM CODE" aria-label="Room code" autocomplete="off"><button id="join-lobby" class="outline">JOIN ${arrow}</button></div></div><div id="lobby-room" class="hidden"><div class="room-code-label">PRIVATE ROOM CODE <strong id="room-code"></strong><button id="copy-code" class="text-button">COPY</button></div><div id="player-list" class="player-list"></div><div class="lobby-buttons"><button id="ready" class="primary">READY UP</button><button id="start-match" class="outline">DEPLOY SQUAD ${arrow}</button></div><p class="muted small">All operators must be ready. The host begins deployment.</p></div><p id="lobby-error" role="status" class="error"></p></section>
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
      <section id="how-modal" class="modal hidden"><button class="modal-close" aria-label="Close field manual">×</button><span class="eyebrow">READ BEFORE DEPLOYMENT</span><h2>FIELD MANUAL</h2><p class="muted">Survive each wave. Eliminate threats to earn points. Explore the facility and buy better equipment before the next breach.</p><div class="controls-grid"><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>E</kbd> Buy / interact / hold to revive</span><span><kbd>SHIFT</kbd> Walk quietly</span><span><kbd>CTRL</kbd> Crouch</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>G</kbd> Grenade</span><span><kbd>1 2 3</kbd> Switch weapon</span><span><kbd>TAB</kbd> Scoreboard</span></div><div class="manual-note"><b>KEEP MOVING. AIM FOR THE HEAD.</b><p>Health regenerates after 6 seconds without damage. Start with 500 points. Buy the RAVEN-47 for 1,000 or open the checkpoint for 750. Bosses arrive every fifth round.</p><p>In co-op, hold E beside a downed teammate for 3 seconds. Complete a round to bring eliminated operators back.</p></div><p class="muted small">Desktop keyboard & mouse required. Click DEPLOY to capture the pointer; Esc releases it.</p></section>
      <section id="pause-modal" class="modal narrow hidden"><span class="eyebrow" id="pause-label">OPERATION SUSPENDED</span><h2>TAKE A BREATH.</h2><button id="resume" class="primary">RESUME OPERATION ${arrow}</button><button id="pause-settings" class="outline">SETTINGS</button><button id="quit" class="text-button">ABORT TO MAIN MENU</button></section>
      <section id="over-modal" class="modal narrow hidden"><span class="eyebrow red">SIGNAL LOST / OPERATION FAILED</span><h2>OVERRUN.</h2><p class="muted">The facility claims another squad.</p><div class="end-stats"><div><strong id="end-round">1</strong><span>ROUND REACHED</span></div><div><strong id="end-kills">0</strong><span>ELIMINATIONS</span></div><div><strong id="end-time">00:00</strong><span>TIME SURVIVED</span></div></div><button id="restart" class="primary">DEPLOY AGAIN ${arrow}</button><button id="over-menu" class="text-button">RETURN TO MAIN MENU</button></section>
    </div><div id="fatal" class="fatal hidden" role="alert"></div><div class="desktop-note">A keyboard and mouse are required for deployment.</div>`;
    this.el = {};
    for (const node of this.root.querySelectorAll('[id]')) this.el[node.id] = node;
  }
  bind() {
    const click = (id, fn) => this.el[id].addEventListener('click', fn);
    click('solo', () => this.on.solo?.());
    click('multiplayer', () => this.showLobby());
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
            : key === 'quality'
              ? input.value
              : Number(input.value);
        this.settingLabels();
        this.on.settings?.(this.settings);
        try {
          localStorage.setItem('deadzone-settings', JSON.stringify(this.settings));
        } catch {}
      });
    }
    this.settingLabels();
    addEventListener('keydown', (e) => {
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
    this.menuScreen = 'home';
    this.el.home.classList.remove('hidden');
    this.el['lobby-panel'].classList.add('hidden');
    this.closeModal();
  }
  showLobby() {
    this.menuScreen = 'lobby';
    this.el.home.classList.add('hidden');
    this.el['lobby-panel'].classList.remove('hidden');
    this.el['lobby-error'].textContent = '';
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
    for (const key of ['settings', 'how', 'pause', 'over'])
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
  }
  announce(title, subtitle = 'Hold your ground.') {
    this.el['round-announcement'].querySelector('strong').textContent = title;
    this.el['round-announcement'].querySelector('p').textContent = subtitle;
    this.roundTimer = 3;
  }
  event(e, id) {
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
    if (e.type === 'damage' && e.player === id) this.damage = Math.min(0.8, this.damage + 0.35);
    if (e.type === 'round')
      this.announce(
        e.boss ? 'THE EXPERIMENT' : `ROUND ${String(e.round).padStart(2, '0')}`,
        e.boss
          ? 'Unstable organism detected. Keep your distance.'
          : 'Containment breach. Eliminate all threats.',
      );
    if (e.type === 'clear') this.announce('SECTOR SECURED', 'Resupply. Next wave in 12 seconds.');
    if (e.type === 'notice' && e.player === id) this.notice(e.message);
    if (e.type === 'purchase' && e.player === id) this.notice(`${e.name} / ACQUIRED`);
    if (e.type === 'log' && e.player === id) this.notice(`${e.title} — ${e.text}`, 9);
    if (e.type === 'bosswindup') this.notice('SHOCKWAVE INCOMING — MOVE AWAY', 1.4);
    if (e.type === 'revived') this.notice('OPERATOR REVIVED');
  }
  update(state, p, interaction, dt, { multiplayer = false, scoreboard = false, ads = false } = {}) {
    const text = (id, value) => {
      const el = this.el[id],
        str = String(value);
      if (el.textContent !== str) el.textContent = str;
    };
    const inv = p.inventory[p.slot],
      w = WEAPONS[inv.id];
    text('sector-name', sectorAt(p).name);
    text('connection', multiplayer ? 'CO-OP / CONNECTED' : 'SOLO / LOCAL');
    text('round', String(Math.max(1, state.round)).padStart(2, '0'));
    text('round-label', state.phase === 'prepare' ? 'PREPARE' : 'ROUND');
    text(
      'remaining',
      state.phase === 'prepare'
        ? `BREACH IN ${Math.max(0, Math.ceil(state.countdown))}s`
        : `${state.remaining} HOSTILES`,
    );
    text('points', p.points.toLocaleString());
    text('kills', `${p.kills} ELIMINATIONS`);
    text('health', Math.ceil(p.hp));
    text('max-health', `/ ${p.maxHp}`);
    text('armor', `⬡ ${Math.ceil(p.armor)}`);
    this.el['health-fill'].style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.el.vitals?.classList.toggle('critical', p.hp < 30);
    text('grenades', p.grenades);
    text('weapon-name', `${w.name}${inv.upgraded ? ' / ENHANCED' : ''}`);
    text('weapon-type', w.type);
    text('ammo', String(inv.ammo).padStart(2, '0'));
    text('reserve', inv.reserve);
    text(
      'reload-status',
      p.reloadEnd > state.time ? 'RELOADING…' : inv.ammo === 0 ? 'PRESS R TO RELOAD' : '',
    );
    this.el.ammo.classList.toggle('low', inv.ammo < 5);
    const slots = p.inventory
      .map(
        (item, index) =>
          `<span class="${index === p.slot ? 'selected' : ''}"><b>${index + 1}</b> ${WEAPONS[item.id].name}</span>`,
      )
      .join('');
    if (this.el['weapon-slots'].innerHTML !== slots) this.el['weapon-slots'].innerHTML = slots;
    text('perks', p.perks.map((key) => PERKS[key].name).join(' / '));
    this.el.crosshair.classList.toggle('aiming', ads);
    this.el.crosshair.style.setProperty(
      '--spread',
      `${6 + Math.min(12, Math.hypot(p.vx, p.vz) * 2)}px`,
    );
    this.el.interaction.classList.toggle('hidden', !interaction || p.downed || p.eliminated);
    if (interaction) {
      text('interact-name', interaction.name);
      text(
        'interact-price',
        interaction.type === 'revive'
          ? 'HOLD TO REVIVE'
          : interaction.price
            ? `${interaction.price.toLocaleString()} POINTS`
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
    const boss = state.zombies.find((z) => z.type === 'boss');
    this.el['boss-bar'].classList.toggle('hidden', !boss);
    if (boss) {
      this.el['boss-bar'].querySelector('b').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      text('boss-phase', `PHASE ${boss.phase}`);
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
  gameover(state, p, multiplayer, isHost) {
    this.modal('over');
    this.el['end-round'].textContent = state.round;
    this.el['end-kills'].textContent = p.kills;
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
