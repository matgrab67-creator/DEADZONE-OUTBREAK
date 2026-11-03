import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-index').click();
  for (const [kind, id, name] of [
    ['weapon', 'vx9', 'VX-9'],
    ['zombie', 'boss', 'THE EXPERIMENT'],
    ['knife', 'stiletto', 'STILETTO'],
  ]) {
    await page.locator(`[data-profile="${kind}:${id}"]`).click();
    await page.waitForFunction(() => window.__DEADZONE__.preview?.active);
    assert.equal(await page.locator('#detail-title').innerText(), name);
    const start = await page.evaluate(() => window.__DEADZONE__.preview.turntable.rotation.y);
    await page.waitForTimeout(400);
    const preview = await page.evaluate(() => ({
      angle: window.__DEADZONE__.preview.turntable.rotation.y,
      pivot: window.__DEADZONE__.preview.turntable.position.toArray(),
      width: document.getElementById('index-canvas').width,
    }));
    assert.notEqual(preview.angle, start);
    assert.deepEqual(preview.pivot, [0, 0, 0]);
    assert.ok(preview.width > 200);
    await page.screenshot({ path: `test-results/index-${kind}.png` });
    await page.locator('#detail-back').click();
    assert.equal(await page.evaluate(() => window.__DEADZONE__.preview.active), false);
  }
  console.log(
    'PASS: clicking firearms, mobs and knives opens a description and 3D model rotating around its centred axis.',
  );
  await page.locator('#index-back').click();
  await page.locator('#solo').click();
  await page.waitForTimeout(350);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.countdown = 10000;
    g.ui.roundTimer = 0;
  });
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(450);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.weapon.model.parts.supportHand === undefined),
    true,
  );
  const grip = await page.evaluate(() => {
    const m = window.__DEADZONE__.weapon.model;
    return [
      m.parts.rightHand.position.toArray(),
      m.parts.rightHand.rotation.toArray(),
      m.parts.knifeRig.rotation.toArray(),
    ];
  });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.evaluate(() => {
      const m = window.__DEADZONE__.weapon.model;
      return [
        m.parts.rightHand.position.toArray(),
        m.parts.rightHand.rotation.toArray(),
        m.parts.knifeRig.rotation.toArray(),
      ];
    }),
    grip,
  );
  await page.screenshot({ path: 'test-results/knife-single-hand.png' });
  await page.keyboard.press('KeyF');
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  assert.equal(await page.evaluate(() => document.pointerLockElement), null);
  assert.ok(await page.locator('[data-buy="weapon:raven"]').isDisabled());
  assert.match(await page.locator('[data-item="weapon:raven"]').innerText(), /BLUEPRINT LOCKED/);
  const pbsCard = page.locator('[data-item="weapon:pbs1"]');
  await page.evaluate(() => {
    window.__DEADZONE__.sim.players.get('solo').points = 1680;
  });
  await page.waitForTimeout(60);
  assert.equal(await page.locator('[data-buy="weapon:pbs1"]').innerText(), 'BUY BLUEPRINT');
  assert.match(await pbsCard.innerText(), /1,?680 PTS \/ BLUEPRINT/);
  await page.locator('[data-buy="weapon:pbs1"]').click();
  await page.waitForFunction(() =>
    window.__DEADZONE__.sim.players.get('solo').unlockedWeapons.includes('pbs1'),
  );
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 0);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').inventory[0].id),
    'vx9',
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-item="weapon:pbs1"] .shop-card-footer strong')
        .textContent.replace(/[,\s]/g, '') === '2400PTS',
  );
  assert.match(await pbsCard.innerText(), /2,?400 PTS/);
  const paused = await page.evaluate(() => window.__DEADZONE__.sim.time);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.time), paused);
  await page.keyboard.press('KeyB');
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  await page.evaluate(() => {
    const p = window.__DEADZONE__.sim.players.get('solo');
    p.x = -11.2;
    p.z = 16;
    p.points = 3000;
  });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyE');
  assert.ok(
    await page.evaluate(() =>
      window.__DEADZONE__.sim.players.get('solo').unlockedWeapons.includes('raven'),
    ),
  );
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 3000);
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  await page.locator('[data-buy="weapon:raven"]').click();
  await page.waitForFunction(() =>
    window.__DEADZONE__.sim.players.get('solo').inventory.some((i) => i.id === 'raven'),
  );
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 2000);
  await page.locator('[data-category="supplies"]').click();
  await page.locator('[data-buy="armor"]').click();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').armor), 100);
  await page.evaluate(() => {
    const p = window.__DEADZONE__.sim.players.get('solo');
    p.hp = 35;
    p.inventory[p.slot].reserve = 0;
  });
  await page.waitForTimeout(50);
  await page.locator('[data-buy="health"]').click();
  await page.locator('[data-buy="ammo"]').click();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 900);
  assert.ok(await page.locator('[data-buy="health"]').isDisabled());
  assert.ok(await page.locator('[data-buy="armor"]').isDisabled());
  await page.screenshot({ path: 'test-results/shop.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => document.pointerLockElement !== null && !window.__DEADZONE__.paused,
  );
  console.log(
    'PASS: one stable knife hand; B opens/closes shop; stations unlock blueprints; purchases charge the correct prices during solo pause.',
  );
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/shop-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: responsive shop without horizontal overflow; no browser errors.');
} finally {
  await browser.close();
}
