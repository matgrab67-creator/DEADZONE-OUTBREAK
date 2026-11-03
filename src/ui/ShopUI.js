import { SHOP_ITEMS, shopStatus, weaponUnlockLocation } from '../../shared/Shop.js';
import { WEAPONS } from '../../shared/config.js';

export class ShopUI {
  constructor(container, onBuy) {
    this.container = container;
    this.onBuy = onBuy;
    this.cards = new Map();
    this.category = 'weapons';
    container.innerHTML = `<button id="shop-close" class="shop-close" aria-label="Close shop">×</button><div class="eyebrow">BLACKSITE–13 / FIELD REQUISITIONS</div><div class="shop-heading"><div><h2>SUPPLY TERMINAL</h2><p id="shop-mode" class="muted"></p></div><div class="shop-balance"><strong id="shop-points">0</strong><span>POINTS AVAILABLE</span></div></div><div class="shop-tabs" role="tablist"></div><div id="shop-items" class="shop-items"></div><p id="shop-feedback" class="shop-feedback" role="status">Find weapon stations to unlock blueprints. Press B or Esc to return.</p>`;
    this.grid = container.querySelector('#shop-items');
    const tabs = container.querySelector('.shop-tabs');
    for (const [id, label] of [
      ['weapons', 'WEAPONS'],
      ['supplies', 'SUPPLIES'],
      ['perks', 'PERKS'],
      ['upgrades', 'UPGRADES'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.category = id;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        this.category = id;
        this.filter();
      });
      tabs.append(button);
    }
    for (const item of SHOP_ITEMS) {
      const card = document.createElement('article');
      card.className = 'shop-card';
      card.dataset.item = item.id;
      const kind = document.createElement('span');
      kind.className = 'eyebrow';
      kind.textContent = item.type.toUpperCase();
      const title = document.createElement('h3');
      title.textContent = item.name;
      const description = document.createElement('p');
      description.textContent = item.description;
      const location = document.createElement('p');
      location.className = 'shop-requirement';
      const footer = document.createElement('div');
      footer.className = 'shop-card-footer';
      const price = document.createElement('strong');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline';
      button.dataset.buy = item.id;
      button.addEventListener('click', () => this.onBuy(item.id));
      footer.append(price, button);
      card.append(kind, title, description, location, footer);
      this.grid.append(card);
      this.cards.set(item.id, { item, card, price, button, location });
    }
    this.filter();
  }
  filter() {
    for (const { item, card } of this.cards.values())
      card.classList.toggle('hidden', item.category !== this.category);
    for (const tab of this.container.querySelectorAll('[data-category]')) {
      const selected = tab.dataset.category === this.category;
      tab.classList.toggle('selected', selected);
      tab.setAttribute('aria-selected', String(selected));
    }
  }
  update(player, multiplayer) {
    this.container.querySelector('#shop-points').textContent = player.points.toLocaleString();
    this.container.querySelector('#shop-mode').textContent = multiplayer
      ? 'CO-OP / MATCH CONTINUES — STAY ALERT'
      : 'SOLO / OPERATION PAUSED';
    for (const { item, card, price, button, location } of this.cards.values()) {
      const status = shopStatus(player, item);
      button.textContent = status.label;
      button.disabled = !status.allowed || status.label === 'EQUIPPED';
      price.textContent = status.free
        ? 'OWNED'
        : status.blueprintPrice !== undefined
          ? `${status.blueprintPrice.toLocaleString()} PTS / BLUEPRINT`
          : `${item.price.toLocaleString()} PTS`;
      card.classList.toggle('locked', status.label === 'BLUEPRINT LOCKED');
      location.textContent =
        status.label === 'BLUEPRINT LOCKED'
          ? `FREE AT: ${weaponUnlockLocation(item.weapon)} · BLUEPRINT COSTS 70%`
          : status.blueprint
            ? 'BLUEPRINT / 70% OF WEAPON PRICE'
            : item.type === 'weapon' && !status.free && player.inventory.length >= 3
              ? `REPLACES: ${WEAPONS[player.inventory[player.slot].id].name}`
              : item.type === 'ammo' || item.type === 'upgrade'
                ? `CURRENT: ${WEAPONS[player.inventory[player.slot].id].name}`
                : '';
    }
  }
  feedback(message) {
    this.container.querySelector('#shop-feedback').textContent = message;
  }
}
