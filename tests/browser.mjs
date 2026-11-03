import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Run with `npm run dev` and `npm run server` already running.
const url = process.env.TEST_URL || 'http://127.0.0.1:5173';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const errors = [];
const watch = (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
};
const waitReady = async (page) => {
  await page.goto(url);
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
    page = await context.newPage();
  watch(page);
  await waitReady(page);
  await page.screenshot({ path: 'test-results/menu.png' });
  assert.equal(await page.title(), 'DEADZONE: OUTBREAK');
  await page.locator('#settings-top').click();
  await page.locator('#quality').selectOption('medium');
  await page.locator('#knifeModel').selectOption('skeleton');
  await page.locator('#settings-done').click();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('deadzone-settings')).knifeModel),
    'skeleton',
  );
  await page.locator('#how').click();
  assert.ok(await page.locator('#how-modal').isVisible());
  await page.locator('#how-modal .modal-close').click();
  await page.locator('#open-index').click();
  assert.match(
    await page.locator('#index-counts').innerText(),
    /0 \/ 6 THREATS\s+·\s+1 \/ 10 WEAPONS/,
  );
  assert.equal(
    await page.locator('#weapon-index .index-card:not(.undiscovered) h4').innerText(),
    'VX-9',
  );
  await page.setViewportSize({ width: 1440, height: 600 });
  const indexScroll = page.locator('#index-panel .index-content');
  await page.waitForTimeout(100);
  const indexDimensions = await indexScroll.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  assert.ok(
    indexDimensions.scrollHeight > indexDimensions.clientHeight,
    'the complete field index should scroll within the menu',
  );
  await page.mouse.move(900, 520);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(100);
  assert.ok(await indexScroll.evaluate((element) => element.scrollTop > 0));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
    'the complete field index should scroll with the page on mobile',
  );
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => window.scrollY > 0));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#index-back').click();
  await page.locator('#solo').click();
  await page.waitForFunction(() => window.__DEADZONE__?.mode === 'solo');
  await page.waitForTimeout(400);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__DEADZONE__.weapon.id === 'knife');
  assert.equal(await page.evaluate(() => window.__DEADZONE__.weapon.variant), 'skeleton');
  for (const knife of ['karambit', 'stiletto', 'skeleton']) {
    await page.evaluate((id) => {
      const game = window.__DEADZONE__;
      game.settings.knifeModel = id;
      game.weapon.update(
        game.sim.players.get('solo'),
        game.input.sample(true),
        1 / 60,
        game.sim.time,
        game.settings,
        true,
      );
    }, knife);
    assert.equal(await page.evaluate(() => window.__DEADZONE__.weapon.variant), knife);
  }
  await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__DEADZONE__.weapon.id === 'vx9');
  const position = await page.evaluate(() => ({ ...window.__DEADZONE__.sim.players.get('solo') }));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').z);
  assert.ok(moved < position.z - 0.7, `WASD did not move: ${moved}`);
  await page.mouse.move(820, 430, { steps: 12 });
  const yaw = await page.evaluate(() => window.__DEADZONE__.input.yaw);
  assert.notEqual(yaw, 0, 'mouse look');
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -18;
    p.z = 15;
    p.y = 0;
    p.vx = 0;
    p.vz = 0;
    g.input.yaw = 0;
    g.input.pitch = 0;
    g.sim.zombies.clear();
    g.sim.countdown = 100;
    const z = g.sim.spawnZombie('normal');
    z.x = -18;
    z.z = 12;
    z.hp = 60;
  });
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  const combat = await page.evaluate(() => {
    const p = window.__DEADZONE__.sim.players.get('solo');
    return { kills: p.kills, ammo: p.inventory[0].ammo, points: p.points };
  });
  assert.ok(combat.kills >= 1, JSON.stringify(combat));
  assert.ok(combat.ammo < 14);
  assert.ok(combat.points > 500);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(1700);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').inventory[0].ammo),
    14,
  );
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -10.8;
    p.z = 10;
    p.points = 1000;
    g.input.yaw = -Math.PI / 2;
  });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyE');
  assert.ok(await page.evaluate(() => window.__DEADZONE__.sim.openDoors.includes('d1')));
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -18;
    p.z = 15;
    p.points = 2000;
    g.input.yaw = 0;
    g.sim.countdown = 1;
  });
  await page.waitForTimeout(1700);
  await page.screenshot({ path: 'test-results/gameplay.png' });
  // Exercise every procedural weapon model and the late-game room geometry.
  for (const weapon of [
    'raven',
    'spectre',
    'vortex',
    'iron',
    'lynx',
    'vx9',
    'desertEagle',
    'tec9',
    'scout',
    'pbs1',
  ]) {
    await page.evaluate(async (id) => {
      const { makeInventory } = await import('/shared/config.js');
      const game = window.__DEADZONE__;
      const player = game.sim.players.get('solo');
      player.inventory = [makeInventory(id)];
      player.slot = 0;
      player.reloadEnd = 0;
      player.lastFire = -100;
    }, weapon);
    await page.waitForTimeout(90);
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__DEADZONE__.weapon.id), weapon);
    if (weapon === 'desertEagle') await page.screenshot({ path: 'test-results/desert-eagle.png' });
  }
  await page.evaluate(() => {
    const game = window.__DEADZONE__,
      player = game.sim.players.get('solo');
    player.x = 15;
    player.z = -3;
    player.y = 0;
    player.vx = 0;
    player.vz = 0;
    game.input.yaw = -0.35;
    game.input.pitch = 0;
    const boss = game.sim.spawnZombie('boss');
    boss.x = 22;
    boss.z = -12;
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/reactor.png' });
  assert.ok(await page.locator('#boss-bar').isVisible());
  console.log('PASS: all ten weapon viewmodels and reactor/boss render without runtime errors.');
  await page.keyboard.press('Escape');
  await page.locator('#pause-modal').waitFor({ state: 'visible' });
  const paused = await page.evaluate(() => window.__DEADZONE__.sim.time);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.time), paused);
  await page.locator('#resume').click();
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.damagePlayer(g.sim.players.get('solo'), 1000, { x: 0, z: 0 });
  });
  await page.locator('#over-modal').waitFor({ state: 'visible' });
  await page.locator('#restart').click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').hp), 100);
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await page.locator('#open-index').click();
  assert.ok(
    (
      await page.locator('#zombie-index .index-card:not(.undiscovered) h4').allInnerTexts()
    ).includes('SHAMBLER'),
  );
  assert.equal(await page.locator('#weapon-index .index-card:not(.undiscovered)').count(), 10);
  await page.locator('#index-back').click();
  console.log(
    'PASS: menu, field index discovery and persistence, settings, manual, pointer lock, controls, combat, purchases, pause, death and restart.',
  );
  // Independent browser contexts represent separate clients with separate state.
  const context2 = await browser.newContext({ viewport: { width: 1100, height: 800 } }),
    peer = await context2.newPage();
  watch(peer);
  await waitReady(peer);
  await page.locator('#multiplayer').click();
  await page.locator('#player-name').fill('ALPHA');
  await page.locator('#create-lobby').click();
  await page.locator('#lobby-room').waitFor({ state: 'visible' });
  const code = await page.locator('#room-code').innerText();
  await peer.locator('#multiplayer').click();
  await peer.locator('#player-name').fill('BRAVO');
  await peer.locator('#room-input').fill(code);
  await peer.locator('#join-lobby').click();
  await peer.locator('#lobby-room').waitFor({ state: 'visible' });
  await page.locator('#ready').click();
  await peer.locator('#ready').click();
  await page.locator('#start-match').click();
  await Promise.all([
    page.waitForFunction(() => window.__DEADZONE__?.mode === 'multiplayer'),
    peer.waitForFunction(() => window.__DEADZONE__?.mode === 'multiplayer'),
  ]);
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({
      players: window.__DEADZONE__.state.players.length,
      round: window.__DEADZONE__.state.round,
      time: window.__DEADZONE__.state.time,
    })),
    b = await peer.evaluate(() => ({
      players: window.__DEADZONE__.state.players.length,
      round: window.__DEADZONE__.state.round,
      time: window.__DEADZONE__.state.time,
    }));
  assert.equal(a.players, 2);
  assert.equal(b.players, 2);
  assert.equal(a.round, b.round);
  assert.ok(Math.abs(a.time - b.time) < 1);
  await page.bringToFront();
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  const localId = await page.evaluate(() => window.__DEADZONE__.id);
  const remoteZ = await peer.evaluate(
    (id) => window.__DEADZONE__.state.players.find((p) => p.id === id).z,
    localId,
  );
  assert.ok(remoteZ < 14.4, `remote movement ${remoteZ}`);
  await page.screenshot({ path: 'test-results/coop.png' });
  await context2.close();
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.state.players.length), 1);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: two browser clients create/join/ready/start, share state, synchronize movement, handle disconnect; no browser errors.',
  );
  await page.evaluate(() => window.__DEADZONE__.quit());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile-menu.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('PASS: responsive 390px menu without horizontal overflow.');
} finally {
  await browser.close();
  if (errors.length) console.error('Browser errors:', errors);
}
