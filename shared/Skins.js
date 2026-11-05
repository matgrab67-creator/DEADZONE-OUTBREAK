import { WEAPONS } from './config.js';
import { KNIFE_MODELS } from './Knives.js';

export const RARITIES = {
  rare: { name: 'RZADKI', color: '#5cafff', order: 1 },
  epic: { name: 'EPICKI', color: '#bc80ff', order: 2 },
  mythic: { name: 'MITYCZNY', color: '#ffc66d', order: 3 },
  special: { name: 'SPECJALNY', color: '#f58b9e', order: 4 },
  legendary: { name: 'LEGENDARNY', color: '#f5d14e', order: 5 },
};
export const SKIN_POINTS_PER_WAVE = 25;
export const SKIN_PRICES = Object.freeze({
  rare: 100,
  epic: 250,
  mythic: 600,
  special: 800,
  legendary: 1000,
});

// Each firearm has its own palette, insignia and engraving layout, shared only
// between its own finish variants. No two weapons use an identical coating.
const themes = {
  vx9: ['ION', '#5ae4f0', 'pulse'],
  desertEagle: ['SUN KING', '#e7a63e', 'sun'],
  tec9: ['STATIC', '#e065bd', 'signal'],
  raven: ['RED FANG', '#d45b35', 'fang'],
  spectre: ['GHOST LEAF', '#72b5aa', 'fern'],
  vortex: ['CYCLONE', '#68a0ed', 'vortex'],
  iron: ['FORGE', '#e98237', 'chevron'],
  lynx: ['FROST CLAW', '#99c9ec', 'claw'],
  scout: ['TRAILBLAZER', '#a8c96a', 'contour'],
  pbs1: ['NIGHT VEIL', '#9470b9', 'signal'],
  glock17: ['GLACIER', '#79cadf', 'fractals'],
  beretta92: ['VENETIAN', '#c79b64', 'sun'],
  mp5: ['RAIL SIGNAL', '#d29c52', 'pulse'],
  p90: ['HIVE', '#c1cd43', 'honeycomb'],
  scarh: ['WAR DUNE', '#bd7843', 'contour'],
  aug: ['CANOPY', '#79af67', 'fern'],
  barrett: ['TITAN', '#d54c43', 'chevron'],
  m1911: ['LIBERTY', '#d2b77a', 'sun'],
  p226: ['COBALT', '#648fe5', 'signal'],
  cz75: ['BOHEMIAN', '#b66cba', 'fractals'],
  uzi: ['STREET WIRE', '#e08c53', 'pulse'],
  vector: ['FLUX', '#bd66dd', 'vortex'],
  benelli: ['ASH WING', '#b2a18d', 'fern'],
  r870: ['RANGER', '#a59456', 'claw'],
  fal: ['COPPERHEAD', '#cb8055', 'fang'],
  g36: ['HEX GUARD', '#64bdac', 'honeycomb'],
  axmc: ['POLARIS', '#b2bde9', 'fractals'],
  'knife:karambit': ['TIGER TALON', '#eda14b', 'claw'],
  'knife:skeleton': ['BONE RELIC', '#d0c1a2', 'honeycomb'],
  'knife:stiletto': ['DUELIST', '#c3657a', 'fang'],
};
const tint = (color, accent, strength = 0.32) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        parseInt(color.slice(i, i + 2), 16) * (1 - strength) +
          parseInt(accent.slice(i, i + 2), 16) * strength,
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const finish = (
  id,
  name,
  namePl,
  rarity,
  pattern,
  colors,
  roughness,
  metalness,
  description,
  descriptionEn,
) => ({
  id,
  name,
  namePl,
  rarity,
  pattern,
  colors,
  roughness,
  metalness,
  description,
  descriptionEn,
});
export const SKIN_FAMILIES = [
  {
    id: 'sovereign',
    name: 'AURELIAN WYRM',
    namePl: 'ZŁOTY SMOK',
    rarity: 'mythic',
    pattern: 'dragon',
    colors: ['#101b26', '#dfb962', '#328c8c'],
    roughness: 0.23,
    metalness: 0.86,
    description:
      'Obsydianowa emalia, złoty smok i grawerowane łuski. Polerowane złoto przełamane turkusową patyną.',
    descriptionEn:
      'Obsidian enamel, a golden dragon and engraved scales. Polished gold with turquoise patina.',
  },
  {
    id: 'aurora',
    name: 'AURORA SHIFT',
    namePl: 'ZORZA POLARNA',
    rarity: 'epic',
    pattern: 'doppler',
    colors: ['#25105e', '#e13f9a', '#2ad9d0'],
    roughness: 0.19,
    metalness: 0.8,
    description: 'Anodowane fale purpury, różu i turkusu. Własny układ smug dla każdego modelu.',
    descriptionEn:
      'Anodized purple, pink and turquoise waves. A unique flow of color for each model.',
  },
  {
    id: 'ronin',
    name: 'SCARLET RONIN',
    namePl: 'SZKARŁATNY RONIN',
    rarity: 'epic',
    pattern: 'ronin',
    colors: ['#ece5d5', '#b61f35', '#17212b'],
    roughness: 0.35,
    metalness: 0.36,
    description: 'Kremowa ceramika, czerwone słońce, gałęzie i ciemne pociągnięcia tuszu.',
    descriptionEn: 'Cream ceramic, a red sun, branches and dark brushwork.',
  },
  {
    id: 'arctic',
    name: 'ARCTIC CIRCUIT',
    namePl: 'ARKTYCZNY OBWÓD',
    rarity: 'rare',
    pattern: 'circuit',
    colors: ['#d6e1e5', '#273e55', '#31bfeb'],
    roughness: 0.42,
    metalness: 0.35,
    description: 'Jasny cyfrowy kamuflaż z błękitnymi ścieżkami. Satynowa, techniczna powłoka.',
    descriptionEn:
      'Pale digital camouflage with blue circuit traces and a satin technical coating.',
  },
  {
    id: 'venom',
    name: 'VENOM SCALE',
    namePl: 'JADOWITE ŁUSKI',
    rarity: 'rare',
    pattern: 'scales',
    colors: ['#123c2b', '#6fba68', '#d0ba6a'],
    roughness: 0.32,
    metalness: 0.6,
    description: 'Nakładające się szmaragdowe łuski, ciemna zieleń i drobne mosiężne akcenty.',
    descriptionEn: 'Overlapping emerald scales, deep green and small brass accents.',
  },
  finish(
    'desert',
    'DESERT FRACTURE',
    'PUSTYNNE PĘKNIĘCIE',
    'rare',
    'fracture',
    ['#c8ad7a', '#725b40', '#e0cfa5'],
    0.57,
    0.2,
    'Ostre warstwy pustynnego kamuflażu i linie topograficzne na matowej powłoce.',
    'Angular desert camouflage and topographic lines on a matte coating.',
  ),
  finish(
    'midnight',
    'MIDNIGHT GRID',
    'NOCNA SIATKA',
    'rare',
    'grid',
    ['#10243f', '#255989', '#48c8e6'],
    0.38,
    0.52,
    'Granatowa stal, ukośna siatka i cyjanowe pasy o metalicznym połysku.',
    'Navy steel, a diagonal grid and cyan stripes with a metallic sheen.',
  ),
  finish(
    'copper',
    'COPPER OXIDE',
    'TLENEK MIEDZI',
    'rare',
    'patina',
    ['#623b2c', '#ce8e57', '#3f9e8a'],
    0.48,
    0.65,
    'Miedziana baza z turkusową patyną i delikatnym grawerem. Wzór utlenienia dopasowany do broni.',
    'Copper with turquoise oxidation and fine engraving, tailored to each weapon.',
  ),
  finish(
    'sakura',
    'SAKURA BLOOM',
    'KWIAT WIŚNI',
    'rare',
    'petals',
    ['#272334', '#edacc4', '#9e517c'],
    0.38,
    0.3,
    'Różowe kwiaty wiśni na śliwkowej ceramice. Gałęzie i płatki układają się inaczej na każdym modelu.',
    'Pink cherry blossoms over plum ceramic, with branches and petals unique to each model.',
  ),
  finish(
    'tundra',
    'TUNDRA CAMO',
    'KAMUFLAŻ TUNDRY',
    'rare',
    'frost',
    ['#d6e0df', '#67868e', '#394d5d'],
    0.62,
    0.14,
    'Lodowe odłamki, mleczna biel i chłodny błękit. Matowa powłoka zimowego kamuflażu.',
    'Ice shards, milky white and cool blue in a matte winter camouflage.',
  ),
  finish(
    'rust',
    'RUST SIGNAL',
    'RDZAWY SYGNAŁ',
    'rare',
    'hazard',
    ['#282527', '#c77b38', '#88503c'],
    0.68,
    0.4,
    'Ciemna stal z miedzianymi śladami korozji i ukośnymi pasami ostrzegawczymi.',
    'Dark steel with copper corrosion and diagonal hazard markings.',
  ),
  finish(
    'inferno',
    'INFERNO FORGE',
    'PIEKIELNA KUŹNIA',
    'epic',
    'embers',
    ['#1d111b', '#f45a27', '#ffd08b'],
    0.24,
    0.7,
    'Grafitowy metal przecięty pomarańczowymi żyłami żaru i drobnymi iskrami.',
    'Graphite metal cut by glowing orange veins and scattered embers.',
  ),
  finish(
    'neon',
    'NEON PULSE',
    'NEONOWY PULS',
    'epic',
    'neon',
    ['#14112d', '#ff4cb5', '#42e8e0'],
    0.28,
    0.65,
    'Czarno-fioletowa baza z różowymi i turkusowymi liniami impulsów. Lakier o czystym połysku.',
    'Black-violet lacquer with pink and turquoise pulse lines and a crisp gloss.',
  ),
  finish(
    'leviathan',
    'ABYSSAL LEVIATHAN',
    'LEWIATAN Z OTCHŁANI',
    'mythic',
    'abyss',
    ['#071d34', '#31b6b5', '#b4e5d1'],
    0.19,
    0.9,
    'Morska bestia, splątane macki i perłowe ryty na głębokim, niebieskim metalu.',
    'A sea beast, curling tentacles and pearl engravings over deep blue metal.',
  ),
  finish(
    'mirror',
    'MIRROR SILVER',
    'LUSTRZANE SREBRO',
    'special',
    'mirror',
    ['#dce1e5', '#dce1e5', '#dce1e5'],
    0.018,
    1,
    'Cała broń pokryta polerowanym srebrem. Bardzo gładki metal odbija oświetlenie i otoczenie podglądu.',
    'Full polished silver. The very smooth metal reflects lighting and the preview environment.',
  ),
  finish(
    'crimsonweb',
    'CRIMSON WEB',
    'KARMAZYNOWA SIEĆ',
    'special',
    'web',
    ['#940e20', '#150b10', '#c92539'],
    0.31,
    0.55,
    'Głęboka karmazynowa czerwień pokryta cienką czarną pajęczyną. Własny układ sieci dla każdej broni.',
    'Deep crimson red covered in fine black spiderwebs, laid out separately for each weapon.',
  ),
  finish(
    'emerald',
    'EMERALD',
    'SZMARAGD',
    'special',
    'emerald',
    ['#06472a', '#16a766', '#63d898'],
    0.08,
    1,
    'Intensywne szmaragdowe wykończenie, delikatne fasety i wysoki połysk jubilerskiego metalu.',
    'Rich emerald green, subtle facets and a highly polished jewel-like metal finish.',
  ),
  finish(
    'blackmat',
    'FULL BLACK',
    'GŁĘBOKA CZERŃ',
    'special',
    'matte',
    ['#101113', '#101113', '#101113'],
    0.98,
    0,
    'Jednolita głęboka czerń na całej broni. Bardzo matowa, niemetaliczna powłoka bez kolorowych wzorów.',
    'Uniform deep black across the weapon. A very matte, nonmetallic coating with no colored graphics.',
  ),
];
export const SKIN_CATALOG_FAMILIES = Object.freeze([...SKIN_FAMILIES]);
export const SKIN_FINISHES_PER_WEAPON = SKIN_CATALOG_FAMILIES.length * 2 + 1;
export const SKIN_TRANSLATIONS = [
  ...SKIN_FAMILIES.flatMap((skin) => [
    [skin.namePl, skin.name],
    [skin.description, skin.descriptionEn],
  ]),
  ['ORYGINAŁ FABRYCZNY', 'FACTORY ORIGINAL'],
  ['Oryginalne materiały producenta.', 'Original manufacturer materials.'],
  ['MECHA INDUSTRIES', 'MECHA INDUSTRIES'],
  [
    'Ceramiczne panele w odcieniach bieli i stali, czerwone pasy serwisowe oraz techniczne oznaczenia. Wzór dopasowany do każdego modelu karabinu.',
    'White and steel ceramic panels, red service stripes and technical markings, tailored to each rifle.',
  ],
  ...Object.entries({
    ION: 'JON',
    'SUN KING': 'KRÓL SŁOŃCA',
    STATIC: 'ZAKŁÓCENIA',
    'RED FANG': 'CZERWONY KIEŁ',
    'GHOST LEAF': 'WIDMOWY LIŚĆ',
    CYCLONE: 'CYKLON',
    FORGE: 'KUŹNIA',
    'FROST CLAW': 'MROŹNY PAZUR',
    TRAILBLAZER: 'TROPICIEL',
    'NIGHT VEIL': 'NOCNA ZASŁONA',
    GLACIER: 'LODOWIEC',
    VENETIAN: 'WENECJANIN',
    'RAIL SIGNAL': 'SYGNAŁ KOLEJOWY',
    HIVE: 'UL',
    'WAR DUNE': 'WOJENNA WYDMA',
    CANOPY: 'KORONY DRZEW',
    TITAN: 'TYTAN',
    LIBERTY: 'WOLNOŚĆ',
    COBALT: 'KOBALT',
    BOHEMIAN: 'CZESKA MOZAIKA',
    'STREET WIRE': 'ULICZNY PRZEWÓD',
    FLUX: 'STRUMIEŃ',
    'ASH WING': 'POPIELATE SKRZYDŁO',
    RANGER: 'STRAŻNIK',
    COPPERHEAD: 'MIEDZIOGŁOWIEC',
    'HEX GUARD': 'SZEŚCIOKĄTNA TARCZA',
    POLARIS: 'GWIAZDA POLARNA',
    'TIGER TALON': 'TYGRYSI PAZUR',
    'BONE RELIC': 'KOŚCIANA RELIKWIA',
    DUELIST: 'POJEDYNKOWICZ',
  }).map(([en, pl]) => [pl, en]),
];
const isRifle = (key) =>
  /RIFLE/.test(WEAPONS[key]?.type || '') &&
  !/PRECISION|SNIPER|ANTI-MATERIEL/.test(WEAPONS[key]?.type || '');
