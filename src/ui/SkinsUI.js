import {
  SKIN_WEAPONS,
  RARITIES,
  SKIN_POINTS_PER_WAVE,
  skinsForWeapon,
  skinDefinition,
} from '../../shared/Skins.js';
import { createSkinArtwork } from '../weapons/SkinArtwork.js';

const swatches = new Map();
function swatch(skin) {
  const key = `${skin.weapon}/${skin.id}`;
  if (!swatches.has(key)) {
    if (swatches.size >= 128) swatches.delete(swatches.keys().next().value);
    swatches.set(key, createSkinArtwork(skin, 256, 128).toDataURL('image/png'));
  }
  return swatches.get(key);
}
export class SkinsUI {
  constructor(container, inventory, actions) {
    this.container = container;
    this.inventory = inventory;
    this.actions = actions;
    this.filter = 'all';
    container.className = 'skin-panel hidden';
    container.innerHTML =
      '<div class="skin-access"><span>KOLEKCJA WYKOŃCZEŃ</span><strong id="skin-wallet">0 PTS</strong></div><label class="skin-weapon-label" for="skin-weapon">BROŃ / NÓŻ</label><select id="skin-weapon"></select><div id="skin-filters" class="skin-filters" role="tablist" aria-label="Rzadkość skina"></div><div id="skin-grid" class="skin-grid" aria-label="Dostępne wykończenia"></div><div class="skin-selection"><div><span id="skin-rarity" class="eyebrow"></span><strong id="skin-name"></strong><p id="skin-description"></p><p id="skin-requirement"></p></div><span id="skin-price" class="skin-price">0 PTS</span></div><div class="skin-buttons"><button id="skin-equip" class="primary">WYPOSAŻ</button><button id="skin-spin" class="outline" aria-pressed="true" title="Włącz lub zatrzymaj obracanie modelu">Ⅱ OBRÓT</button></div><p id="skin-message" class="skin-message" role="status"></p>';
    this.weaponSelect = container.querySelector('#skin-weapon');
    for (const w of SKIN_WEAPONS) {
      const option = document.createElement('option');
      option.value = w.key;
      option.textContent = w.name;
      this.weaponSelect.append(option);
    }
    this.weaponSelect.addEventListener('change', () =>
      this.actions.weapon(this.weaponSelect.value),
    );
    const tabs = container.querySelector('#skin-filters');
    for (const [id, name] of [
      ['all', 'WSZYSTKIE'],
      ['special', 'SPECJALNE'],
      ['legendary', 'LEGENDARNE / GOLD'],
      ['mythic', 'MITYCZNE'],
      ['epic', 'EPICKIE'],
      ['rare', 'RZADKIE'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.dataset.skinRarity = id;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        this.filter = id;
        this.applyFilter();
      });
      tabs.append(button);
    }
    container.querySelector('#skin-equip').addEventListener('click', () => {
      if (
        !this.inventory.has(this.key, this.selected) &&
        !this.inventory.buy(this.key, this.selected)
      )
        return;
      if (!this.inventory.equip(this.key, this.selected)) return;
      this.actions.equip(this.key, this.selected);
      this.updateSelection();
      container.querySelector('#skin-message').textContent =
        'Wyposażono. Wykończenie zapisane dla tej broni.';
    });
    this.spinning = true;
    container.querySelector('#skin-spin').addEventListener('click', () => {
      this.spinning = !this.spinning;
      this.actions.rotate(this.spinning);
      const button = container.querySelector('#skin-spin');
      button.setAttribute('aria-pressed', String(this.spinning));
      button.textContent = this.spinning ? 'Ⅱ OBRÓT' : '▶ OBRÓT';
    });
  }
  setWeapon(key) {
    this.key = key;
    this.weaponSelect.value = key;
    this.selected = this.inventory.equipped(key);
    this.cards = new Map();
    const grid = this.container.querySelector('#skin-grid');
    grid.replaceChildren();
    for (const skin of [skinDefinition(key, 'factory'), ...skinsForWeapon(key)]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skin-card';
      button.dataset.skin = skin.id;
      button.dataset.rarity = skin.rarity;
      button.style.setProperty('--skin-color', RARITIES[skin.rarity]?.color || '#9aa8a0');
      const art = document.createElement('span');
      art.className = 'skin-card-art';
      if (skin.id !== 'factory') art.style.backgroundImage = `url("${swatch(skin)}")`;
      else art.classList.add('factory-art');
      if (skin.id === 'mirror') art.classList.add('mirror-art');
      const rarity = document.createElement('small');
      rarity.textContent = RARITIES[skin.rarity]?.name || 'ORYGINAŁ';
      const title = document.createElement('strong');
      title.textContent = skin.name;
      const owned = document.createElement('span');
      owned.className = 'skin-card-owned';
      button.append(art, rarity, title, owned);
      button.addEventListener('click', () => {
        this.selected = skin.id;
        this.actions.preview(skin.id);
        this.updateSelection();
      });
      grid.append(button);
      this.cards.set(skin.id, { button, skin });
    }
    this.applyFilter();
    this.updateSelection();
    this.container.querySelector('#skin-message').textContent =
      `8 rzadkich · 4 epickie · 2 mityczne · 4 specjalne + GOLD\n${SKIN_POINTS_PER_WAVE} PTS za ukończoną falę. Rozliczenie po grze. GOLD: 1000 PTS za wariant.`;
  }
  applyFilter() {
    for (const { button, skin } of this.cards.values())
      button.classList.toggle('hidden', this.filter !== 'all' && skin.rarity !== this.filter);
    for (const button of this.container.querySelectorAll('[data-skin-rarity]')) {
      button.classList.toggle('selected', button.dataset.skinRarity === this.filter);
      button.setAttribute('aria-selected', String(button.dataset.skinRarity === this.filter));
    }
  }
  updateSelection() {
    const skin = skinDefinition(this.key, this.selected),
      equipped = this.inventory.equipped(this.key);
    this.container.querySelector('#skin-wallet').textContent =
      `${this.inventory.balance.toLocaleString()} PTS`;
    for (const { button, skin: definition } of this.cards.values()) {
      const selected = definition.id === this.selected;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('unowned', !this.inventory.has(this.key, definition.id));
      button.querySelector('.skin-card-owned').textContent =
        definition.id === equipped
          ? 'WYPOSAŻONY'
          : this.inventory.has(this.key, definition.id)
            ? 'POSIADANY'
            : `${definition.price} PTS`;
    }
    const rarity = this.container.querySelector('#skin-rarity');
    rarity.textContent = RARITIES[skin.rarity]?.name || 'ORYGINAŁ';
    rarity.style.color = RARITIES[skin.rarity]?.color || '#9aa8a0';
    this.container.querySelector('#skin-name').textContent = skin.name;
    this.container.querySelector('#skin-description').textContent = skin.description;
    this.container.querySelector('#skin-price').textContent = `${skin.price} PTS`;
    const requires =
      skin.requires && skin.requires !== 'factory' ? skinDefinition(this.key, skin.requires) : null;
    this.container.querySelector('#skin-requirement').textContent = requires
      ? `Wymagany bazowy skin: ${requires.name}`
      : '';
    const button = this.container.querySelector('#skin-equip');
    const owned = this.inventory.has(this.key, this.selected),
      status = this.inventory.purchaseStatus(this.key, this.selected);
    button.disabled = equipped === this.selected || (!owned && !status.allowed);
    button.textContent =
      equipped === this.selected ? 'WYPOSAŻONY' : owned ? 'WYPOSAŻ' : status.label;
  }
}
