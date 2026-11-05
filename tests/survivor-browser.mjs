import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SURVIVOR_ARSENAL } from '../shared/SurvivorArsenal.js';
import { mkdir } from 'node:fs/promises';
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
  assert.match(await page.locator('#solo').innerText(), /GRAJ SOLO/);
  await page.locator('#settings-top').click();
  await page.locator('#language').selectOption('en');
  await page.waitForFunction(() =>
    document.getElementById('solo').textContent.includes('DEPLOY SOLO'),
  );
  assert.equal(await page.locator('#settings-modal h2').innerText(), 'SETTINGS');
  await page.locator('#settings-done').click();
  await page.reload();
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  await page.locator('#open-index').click();
  assert.equal(await page.locator('[data-profile^="weapon:"]').count(), 27);
  for (const id of Object.keys(SURVIVOR_ARSENAL)) {
    await page.locator(`[data-profile="weapon:${id}"]`).click();
    assert.equal(await page.locator('#detail-title').innerText(), SURVIVOR_ARSENAL[id].name);
    await page.locator('#detail-sound').click();
    await page.waitForFunction(() => window.__DEADZONE__.audio.weaponAudio?.shots.size === 27);
    if (['vector', 'benelli', 'axmc'].includes(id))
      await page.locator('#index-canvas').screenshot({ path: `test-results/new-${id}.png` });
    await page.locator('#detail-back').click();
  }
  await page.locator('[data-profile="zombie:normal"]').click();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.preview.model.referenceModel), true);
  await page.screenshot({ path: 'test-results/zombie-reference.png' });
  await page.locator('#index-back').click();
  await page.locator('#open-training').click();
  await page.waitForTimeout(400);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  for (const id of Object.keys(SURVIVOR_ARSENAL)) {
    await page.keyboard.press('KeyP');
    await page.locator('#training-modal:not(.hidden)').waitFor();
    await page.locator('#training-weapon').selectOption(id);
    await page.locator('#training-drill').selectOption('tracking');
    await page.locator('#training-start').click();
    await page.waitForFunction(
      () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
    );
    await page.waitForFunction((id) => window.__DEADZONE__.weapon.id === id, id);
    await page.mouse.click(700, 480);
    await page.waitForFunction(
      ({ id, ammo }) => window.__DEADZONE__.sim.players.get('solo').inventory[0].ammo === ammo,
      { id, ammo: SURVIVOR_ARSENAL[id].magazine - 1 },
    );
    assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 0);
  }
  await page.screenshot({ path: 'test-results/training-new-weapons.png' });
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await page.locator('#solo').click();
  await page.waitForTimeout(400);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.countdown = 10000;
    const p = g.sim.players.get('solo');
    p.points = 100000;
  });
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  assert.ok(await page.locator('[data-buy="weapon:barrett"]').isDisabled());
  assert.match(
    await page.locator('[data-item="weapon:barrett"]').innerText(),
    /BLUEPRINT IN CACHE/,
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  await page.keyboard.press('KeyM');
  await page.locator('#map-modal:not(.hidden)').waitFor();
  await page.locator('#tactical-canvas').click({ position: { x: 290, y: 240 } });
  await page.waitForFunction(() => window.__DEADZONE__.state.pings.length === 1);
  await page.screenshot({ path: 'test-results/survivor-tactical-map.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  await page.evaluate(() => {
    const p = window.__DEADZONE__.sim.players.get('solo');
    p.x = -12;
    p.z = -2.8;
    p.vx = p.vz = 0;
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__DEADZONE__.state.contract?.kind === 'defend');
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -14;
    p.z = -8.05;
    p.resources = { wood: 100, scrap: 100, parts: 100, medicine: 100 };
    g.sim.time += 1;
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__DEADZONE__.state.campLevels.workshop === 1);
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -18;
    p.z = 15;
    p.vx = p.vz = 0;
    g.input.yaw = 0;
    g.input.pitch = -0.2;
    const z = g.sim.spawnZombie('normal');
    Object.assign(z, { x: -18, z: 12, groundY: 0, emergeEnd: 0 });
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.damageZombie([...g.sim.zombies.values()][0], 999, g.sim.players.get('solo'), true);
  });
  await page.waitForTimeout(1600);
  const corpse = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      m = g.zombies.corpses[0].model;
    return {
      physical: m.ragdoll,
      headY: m.head.getWorldPosition(m.head.position.clone()).y,
      active: g.zombies.ragdolls.active.size,
    };
  });
  assert.ok(corpse.physical);
  assert.ok(corpse.headY < 1);
  await page.screenshot({ path: 'test-results/reference-ragdoll.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: PL/EN persistence, ten real firearm models and sounds, every gun fires on the training range, special blueprint gating, tactical team markers, contracts, camp upgrades and physical reference-zombie death.',
  );
} finally {
  await browser.close();
}