export const SKIN_WEAPONS = Object.freeze([
  ...Object.entries(WEAPONS).map(([id, w]) => ({ key: id, id, kind: 'weapon', name: w.name })),
  ...Object.entries(KNIFE_MODELS).map(([id, name]) => ({
    key: `knife:${id}`,
    id,
    kind: 'knife',
    name,
  })),
]);
const keys = new Set(SKIN_WEAPONS.map((w) => w.key));
export const skinKey = (kind, id) =>
  kind === 'knife' ? `knife:${id === 'dagger' ? 'stiletto' : id}` : id;
export function skinSeed(key, finish) {
  let hash = 2166136261;
  for (const c of `${key}/${finish}`) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function skinDefinition(key, id = 'factory') {
  if (!keys.has(key) || typeof id !== 'string') return null;
  if (id === 'factory')
    return {
      id,
      weapon: key,
      name: 'FACTORY ORIGINAL',
      rarity: 'factory',
      price: 0,
      free: true,
      seed: 0,
      description: 'Oryginalne materiały producenta.',
    };
  const gold = id === 'gold' || id.endsWith('_gold');
  const base = id === 'gold' ? 'factory' : gold ? id.slice(0, -5) : id;
  const familyIndex = SKIN_FAMILIES.findIndex((skin) => skin.id === base);
  const template = SKIN_FAMILIES[familyIndex];
  if (!template && !(gold && base === 'factory')) return null;
  const mecha = base === 'sovereign' && isRifle(key);
  const family = template
    ? {
        ...template,
        ...(mecha
          ? {
              name: 'MECHA INDUSTRIES',
              namePl: 'PRZEMYSŁ MECHA',
              pattern: 'mecha',
              colors: ['#e7e8e4', '#343b40', '#d83e35'],
              roughness: 0.27,
              metalness: 0.68,
              description:
                'Ceramiczne panele w odcieniach bieli i stali, czerwone pasy serwisowe oraz techniczne oznaczenia. Wzór dopasowany do każdego modelu karabinu.',
            }
          : {}),
      }
    : null;
  const [weaponTheme, weaponAccent, weaponMotif] = themes[key];
  const theme = mecha ? 'MECHA INDUSTRIES' : weaponTheme;
  const accent = mecha ? '#d83e35' : weaponAccent;
  const motif = mecha ? 'chevron' : weaponMotif;
  const rarity = gold ? 'legendary' : family.rarity;
  const special = template?.rarity === 'special';
  return {
    ...(family || { pattern: 'engraved', colors: ['#87551d', '#f2d583', '#c69b44'] }),
    id,
    weapon: key,
    theme,
    accent,
    motif,
    gold,
    fullCoverage: special,
    smoothNormals: special && ['mirror', 'emerald'].includes(base) ? 1 : 0,
    roughnessVariation: special ? 0 : 0.1,
    signature: skinSeed(key, 'signature'),
    colors: family
      ? special
        ? [...family.colors]
        : mecha
          ? family.colors
          : family.colors.map((color, i) => tint(color, accent, i === 2 ? 0.6 : 0.28))
      : ['#87551d', '#f2d583', '#c69b44'],
    name: `${mecha || special ? family.name : `${theme} / ${family?.name || 'GOLD'}`}${gold && family ? ' · GOLD' : ''}`,
    rarity,
    price: SKIN_PRICES[rarity],
    free: false,
    requires: gold ? base : null,
    seed: skinSeed(key, base),
    roughness: gold
      ? base === 'matte' || base === 'blackmat'
        ? 0.68
        : base === 'mirror'
          ? 0.035
          : 0.16
      : family.roughness,
    metalness: gold ? 1 : family.metalness,
    description: gold
      ? 'Legendarne złocenie z polerowanymi krawędziami i grawerem tego modelu. GOLD kosztuje 1000 punktów; wariant wymaga bazowego skina.'
      : `${family.description} Dedykowany wzór: ${theme}.`,
  };
}
export const skinsForWeapon = (key) =>
  keys.has(key)
    ? [
        ...SKIN_CATALOG_FAMILIES.map((s) => skinDefinition(key, s.id)),
        skinDefinition(key, 'gold'),
        ...SKIN_CATALOG_FAMILIES.map((s) => skinDefinition(key, `${s.id}_gold`)),
      ]
    : [];
export function sanitizeSkinLoadout(raw) {
  const result = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  for (const { key } of SKIN_WEAPONS)
    if (
      Object.hasOwn(raw, key) &&
      typeof raw[key] === 'string' &&
      skinDefinition(key, raw[key]) &&
      raw[key] !== 'factory'
    )
      result[key] = raw[key];
  return result;
}
