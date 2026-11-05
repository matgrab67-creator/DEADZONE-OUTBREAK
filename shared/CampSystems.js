export const CAMP_STRUCTURES = [
  { id: 'radio-hut', kind: 'cabin', x: -12, z: -6, w: 5, h: 2.6, d: 3 },
  { id: 'medical-shelter', kind: 'medical', x: 16, z: 10, w: 5, h: 2.4, d: 3 },
  { id: 'carpentry', kind: 'workshop', x: -14, z: -11, w: 5, h: 2.5, d: 3 },
  { id: 'supply-shed', kind: 'store', x: 12, z: 15, w: 4, h: 2.2, d: 3 },
  { id: 'generator-shelter', kind: 'generator', x: 20, z: -9, w: 4, h: 2.2, d: 4 },
  { id: 'water-tanks', kind: 'water', x: -3, z: 15, w: 2, h: 1.4, d: 2 },
];
export const CAMP_UPGRADES = [
  {
    id: 'clinic',
    type: 'campUpgrade',
    name: 'ROZBUDUJ AMBULATORIUM',
    x: 16,
    z: 12.1,
    description: 'Apteczki leczą o 5 HP więcej na każdy poziom.',
  },
  {
    id: 'workshop',
    type: 'campUpgrade',
    name: 'ROZBUDUJ WARSZTAT',
    x: -14,
    z: -8.9,
    description: 'Tańsze receptury craftingu dla całej drużyny.',
  },
  {
    id: 'generator',
    type: 'campUpgrade',
    name: 'ULEPSZ GENERATOR',
    x: 20,
    z: -6.4,
    description: 'Impulsy obronne przy barykadach i lepsze oświetlenie obozu.',
  },
];
export const CONTRACT_BOARD = {
  id: 'contract-board',
  type: 'contract',
  name: 'TABLICA WYPRAW',
  x: -12,
  z: -3.8,
  price: 0,
};
export const campUpgradeCost = (level = 0) => ({
  wood: 5 + level * 4,
  scrap: 6 + level * 4,
  parts: 1 + level,
});
export const discountedRecipeCost = (recipe, level = 0) =>
  Object.fromEntries(
    Object.entries(recipe.cost).map(([k, n]) => [k, Math.max(1, n - Math.min(3, level))]),
  );
export function newContract(index, forest, claimed) {
  const kinds = ['defend', 'supply', 'nest'],
    kind = kinds[index % 3],
    cache = forest.caches(claimed)[0];
  if (kind === 'supply' && !cache)
    return { id: index, kind: 'defend', goal: 12, progress: 0, ready: false, name: 'OBROŃ OBÓZ' };
  return {
    id: index,
    kind,
    goal: kind === 'defend' ? 12 : kind === 'nest' ? 350 : 1,
    progress: 0,
    ready: false,
    name:
      kind === 'defend' ? 'OBROŃ OBÓZ' : kind === 'supply' ? 'ODZYSKAJ ZAPASY' : 'ZNISZCZ GNIAZDO',
    ...(kind === 'supply'
      ? { target: cache.id, x: cache.x, z: cache.z }
      : kind === 'nest'
        ? { x: 0, z: -(forest.ring + 0.5) * 24 + 8, hp: 350 }
        : {}),
  };
}
