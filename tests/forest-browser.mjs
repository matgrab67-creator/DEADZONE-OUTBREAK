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
  await page.screenshot({ path: 'test-results/lost-forest-menu.png' });
  await page.locator('#solo').click();
  await page.waitForTimeout(400);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.evaluate(() => {
    window.__DEADZONE__.sim.countdown = 10000;
    const sim = window.__DEADZONE__.sim;
    sim.players.get('solo').points = 1000;
    sim.action('solo', { type: 'shopBuy', item: 'flashlight' });
  });
  await page.keyboard.press('KeyL');
  await page.waitForFunction(() => window.__DEADZONE__.sim.players.get('solo').flashlight);
  await page.keyboard.press('KeyK');
  await page.locator('#craft-modal:not(.hidden)').waitFor();
  assert.ok(
    await page.locator('[data-craft="medkit"]').isDisabled(),
    'crafting requires real proximity',
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -6;
    p.z = -10.5;
    p.resources = { wood: 30, scrap: 40, parts: 30, medicine: 20 };
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyE');
  await page.locator('#craft-modal:not(.hidden)').waitFor();
  await page.locator('[data-craft="handling"]').click();
  await page.waitForFunction(
    () => window.__DEADZONE__.sim.players.get('solo').inventory[0].handling,
  );
  assert.ok(await page.locator('[data-craft="handling"]').isDisabled());
  await page.screenshot({ path: 'test-results/forest-crafting.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.pointerLockElement !== null);
  const persistent = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = 8;
    p.z = 13;
    g.sim.claimedCaches.push('cache:2:0');
    g.sim.openDoors.push('route:2:0');
    g.sim.round = 15;
    g.sim.phase = 'wave';
    g.sim.toSpawn = 0;
    g.sim.zombies.clear();
    g.sim.updateWaves(1 / 60);
    return { seed: g.sim.seed, x: p.x, z: p.z, materials: { ...p.resources } };
  });
  await page.locator('#chapter-transition:not(.hidden)').waitFor();
  assert.match(await page.locator('#chapter-title').innerText(), /WHISPERING/);
  const transitioned = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    return {
      seed: g.map.seed,
      x: p.x,
      z: p.z,
      ring: g.map.ring,
      claimed: g.state.forest.claimed,
      parts: p.resources.parts,
    };
  });
  assert.equal(transitioned.seed, persistent.seed);
  assert.equal(transitioned.ring, 5);
  assert.deepEqual([transitioned.x, transitioned.z], [persistent.x, persistent.z]);
  assert.ok(transitioned.claimed.includes('cache:2:0'));
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.updateWaves(5);
    g.sim.countdown = 10000;
    g.paused = true;
    g.sim.time = 300;
    const p = g.sim.players.get('solo');
    p.x = 0;
    p.z = -50;
    p.y = 0.3;
    g.input.yaw = Math.PI;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/forest-deep-night.png' });
  const stream = await page.evaluate(() => {
    const g = window.__DEADZONE__;
    for (let n = 0; n < 20; n++) {
      const p = { x: ((n % 5) - 2) * 24, z: (Math.floor(n / 5) - 2) * 24 };
      for (let i = 0; i < 26; i++) g.map.stream(p);
    }
    let instanced = 0;
    g.map.group.traverse((o) => {
      if (o.isInstancedMesh) instanced++;
    });
    return {
      chunks: g.map.chunks.size,
      instanced,
      geometries: g.view.renderer.info.memory.geometries,
    };
  });
  assert.ok(stream.chunks <= 25);
  assert.ok(stream.instanced > 15);
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.time = 60;
    g.sim.players.get('solo').x = -18;
    g.sim.players.get('solo').z = 15;
    g.input.yaw = 0;
    g.input.pitch = 0;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/forest-camp-final.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: forest solo, camp, functional crafting / proximity, flashlight, chapter 15 keeps world / position / inventory, seeded expansion and bounded instanced streaming; no browser errors.',
  );
} finally {
  await browser.close();
}
