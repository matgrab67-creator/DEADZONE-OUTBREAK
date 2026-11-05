import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKIN_WEAPONS,
  skinsForWeapon,
  skinDefinition,
  sanitizeSkinLoadout,
  SKIN_POINTS_PER_WAVE,
  SKIN_PRICES,
} from '../shared/Skins.js';
import { WEAPONS } from '../shared/config.js';
import {
  SkinInventory,
  SKIN_STORAGE_KEY,
  SKIN_PROGRESSION_KEY,
} from '../src/weapons/SkinInventory.js';
import { createWeaponModel, createKnifeModel } from '../src/weapons/WeaponModels.js';
import { disposeWeaponModel } from '../src/weapons/ModelBuilder.js';
import { Simulation } from '../shared/Simulation.js';
import { initPhysics } from '../shared/Physics.js';
import { translateText } from '../src/ui/Localization.js';

before(async () => await initPhysics());
test('all 30 models have 8 rare, 4 epic, 2 mythic, 4 special finishes, 19 GOLD variants and a free factory finish', () => {
  assert.equal(SKIN_WEAPONS.length, 30);
  const identities = new Set();
  for (const { key } of SKIN_WEAPONS) {
    const skins = skinsForWeapon(key);
    assert.equal(skins.length, 37);
    assert.deepEqual(
      ['mythic', 'epic', 'rare', 'special', 'legendary'].map(
        (r) => skins.filter((s) => s.rarity === r).length,
      ),
      [2, 4, 8, 4, 19],
    );
    assert.equal(
      new Set(skins.filter((skin) => skin.rarity !== 'legendary').map((skin) => skin.pattern)).size,
      18,
      `${key} should have eighteen distinct base designs`,
    );
    for (const s of skins) {
      assert.equal(s.price, SKIN_PRICES[s.rarity]);
      assert.equal(s.free, false);
      if (s.gold) assert.equal(s.price, 1000);
      identities.add(`${s.weapon}/${s.id}`);
    }
    assert.equal(skinDefinition(key, 'factory').price, 0);
  }
  assert.equal(identities.size, 1110);
  assert.equal(new Set(SKIN_WEAPONS.map((w) => skinDefinition(w.key, 'sovereign').seed)).size, 30);
  assert.equal(new Set(SKIN_WEAPONS.map((w) => skinDefinition(w.key, 'arctic').name)).size, 30);
  assert.equal(
    new Set(SKIN_WEAPONS.map((w) => skinDefinition(w.key, 'arctic').colors.join(','))).size,
    30,
  );
  const rifles = Object.entries(WEAPONS)
    .filter(
      ([, weapon]) =>
        /RIFLE/.test(weapon.type) && !/PRECISION|SNIPER|ANTI-MATERIEL/.test(weapon.type),
    )
    .map(([key]) => key);
  for (const key of rifles) {
    const mythic = skinDefinition(key, 'sovereign');
    assert.equal(mythic.name, 'MECHA INDUSTRIES');
    assert.equal(mythic.pattern, 'mecha');
    assert.deepEqual(mythic.colors, ['#e7e8e4', '#343b40', '#d83e35']);
  }
});
test('special finishes use physical metal / matte properties and finish names translate to Polish and back', () => {
  assert.equal(translateText('ASSAULT RIFLE', 'pl'), 'KARABINEK SZTURMOWY');
  assert.equal(translateText('FINISHES', 'pl'), 'WYKOŃCZEŃ');
  for (const { key } of SKIN_WEAPONS) {
    const silver = skinDefinition(key, 'mirror'),
      black = skinDefinition(key, 'blackmat');
    assert.equal(silver.metalness, 1);
    assert.ok(silver.roughness < 0.03);
    assert.equal(black.metalness, 0);
    assert.ok(black.roughness > 0.9);
    assert.deepEqual(silver.colors, ['#dce1e5', '#dce1e5', '#dce1e5']);
    assert.deepEqual(black.colors, ['#101113', '#101113', '#101113']);
    for (const id of ['mirror', 'crimsonweb', 'emerald', 'blackmat']) {
      const skin = skinDefinition(key, id);
      assert.equal(skin.fullCoverage, true);
      assert.equal(skin.price, 800);
      assert.equal(skinDefinition(key, `${id}_gold`).price, 1000);
      assert.notEqual(translateText(skin.name, 'pl'), skin.name);
    }
    for (const skin of skinsForWeapon(key).filter((s) => !s.gold)) {
      const plName = translateText(skin.name, 'pl');
      if (skin.name !== 'MECHA INDUSTRIES') assert.notEqual(plName, skin.name);
      assert.equal(translateText(plName, 'en'), skin.name);
      assert.notEqual(translateText(skin.description, 'en'), skin.description);
    }
  }
});
test('skin selection persists independently, factory restores defaults, invalid storage cannot inject cosmetics', () => {
  const values = new Map(),
    storage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) };
  const inv = new SkinInventory(storage);
  assert.equal(inv.equip('raven', 'sovereign'), false);
  inv.rewardMatch('fixture', 34);
  assert.ok(inv.buy('raven', 'sovereign'));
  assert.ok(inv.buy('knife:stiletto', 'aurora'));
  assert.equal(inv.equip('raven', 'sovereign'), true);
  assert.equal(inv.equip('knife:stiletto', 'aurora'), true);
  const loaded = new SkinInventory(storage);
  assert.equal(loaded.balance, 0);
  assert.equal(loaded.equipped('raven'), 'sovereign');
  assert.equal(loaded.equipped('knife:stiletto'), 'aurora');
  assert.equal(loaded.equipped('glock17'), 'factory');
  assert.equal(loaded.equip('raven', 'paid_admin_skin'), false);
  assert.equal(loaded.equip('../bad', 'ronin'), false);
  loaded.equip('raven', 'factory');
  assert.equal(new SkinInventory(storage).equipped('raven'), 'factory');
  values.set(SKIN_STORAGE_KEY, '{broken');
  assert.deepEqual(new SkinInventory(storage).loadout, {});
  assert.deepEqual(
    sanitizeSkinLoadout({
      raven: 'aurora',
      damage: 999,
      vx9: 'unknown',
      'knife:karambit': 'ronin',
    }),
    { raven: 'aurora', 'knife:karambit': 'ronin' },
  );
  const blocked = new SkinInventory({
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  });
  blocked.rewardMatch('fixture', 4);
  assert.equal(blocked.buy('mp5', 'arctic'), true);
  assert.equal(blocked.equip('mp5', 'arctic'), true);
  assert.equal(blocked.equipped('mp5'), 'arctic');
});
test('match rewards persist once per cleared wave; GOLD is 1000 points plus its base skin, with no double purchases', () => {
  const values = new Map(),
    storage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) };
  const inv = new SkinInventory(storage);
  assert.equal(inv.rewardMatch('run', 39), 39 * SKIN_POINTS_PER_WAVE);
  assert.equal(inv.buy('raven', 'gold'), false);
  assert.equal(inv.rewardMatch('run', 40), 25);
  assert.equal(inv.rewardMatch('run', 40), 0);
  assert.equal(inv.buy('raven', 'aurora_gold'), false, 'gold variant requires base finish');
  assert.equal(inv.buy('raven', 'gold'), true);
  assert.equal(inv.balance, 0);
  assert.equal(inv.buy('raven', 'gold'), false);
  assert.equal(inv.equip('raven', 'gold'), true);
  const restored = new SkinInventory(storage);
  assert.equal(restored.equipped('raven'), 'gold');
  assert.equal(restored.rewardMatch('run', 40), 0);
  assert.equal(restored.rewardMatch('run', 38), 0);
  assert.equal(restored.rewardMatch('invalid', NaN), 0);
  assert.equal(restored.rewardMatch('invalid', -1), 0);
  assert.equal(restored.rewardMatch('invalid', 1.5), 0);
  restored.rewardMatch('next-run', 50);
  assert.ok(restored.buy('raven', 'aurora'));
  assert.ok(restored.buy('raven', 'aurora_gold'));
  assert.equal(restored.balance, 0);
  assert.equal(restored.has('glock17', 'gold'), false, 'purchases belong to one weapon');
  values.delete(SKIN_PROGRESSION_KEY);
  assert.equal(
    new SkinInventory(storage).equipped('raven'),
    'factory',
    'old free loadouts do not bypass paid ownership',
  );
});
test('all model paint masks preserve hands, actual knife holes and non-painted glass / mechanics', () => {
  for (const w of SKIN_WEAPONS) {
    const m = w.kind === 'knife' ? createKnifeModel(w.id) : createWeaponModel(w.id);
    assert.ok(m.skinSurface.materials.length > 0, w.key);
    let painted = 0;
    m.root.traverse((o) => {
      if (o.isMesh) {
        const a = o.geometry.attributes;
        assert.equal(a.skinPosition.count, a.position.count);
        assert.equal(a.skinNormal.count, a.position.count);
        assert.equal(a.skinMask.count, a.position.count);
        assert.equal(a.skinFullMask.count, a.position.count);
        for (const v of a.skinMask.array) if (v > 0) painted++;
      }
    });
    assert.ok(painted > 100, w.key);
    for (const name of ['rightHand', 'supportHand'])
      m.parts[name]?.traverse((o) => {
        if (o.isMesh)
          assert.ok(
            o.geometry.attributes.skinMask.array.every((v) => v === 0),
            `${w.key} painted a hand`,
          );
        if (o.isMesh)
          assert.ok(
            o.geometry.attributes.skinFullMask.array.every((v) => v === 0),
            `${w.key} special finish painted a hand`,
          );
      });
    assert.ok(m.skinSurface.size.toArray().every((v) => Number.isFinite(v) && v > 0));
    assert.equal(m.skinId, 'factory');
    disposeWeaponModel(m);
  }
});
test('cosmetic messages cannot modify combat credits or bypass weapon blueprints, and survive a chapter', (t) => {
  const sim = new Simulation(),
    p = sim.addPlayer('p');
  t.after(() => sim.dispose());
  const before = {
    points: p.points,
    hp: p.hp,
    inventory: structuredClone(p.inventory),
    unlocked: [...p.unlockedWeapons],
  };
  assert.ok(
    sim.action('p', {
      type: 'skins',
      loadout: { barrett: 'sovereign', vx9: 'ronin', 'knife:skeleton': 'aurora', armor: 999 },
      knife: 'skeleton',
      points: 999999,
      damage: 999999,
    }),
  );
  assert.equal(p.points, before.points);
  assert.equal(p.hp, before.hp);
  assert.deepEqual(p.inventory, before.inventory);
  assert.deepEqual(p.unlockedWeapons, before.unlocked);
  assert.equal(sim.action('p', { type: 'shopBuy', item: 'weapon:barrett' }), false);
  assert.equal(p.skinKnife, 'skeleton');
  const snapshot = sim.snapshot();
  snapshot.players[0].skins.vx9 = 'factory';
  assert.equal(p.skins.vx9, 'ronin');
  sim.advanceChapter();
  assert.equal(p.skins.barrett, 'sovereign');
});
