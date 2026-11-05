import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
});
try {
  const page = await browser.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#developer-console').waitFor({ state: 'attached' });
  assert.ok(await page.locator('#developer-console').isHidden());

  const toggleConsole = async () => {
    await page.keyboard.down('Control');
    await page.keyboard.press('/');
    await page.keyboard.up('Control');
  };
  await toggleConsole();
  await page.locator('#developer-console input').fill('skinpoints 250');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.balance), 250);
  assert.match(await page.locator('#developer-console pre').innerText(), /Added 250 skin points/);
  await toggleConsole();
  assert.ok(await page.locator('#developer-console').isHidden());

  await page.locator('#solo').click();
  await page.waitForFunction(() => window.__DEADZONE__.mode === 'solo');
  const initialCredits = await page.evaluate(
    () => window.__DEADZONE__.sim.players.get('solo').points,
  );
  await toggleConsole();
  await page.locator('#developer-console input').fill('points 125');
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points),
    initialCredits + 125,
  );
  await page.locator('#developer-console input').fill('money infinite');
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points),
    1_000_000_000,
  );
  assert.equal(await page.evaluate(() => window.__DEADZONE__.devInfiniteMoney), true);
  await toggleConsole();
  await page.waitForSelector('#pause-modal:not(.hidden)');
  await toggleConsole();
  await page.locator('#developer-console input').fill('money off');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__DEADZONE__.devInfiniteMoney), false);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Ctrl+/ opens a hidden localhost dev console; local skin/game credits work in solo only.',
  );
} finally {
  await browser.close();
}
