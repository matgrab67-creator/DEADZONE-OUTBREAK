import { RECIPES, RESOURCE_NAMES, WORKBENCH, craftStatus } from '../../shared/Survival.js';
import { distance } from '../../shared/config.js';

export class CraftUI {
  constructor(container, craft) {
    this.container = container;
    container.innerHTML = `<button id="craft-close" class="shop-close" aria-label="Zamknij warsztat">×</button>
      <span class="eyebrow">OBÓZ OCALAŁYCH / WARSZTAT POLOWY</span>
      <div class="craft-heading"><div><h2>ZRÓB UŻYTEK<br>Z TEGO, CO ZOSTAŁO.</h2><p id="craft-location" class="muted"></p></div><div id="craft-resources" class="craft-resources"></div></div>
      <div class="craft-grid"></div><p id="craft-feedback" class="shop-feedback" role="status">K / Esc — powrót. L — latarka · H — apteczka · J — Mołotow · T — pułapka.</p>`;
    this.cards = RECIPES.map((recipe) => {
      const card = document.createElement('article');
      card.className = 'craft-card';
      card.innerHTML = `<span class="eyebrow">${['magazine', 'optic', 'handling'].includes(recipe.id) ? 'RUSZNIKARSTWO' : 'WYPOSAŻENIE'}</span><h3>${recipe.name}</h3><p>${recipe.text}</p><div class="craft-cost">${Object.entries(
        recipe.cost,
      )
        .map(([k, n]) => `${n} ${RESOURCE_NAMES[k]}`)
        .join(
          ' · ',
        )}</div><button class="outline" data-craft="${recipe.id}">WYTWÓRZ</button><small class="craft-reason"></small>`;
      const button = card.querySelector('button');
      button.addEventListener('click', () => craft(recipe.id));
      container.querySelector('.craft-grid').append(card);
      return { recipe, card, button, reason: card.querySelector('.craft-reason') };
    });
  }
  update(player, multiplayer) {
    const signature = JSON.stringify([
      player.resources,
      player.equipment,
      player.inventory[player.slot],
      player.hp,
      player.armor,
      player.downed,
      player.eliminated,
      distance(player, WORKBENCH) < 3,
      multiplayer,
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    const atBench = distance(player, WORKBENCH) < 3;
    this.container.querySelector('#craft-location').textContent =
      `${atBench ? 'Jesteś przy warsztacie. Wybierz recepturę.' : 'Podejdź do stołu w północnej części obozu: 6 m na zachód, 12 m na północ od ogniska.'} ${multiplayer ? 'Co-op: czas nadal płynie.' : 'Solo: pauza.'}`;
    this.container.querySelector('#craft-resources').innerHTML = Object.entries(RESOURCE_NAMES)
      .map(([k, name]) => `<span><strong>${player.resources?.[k] || 0}</strong>${name}</span>`)
      .join('');
    for (const { recipe, button, reason } of this.cards) {
      const message = craftStatus(player, recipe, atBench);
      button.disabled = !!message || player.downed || player.eliminated;
      reason.textContent = message;
    }
  }
  feedback(message) {
    this.container.querySelector('#craft-feedback').textContent = message;
  }
}
