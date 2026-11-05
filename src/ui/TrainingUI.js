import { WEAPONS } from '../../shared/config.js';
import { TRAINING_DRILLS } from '../../shared/Training.js';
export class TrainingUI {
  constructor(container, start) {
    this.container = container;
    container.innerHTML = `<button id="training-close" class="shop-close" aria-label="Zamknij trening">×</button><span class="eyebrow">POLIGON OCALAŁYCH / BEZPIECZNA ARENA</span><h2>TRENUJ.<br>PRZETRWAJ DŁUŻEJ.</h2><p class="muted">60 sekund, prawdziwy odrzut, przeładowanie i obrażenia. Wszystkie bronie dostępne bez opłat. Wynik i wyposażenie treningowe nie przechodzą do meczu.</p><div class="settings-grid"><label>BROŃ<select id="training-weapon">${Object.entries(
      WEAPONS,
    )
      .map(([id, w]) => `<option value="${id}">${w.name}</option>`)
      .join('')}</select></label><label>ĆWICZENIE<select id="training-drill">${Object.entries(
      TRAINING_DRILLS,
    )
      .map(([id, name]) => `<option value="${id}">${name}</option>`)
      .join(
        '',
      )}</select></label></div><div class="manual-note"><b>PRECYZJA</b><p>Trzy stałe cele. Ćwicz krótkie serie, ADS i headshoty.</p><b>TRACKING</b><p>Cele poruszają się na boki. Prowadź celownik za głową.</p><b>REFLEKS</b><p>Jeden cel odradza się w nowym miejscu po eliminacji. Ćwicz szybkie przenoszenie celownika.</p></div><button id="training-start" class="primary">ROZPOCZNIJ / ZRESETUJ WYNIK</button>`;
    container
      .querySelector('#training-start')
      .addEventListener('click', () =>
        start({
          weapon: container.querySelector('#training-weapon').value,
          drill: container.querySelector('#training-drill').value,
        }),
      );
  }
  update(state, p) {
    this.container.querySelector('#training-weapon').value = p.inventory[p.slot].id;
    this.container.querySelector('#training-drill').value = state.training.drill;
  }
}
