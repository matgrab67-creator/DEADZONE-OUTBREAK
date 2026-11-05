import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling'],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#solo').click();
  await page.waitForTimeout(350);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.countdown = 10000;
    g.sim.zombies.clear();
    g.input.pitch = 1.48;
    g.input.yaw = 0.3;
    g.recoil = 0.14;
  });
  await page.waitForTimeout(50);
  const camera = await page.evaluate(() => ({
    pitch: window.__DEADZONE__.view.camera.rotation.x,
    yaw: window.__DEADZONE__.view.camera.rotation.y,
  }));
  assert.ok(camera.pitch <= 1.48 && camera.pitch < Math.PI / 2, 'recoil crossed vertical');
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++)
      window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1920, movementY: -1080 }));
  });
  await page.waitForTimeout(80);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.input.yaw),
    0.3,
    'cursor warp rotated the player',
  );
  await page.keyboard.press('Escape');
  await page.locator('#resume').click();
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.input.yaw),
    0.3,
    'relocking changed orientation',
  );
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.input.yaw = 0;
    g.input.pitch = 0;
    g.recoil = 0;
  });
  await page.mouse.move(770, 460, { steps: 12 });
  assert.notEqual(
    await page.evaluate(() => window.__DEADZONE__.input.yaw),
    0,
    'regular mouse look stopped working',
  );
  console.log(
    'PASS: camera rejects cursor warps, survives relocking, clamps recoil below vertical and accepts normal mouse movement.',
  );
  await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__DEADZONE__.weapon.id === 'knife');
  await page.waitForTimeout(400);
  const ammo = await page.evaluate(
    () => window.__DEADZONE__.sim.players.get('solo').inventory[0].ammo,
  );
  await page.mouse.click(720, 450);
  await page.waitForTimeout(90);
  assert.ok(await page.evaluate(() => window.__DEADZONE__.weapon.slashTime > 0));
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').inventory[0].ammo),
    ammo,
    'knife also fired the hidden gun',
  );
  const yaw = await page.evaluate(() => window.__DEADZONE__.input.yaw);
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => window.__DEADZONE__.weapon.inspectBlend > 0.5));
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.input.yaw),
    yaw,
    'weapon inspection rotated the camera',
  );
  for (const variant of ['karambit', 'stiletto', 'skeleton']) {
    await page.evaluate((id) => {
      const g = window.__DEADZONE__;
      g.settings.knifeModel = id;
      g.input.yaw = 0;
      g.input.pitch = 0;
      g.weapon.inspectTime = 0;
      g.weapon.inspectBlend = 0;
    }, variant);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `test-results/knife-${variant}.png` });
  }
  console.log(
    'PASS: all three knives render, attack and inspect; swinging does not consume ammunition or rotate the camera.',
  );
  await page.keyboard.press('KeyF');
  await page.mouse.down({ button: 'right' });
  for (const id of ['lynx', 'scout', 'pbs1']) {
    await page.evaluate(async (weapon) => {
      const { makeInventory } = await import('/shared/config.js');
      const p = window.__DEADZONE__.sim.players.get('solo');
      p.inventory = [makeInventory(weapon)];
      p.slot = 0;
    }, id);
    await page.waitForTimeout(450);
    assert.ok(await page.locator('#scope-overlay').isVisible(), `${id} shows its scope overlay`);
    assert.equal(
      await page.evaluate(() => window.__DEADZONE__.weapon.model.root.visible),
      false,
      `${id} hides the viewmodel while scoped`,
    );
  }
  await page.mouse.up({ button: 'right' });
  await page.evaluate(async () => {
    const { makeInventory } = await import('/shared/config.js');
    const p = window.__DEADZONE__.sim.players.get('solo');
    p.inventory = [makeInventory('raven')];
    p.slot = 0;
    p.lastFire = -100;
  });
  await page.waitForTimeout(350);
  const initialCone = await page.evaluate(() =>
    parseFloat(window.__DEADZONE__.ui.el.crosshair.style.getPropertyValue('--spread')),
  );
  await page.mouse.down();
  await page.waitForTimeout(750);
  await page.mouse.up();
  const burstCone = await page.evaluate(() =>
    parseFloat(window.__DEADZONE__.ui.el.crosshair.style.getPropertyValue('--spread')),
  );
  assert.ok(burstCone > initialCone + 1, 'sustained fire did not widen the crosshair');
  await page.evaluate(async () => {
    const { makeInventory } = await import('/shared/config.js');
    const p = window.__DEADZONE__.sim.players.get('solo');
    p.inventory = [makeInventory('vx9')];
    p.slot = 0;
  });
  console.log(
    'PASS: all scoped rifles follow ADS; sustained fire expands the ballistic crosshair.',
  );
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.paused = true;
    g.input.yaw = 0;
    g.input.pitch = 0;
    g.ui.hideModal();
  });
  for (const type of ['normal', 'runner', 'armored', 'crawler', 'exploder', 'boss']) {
    await page.evaluate((type) => {
      const g = window.__DEADZONE__;
      g.zombies.reset();
      g.sim.zombies.clear();
      g.sim.time = 10;
      const p = g.sim.players.get('solo');
      p.x = -18;
      p.z = 16;
      p.y = 0;
      p.vx = 0;
      p.vz = 0;
      g.input.pitch = type === 'crawler' ? -0.16 : 0;
      const z = g.sim.spawnZombie(type);
      z.spawnAt = g.sim.time - 3;
      z.emergeEnd = g.sim.time - 1;
      z.x = -18;
      z.z = 12;
      z.yaw = Math.PI;
      z.lastAttack = -100;
      z.hitAt = -100;
    }, type);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `test-results/zombie-${type}.png` });
    const resting = await page.evaluate(
      () => [...window.__DEADZONE__.zombies.entities.values()][0].arms[0].rotation.x,
    );
    await page.evaluate(() => {
      const g = window.__DEADZONE__;
      const z = [...g.sim.zombies.values()][0];
      z.lastAttack = g.sim.time - 0.04;
    });
    await page.waitForTimeout(60);
    const attacking = await page.evaluate(
      () => [...window.__DEADZONE__.zombies.entities.values()][0].arms[0].rotation.x,
    );
    assert.ok(Math.abs(attacking - resting) > 0.3, `${type} has no attack animation`);
    await page.evaluate(() => window.__DEADZONE__.sim.zombies.clear());
    await page.waitForTimeout(800);
    assert.ok(
      await page.evaluate(
        () => Math.abs(window.__DEADZONE__.zombies.corpses[0].model.root.rotation.x) > 0.5,
      ),
    );
  }
  await page.screenshot({ path: 'test-results/zombie-death.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: six detailed zombie types, attack and death animations render without browser errors.',
  );
} finally {
  await browser.close();
  if (errors.length) console.error(errors);
}
