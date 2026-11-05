import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';

// Tests the built files through the production HTTP + Socket.IO server.
const server = await createGameServer({ port: 0, host: '127.0.0.1' });
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.TEST_BROWSER || 'msedge',
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    localStorage.setItem('deadzone-settings', JSON.stringify({ language: 'en' }));
    if (!localStorage.getItem('deadzone-skin-progression-v2'))
      localStorage.setItem(
        'deadzone-skin-progression-v2',
        JSON.stringify({ balance: 250, owned: {}, receipts: { 'fixture-cleared-waves': 10 } }),
      );
  });
  const page = await context.newPage();
  const errors = [];
  const audioResponses = new Set();
  page.on('response', (r) => {
    if (/\/audio\/.*\.(mp3|opus)$/.test(r.url()) && r.status() === 200) audioResponses.add(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => typeof window.__DEADZONE__), 'undefined');
  await page.locator('#open-index').click();
  assert.equal(await page.locator('[data-profile^="weapon:"]').count(), 27);
  await page.locator('[data-profile="weapon:barrett"]').click();
  await page.waitForFunction(() => document.getElementById('index-canvas').width > 100);
  assert.equal(await page.locator('#detail-title').innerText(), 'BARRETT M82A1');
  assert.match(await page.locator('#detail-stats').innerText(), /650/);
  await page.locator('#detail-sound').click();
  await page.waitForTimeout(800);
  assert.equal(audioResponses.size, 9, 'all bundled recordings are served in production');
  await page.locator('#detail-back').click();
  assert.equal(await page.locator('[data-profile^="zombie:"]').count(), 13);
  await page.locator('[data-profile="zombie:spitter"]').click();
  assert.equal(await page.locator('#detail-title').innerText(), 'ACID SPITTER');
  assert.ok(await page.locator('#detail-sound').isHidden());
  await page.locator('#detail-back').click();
  await page.locator('#index-back').click();
  await page.locator('#open-skins').click();
  await page.locator('[data-skin="aurora"]').click();
  await page.locator('#skin-equip').click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('deadzone-skin-progression-v2')).balance,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('deadzone-skins-v1')).vx9),
    'aurora',
  );
  await page.locator('#index-back').click();
  await page.locator('#solo').click();
  await page.waitForTimeout(300);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  assert.ok(Number(await page.locator('#ammo').innerText()) < 14);
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  await page.locator('[data-category="supplies"]').click();
  await page.locator('[data-buy="armor"]').click();
  await page.waitForFunction(() => document.getElementById('points').textContent === '0');
  assert.match(await page.locator('#armor').innerText(), /100/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () =>
      document.pointerLockElement !== null &&
      document.getElementById('modal-backdrop').classList.contains('hidden'),
  );
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await page.locator('#multiplayer').click();
  await page.locator('#create-lobby').click();
  await page.locator('#lobby-room').waitFor({ state: 'visible' });
  assert.match(await page.locator('#room-code').innerText(), /^[A-F0-9]{6}$/);
  const code = await page.locator('#room-code').innerText();
  const peer = await page.context().newPage();
  peer.on('pageerror', (e) => errors.push(e.message));
  peer.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await peer.goto(`http://127.0.0.1:${server.port}`);
  await peer.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await peer.locator('#multiplayer').click();
  await peer.locator('#room-input').fill(code);
  await peer.locator('#join-lobby').click();
  await peer.locator('#lobby-room').waitFor({ state: 'visible' });
  await peer.locator('#ready').click();
  await page.locator('#ready').click();
  await page.locator('#start-match:enabled').click();
  await page.locator('#hud:not(.hidden)').waitFor();
  await peer.locator('#hud:not(.hidden)').waitFor();
  const sim = server.rooms.get(code).sim;
  sim.countdown = 10000;
  assert.equal(sim.forest.ring, 1);
  sim.expandForest(4);
  await page.waitForFunction(() =>
    document.getElementById('forest-status').textContent.includes('120'),
  );
  await peer.waitForFunction(() =>
    document.getElementById('forest-status').textContent.includes('120'),
  );
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.ok([...sim.players.values()].every((p) => p.skins.vx9 === 'aurora'));
  assert.equal(sim.players.size, 2);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: production index, paid skins, solo combat, shop and two co-op clients share the expanding forest and cosmetics; no debug API or browser errors.',
  );
} finally {
  await browser?.close();
  await server.close();
}
