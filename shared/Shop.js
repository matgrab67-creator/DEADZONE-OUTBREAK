import { WEAPONS, PERKS } from './config.js';
import { STATIONS, chapterSectors } from './map.js';
import { blueprintRegion } from './WeaponProgression.js';
import { FLASHLIGHT_BATTERY_SECONDS, MAX_SPARE_BATTERIES, LANTERN } from './MatchRules.js';

export function weaponCategory(weapon) {
  const w = WEAPONS[weapon];
  if (!w) return null;
  if (w.pellets > 1) return 'shotguns';
  if (/PRECISION|SNIPER|ANTI-MATERIEL/.test(w.type) || w.boltAction) return 'snipers';
  if (/SUBMACHINE|PERSONAL DEFENCE/.test(w.type)) return 'smgs';
  if (/PISTOL/.test(w.type)) return 'pistols';
  return 'rifles';
}

export const SHOP_ITEMS = [
  ...Object.entries(WEAPONS).map(([weapon, w]) => ({
    id: `weapon:${weapon}`,
    type: 'weapon',
    weapon,
    category: 'weapons',
    weaponCategory: weaponCategory(weapon),
    name: w.name,
    price: w.price || 250,
    blueprintPrice: Math.round((w.price || 250) * 0.7),
    description: `${w.type} · ${w.damage} body / ${Math.round(w.headDamage ?? w.damage * w.head)} head · ${w.magazine} rounds${w.caliber ? ` · ${w.caliber}` : ''}`,
  })),
  {
    id: 'lantern',
    type: 'lantern',
    category: 'supplies',
    name: 'LATARNIA OCHRONNA',
    price: LANTERN.price,
    description:
      'O — postaw przed sobą. Odstrasza zwykłe zombie w promieniu 6 m przez 180 sekund. Boss nie boi się światła. Maks. 2 w plecaku / 4 aktywne w drużynie.',
  },
  {
    id: 'flashlight',
    type: 'flashlight',
    category: 'supplies',
    name: 'LATARKA TAKTYCZNA',
    price: 600,
    description: `Mocny snop światła / L. Zawiera baterię na ${FLASHLIGHT_BATTERY_SECONDS} sekund świecenia. Pozostaje po zmianie rozdziału.`,
  },
  {
    id: 'battery',
    type: 'battery',
    category: 'supplies',
    name: 'BATERIA DO LATARKI',
    price: 200,
    description: `Zapas na ${FLASHLIGHT_BATTERY_SECONDS} sekund. Automatyczna wymiana po rozładowaniu. Maksymalnie ${MAX_SPARE_BATTERIES} zapasowe baterie.`,
  },
  {
    id: 'ammo',
    type: 'ammo',
    category: 'supplies',
    name: 'AMMUNITION',
    price: 250,
    description: 'Refill the reserve ammunition of your current firearm.',
  },
  {
    id: 'armor',
    type: 'armor',
    category: 'supplies',
    name: 'SHIELD PLATES',
    price: 500,
    description: 'Restore armor to 100 shield points.',
  },
  {
    id: 'health',
    type: 'health',
    category: 'supplies',
    name: 'FIELD MEDKIT',
    price: 350,
    description: 'Restore your health to its current maximum.',
  },
  {
    id: 'grenades',
    type: 'grenades',
    category: 'supplies',
    name: 'GRENADE PACK',
    price: 300,
    description: 'Two grenades. Carry up to four.',
  },
  {
    id: 'upgrade',
    type: 'upgrade',
    category: 'upgrades',
    name: 'WEAPON ENHANCEMENT',
    price: 2500,
    description: 'Current firearm: 1.9× damage and 1.5× magazine capacity.',
  },
  ...Object.entries(PERKS).map(([perk, p]) => ({
    id: `perk:${perk}`,
    type: 'perk',
    perk,
    category: 'perks',
    ...p,
  })),
];
export const SHOP_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function weaponUnlockLocation(id, chapter = 1, forest = false) {
  const station = STATIONS.find((s) => s.type === 'weapon' && s.weapon === id);
  if (forest)
    return `${station?.z < 0 ? 'PÓŁNOC' : 'POŁUDNIE'} OBOZU / ${station?.x < -9 ? 'ZACHÓD' : station?.x > 9 ? 'WSCHÓD' : 'ŚRODEK'}`;
  return chapterSectors(chapter).find((s) => s.id === station?.sector)?.name || 'SPAWN COURTYARD';
}
export function shopStatus(player, item) {
  if (player.downed || player.eliminated) return { allowed: false, label: 'OPERATOR DOWN' };
  const inv = player.inventory[player.slot];
  if (item.type === 'weapon') {
    if (player.training)
      return {
        allowed: true,
        label: player.inventory[player.slot].id === item.weapon ? 'EQUIPPED' : 'WYPRÓBUJ',
        free: true,
      };
    if (!(player.unlockedWeapons || ['vx9']).includes(item.weapon)) {
      if (player.world === 'forest')
        return {
          allowed: false,
          label: 'SCHEMAT W SKRZYNI',
          cache: true,
          reason: blueprintRegion(item.weapon),
        };
      const blueprintPrice = item.blueprintPrice;
      return {
        allowed: player.points >= blueprintPrice,
        label: player.points >= blueprintPrice ? 'BUY BLUEPRINT' : 'BLUEPRINT LOCKED',
        blueprint: player.points >= blueprintPrice,
        blueprintPrice,
        reason: `Find its station in ${weaponUnlockLocation(item.weapon, player.chapter, player.world === 'forest')} or buy its blueprint for ${blueprintPrice} points.`,
      };
    }
    const slot = player.inventory.findIndex((i) => i.id === item.weapon);
    if (slot >= 0)
      return {
        allowed: true,
        label: slot === player.slot ? 'EQUIPPED' : 'EQUIP',
        equipSlot: slot,
        free: true,
      };
  }
  if (item.type === 'ammo' && inv.reserve >= WEAPONS[inv.id].reserve)
    return { allowed: false, label: 'AMMO FULL' };
  if (item.type === 'armor' && player.armor >= 100) return { allowed: false, label: 'SHIELD FULL' };
  if (item.type === 'health' && player.hp >= player.maxHp)
    return { allowed: false, label: 'HEALTH FULL' };
  if (item.type === 'grenades' && player.grenades >= 4)
    return { allowed: false, label: 'GRENADES FULL' };
  if (item.type === 'flashlight' && player.flashlightUnlocked)
    return { allowed: false, label: 'LATARKA ODBLOKOWANA' };
  if (item.type === 'battery' && !player.flashlightUnlocked)
    return { allowed: false, label: 'NAJPIERW KUP LATARKĘ' };
  if (item.type === 'battery' && player.spareBatteries >= MAX_SPARE_BATTERIES)
    return { allowed: false, label: 'ZAPAS BATERII PEŁNY' };
  if (item.type === 'lantern' && (player.equipment?.lantern || 0) >= LANTERN.carry)
    return { allowed: false, label: 'ZAPAS LATARNI PEŁNY' };
  if (item.type === 'upgrade' && inv.upgraded) return { allowed: false, label: 'ENHANCED' };
  if (item.type === 'perk' && player.perks.includes(item.perk))
    return { allowed: false, label: 'ACTIVE' };
  if (player.points < item.price) return { allowed: false, label: 'NOT ENOUGH POINTS' };
  return { allowed: true, label: 'BUY' };
}
