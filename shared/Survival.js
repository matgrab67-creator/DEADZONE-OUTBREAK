import { STATIONS, COLLECTIBLES } from './map.js';
import { forestBox } from './Forest.js';
import { WEAPONS } from './config.js';
import { BASIC_WEAPONS } from './WeaponProgression.js';
import { discountedRecipeCost } from './CampSystems.js';

export const RESOURCE_NAMES = {
  wood: 'drewno',
  scrap: 'złom',
  parts: 'części',
  medicine: 'medykamenty',
};
export const SURVIVAL_STATIONS = STATIONS.filter(
  (s) => s.type !== 'weapon' || BASIC_WEAPONS.includes(s.weapon),
).map((s) => ({
  ...s,
  name:
    {
      ammo: 'ZAPASY AMUNICJI',
      armor: 'OSŁONY BALISTYCZNE',
      mystery: 'PORZUCONA SKRZYNIA',
      upgrade: 'STÓŁ RUSZNIKARSKI',
      repair: 'ZAPASOWE DESKI',
    }[s.type] ||
    (s.type === 'perk'
      ? {
          heart: 'NAMIOT MEDYCZNY',
          hands: 'TRENING PRZEŁADOWANIA',
          ghost: 'TRENING TERENOWY',
          deadeye: 'TRENING STRZELECKI',
          rapid: 'MODYFIKACJA SPUSTU',
        }[s.perk]
      : s.name),
  ...(s.type === 'repair' ? { type: 'woodpile', price: 0 } : {}),
  ...(s.type === 'weapon' ? { type: 'store', price: 0, name: `MAGAZYN / ${s.name}` } : {}),
}));
export const WORKBENCH = {
  id: 'survival-bench',
  type: 'workbench',
  name: 'WARSZTAT / CRAFTING',
  x: -6,
  z: -12,
  price: 0,
};
export const SURVIVAL_LOGS = COLLECTIBLES.map((c, i) => ({
  ...c,
  title: `DZIENNIK OCALAŁYCH ${i + 1}`,
  text: [
    'Dzień 38. Postawiliśmy palisadę. Gdy zapada mgła, pilnuj czterech wejść do obozu.',
    'Podążaj ścieżkami. Za lasem są opuszczone chaty i skrytki. Zostaw znaki, aby znaleźć drogę powrotną.',
    'Po piętnastu nocach dotarliśmy głębiej. Obóz nadal stoi. Nie zostawiaj rannych za sobą.',
  ][i],
}));
export const survivalStationBoxes = () =>
  [...SURVIVAL_STATIONS, WORKBENCH].map((s) =>
    forestBox(
      s.id,
      s.x,
      0.48,
      s.z,
      s.type === 'store' || s.type === 'mystery' ? 1.7 : 1,
      0.96,
      0.65,
    ),
  );
export const RECIPES = [
  {
    id: 'ammo',
    name: 'AMUNICJA',
    text: 'Uzupełnia zapas aktualnej broni.',
    cost: { scrap: 3, parts: 1 },
  },
  {
    id: 'medkit',
    name: 'APTECZKA',
    text: 'H — leczenie 65 HP. Możesz nosić 3.',
    cost: { medicine: 2, scrap: 1 },
  },
  {
    id: 'molotov',
    name: 'KOKTAJL MOŁOTOWA',
    text: 'J — rzut. Ogień rani zombie przez 7 sekund.',
    cost: { scrap: 2, medicine: 1 },
  },
  {
    id: 'trap',
    name: 'PUŁAPKA KŁUSOWNICZA',
    text: 'T — ustaw przed sobą. Zatrzymuje i rani zombie.',
    cost: { wood: 3, scrap: 3 },
  },
  {
    id: 'armor',
    name: 'NAPRAWA OSŁON',
    text: 'Przywraca 100 punktów pancerza.',
    cost: { scrap: 5, parts: 1 },
  },
  {
    id: 'magazine',
    name: 'WIĘKSZY MAGAZYNEK',
    text: '+25% pojemności obecnej broni. Działa razem z ulepszeniem.',
    cost: { scrap: 7, parts: 3 },
  },
  {
    id: 'handling',
    name: 'SERWIS MECHANIZMU',
    text: '10% szybsze przeładowanie i 12% mniejszy rozrzut.',
    cost: { scrap: 5, parts: 3 },
  },
  {
    id: 'optic',
    name: 'KALIBRACJA CELOWNIKA',
    text: 'Dokładniejsze ADS i dodatkowe przybliżenie. Zachowuje fabryczną optykę.',
    cost: { scrap: 4, parts: 4 },
  },
];
export function craftStatus(player, recipe, atBench) {
  if (!atBench) return 'Podejdź do warsztatu w obozie.';
  const inv = player.inventory[player.slot];
  if (['magazine', 'handling', 'optic'].includes(recipe.id) && inv[recipe.id])
    return 'Modyfikacja już zamontowana.';
  if (recipe.id === 'ammo' && inv.reserve >= WEAPONS[inv.id].reserve) return 'Pełny zapas.';
  if (recipe.id === 'armor' && player.armor >= 100) return 'Pancerz jest pełny.';
  if (
    ['medkit', 'molotov', 'trap'].includes(recipe.id) &&
    (player.equipment?.[recipe.id] || 0) >= 3
  )
    return 'Limit wyposażenia: 3.';
  if (
    Object.entries(discountedRecipeCost(recipe, player.campLevels?.workshop)).some(
      ([id, n]) => (player.resources?.[id] || 0) < n,
    )
  )
    return 'Brakuje materiałów.';
  return '';
}
