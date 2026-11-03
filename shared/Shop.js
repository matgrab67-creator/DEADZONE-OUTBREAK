import { WEAPONS, PERKS } from './config.js';
import { STATIONS, SECTORS } from './map.js';

export const SHOP_ITEMS = [
  ...Object.entries(WEAPONS).map(([weapon, w]) => ({
    id: `weapon:${weapon}`,
    type: 'weapon',
    weapon,
    category: 'weapons',
    name: w.name,
    price: w.price || 250,
    blueprintPrice: Math.round((w.price || 250) * 0.7),
    description: `${w.type} · ${w.damage} damage · ${w.magazine} rounds`,
  })),
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

export function weaponUnlockLocation(id) {
  const station = STATIONS.find((s) => s.type === 'weapon' && s.weapon === id);
  return SECTORS.find((s) => s.id === station?.sector)?.name || 'SPAWN COURTYARD';
}
export function shopStatus(player, item) {
  if (player.downed || player.eliminated) return { allowed: false, label: 'OPERATOR DOWN' };
  const inv = player.inventory[player.slot];
  if (item.type === 'weapon') {
    if (!(player.unlockedWeapons || ['vx9']).includes(item.weapon)) {
      const blueprintPrice = item.blueprintPrice;
      return {
        allowed: player.points >= blueprintPrice,
        label: player.points >= blueprintPrice ? 'BUY BLUEPRINT' : 'BLUEPRINT LOCKED',
        blueprint: player.points >= blueprintPrice,
        blueprintPrice,
        reason: `Find its station in ${weaponUnlockLocation(item.weapon)} or buy its blueprint for ${blueprintPrice} points.`,
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
  if (item.type === 'upgrade' && inv.upgraded) return { allowed: false, label: 'ENHANCED' };
  if (item.type === 'perk' && player.perks.includes(item.perk))
    return { allowed: false, label: 'ACTIVE' };
  if (player.points < item.price) return { allowed: false, label: 'NOT ENOUGH POINTS' };
  return { allowed: true, label: 'BUY' };
}
