import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { SKIN_WEAPONS, skinsForWeapon } from '../shared/Skins.js';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-skins').click();
  await page.locator('#skin-spin').click();
  assert.equal(await page.locator('#skin-weapon option').count(), 30);
  assert.equal(await page.locator('[data-rarity="mythic"]').count(), 1);
  assert.equal(await page.locator('[data-rarity="epic"]').count(), 1);
  assert.equal(await page.locator('[data-rarity="rare"]').count(), 2);
  assert.equal(await page.locator('[data-rarity="special"]').count(), 1);
  assert.equal(await page.locator('[data-rarity="legendary"]').count(), 6);
  await page.locator('[data-skin-rarity="special"]').click();
  assert.equal(await page.locator('.skin-card:not(.hidden)').count(), 1);
  await page.locator('[data-skin="crimsonweb"]').click();
  await page.waitForFunction(
    () => document.getElementById('skin-name').textContent.includes('KARMAZYNOWA SIEĆ'),
  );
  await page.locator('[data-skin-rarity="all"]').click();
  await page.locator('[data-skin="aurora"]').click();
  assert.ok(await page.locator('#skin-equip').isDisabled());
  let checked = 0;
  for (const weapon of SKIN_WEAPONS) {
    const hashes = await page.evaluate(
      ({ key, finishes }) => {
        const g = window.__DEADZONE__,
          select = document.getElementById('skin-weapon');
        select.value = key;
        select.dispatchEvent(new Event('change'));
        const preview = g.preview;
        preview.autoRotate = false;
        preview.turntable.rotation.y = -0.6;
        const hash = () => {
          preview.update(0);
          const gl = preview.renderer.getContext(),
            w = gl.drawingBufferWidth,
            h = gl.drawingBufferHeight;
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let n = 2166136261,
            visible = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 20) visible++;
            n = Math.imul(n ^ pixels[i], 16777619);
            n = Math.imul(n ^ pixels[i + 1], 16777619);
          }
          if (visible < 100) throw new Error(`Invisible model: ${key}`);
          return n >>> 0;
        };
        const base = hash(),
          result = [];
        for (const id of finishes) {
          document.querySelector(`[data-skin="${id}"]`).click();
          result.push(hash());
          if (preview.model.skinId !== id) throw new Error('Skin did not apply');
        }
        document.querySelector('[data-skin="factory"]').click();
        const factory = hash();
        return { base, factory, variants: result, equipped: g.skins.equipped(key) };
      },
      { key: weapon.key, finishes: skinsForWeapon(weapon.key).map((s) => s.id) },
    );
    assert.equal(
      new Set(hashes.variants).size,
      skinsForWeapon(weapon.key).length,
      `${weapon.key}: all paid finishes must actually look different`,
    );
    assert.ok(hashes.variants.every((h) => h !== hashes.base));
    assert.equal(hashes.equipped, 'factory', 'preview never grants ownership');
    checked += skinsForWeapon(weapon.key).length;
    if (checked % 55 === 0) console.log(`Rendered ${checked}/330 finishes`);
  }
  assert.equal(checked, 330);
  await page.locator('#skin-weapon').selectOption('raven');
  await page.locator('[data-skin-rarity="special"]').click();
  await page.locator('[data-skin="crimsonweb"]').click();
  const properties = await page.evaluate(() => {
    const m = window.__DEADZONE__.preview.model;
    return {
      full: m.skinSurface.materials.every(
        (mat) => mat.userData.coating.dzSkinFullCoverage.value === 1,
      ),
    };
  });
  assert.ok(properties.full);
  await page.screenshot({ path: 'test-results/special-crimsonweb.png' });
  await page.locator('[data-skin-rarity="all"]').click();
  await page.evaluate(() => window.__DEADZONE__.skins.rewardMatch('skin-render-fixture', 150));
  await page.locator('#skin-weapon').selectOption('raven');
  await page.locator('[data-skin="sovereign"]').click();
  await page.locator('#skin-equip').click();
  await page.locator('[data-skin="sovereign_gold"]').click();
  await page.locator('#skin-equip').click();
  await page.screenshot({ path: 'test-results/skins-armory.png' });
  await page.reload();
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => Object.keys(window.__DEADZONE__.skins.loadout).length), 1);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.skins.equipped('raven')),
    'sovereign_gold',
  );
  await page.locator('#solo').click();
  await page.waitForTimeout(400);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  const before = await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.countdown = 10000;
    return { points: g.sim.players.get('solo').points, uuid: g.weapon.model.root.uuid };
  });
  await page.keyboard.press('KeyN');
  await page.locator('#skin-modal:not(.hidden)').waitFor();
  await page.locator('[data-skin="aurora"]').click();
  await page.locator('#skin-equip').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  await page.waitForFunction(() => window.__DEADZONE__.weapon.model.skinId === 'aurora');
  const after = await page.evaluate(() => {
    const g = window.__DEADZONE__;
    return { points: g.sim.players.get('solo').points, uuid: g.weapon.model.root.uuid };
  });
  assert.deepEqual(after, before, 'equipping changes no currency, stats or rig');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyN');
  await page.locator('#skin-weapon').selectOption('knife:karambit');
  await page.locator('[data-skin="sovereign"]').click();
  await page.locator('#skin-equip').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__DEADZONE__.weapon.model.skinId === 'sovereign');
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/skin-knife-in-forest.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: 330 finishes rendered on 30 models; five personalized non-legendary designs, Mecha Industries rifle mythics, GOLD, purchases, persistence and live rigs.',
  );
} finally {
  await browser.close();
}
