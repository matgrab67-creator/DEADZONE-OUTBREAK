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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => typeof window.__DEADZONE__), 'undefined');
  await page.locator('#solo').click();
  await page.waitForTimeout(300);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  assert.ok(Number(await page.locator('#ammo').innerText()) < 14);
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await page.locator('#multiplayer').click();
  await page.locator('#create-lobby').click();
  await page.locator('#lobby-room').waitFor({ state: 'visible' });
  assert.match(await page.locator('#room-code').innerText(), /^[A-F0-9]{6}$/);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: production build serves, solo fires, private lobby connects, development debug API is absent, no browser errors.',
  );
} finally {
  await browser?.close();
  await server.close();
}
