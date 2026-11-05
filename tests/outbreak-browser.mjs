import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { NEW_INFECTED } from '../shared/Infected.js';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-index').click();
  assert.equal(await page.locator('[data-profile^="zombie:"]').count(), 13);
  for (const [id, def] of Object.entries(NEW_INFECTED)) {
    await page.locator(`[data-profile="zombie:${id}"]`).click();
    assert.equal(await page.locator('#detail-title').innerText(), def.name);
    assert.ok((await page.locator('#detail-description').innerText()).length > 40);
    await page.waitForTimeout(100);
    await page.locator('#index-canvas').screenshot({ path: `test-results/infected-${id}.png` });
    await page.locator('#detail-back').click();
  }
  await page.locator('#index-back').click();
  await page.locator('#solo').click();
  await page.waitForTimeout(300);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement && !window.__DEADZONE__.paused);
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    g.sim.countdown = 10000;
    g.paused = true;
    g.zombies.reset();
    g.sim.zombies.clear();
    g.sim.time = 20;
    g.input.yaw = g.input.pitch = g.recoil = 0;
    p.x = -18;
    p.z = 16;
    p.vx = p.vz = 0;
    const z = g.sim.spawnZombie('normal');
    z.x = -18;
    z.z = 12.8;
    z.yaw = Math.PI;
  });
  await page.waitForTimeout(80);
  const early = await page.evaluate(
    () => [...window.__DEADZONE__.zombies.entities.values()][0].root.position.y,
  );
  assert.ok(early < -1.7);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.zombies.emergences.size), 1);
  await page.evaluate(() => {
    window.__DEADZONE__.sim.time = 20.8;
  });
  await page.waitForTimeout(80);
  const midway = await page.evaluate(
    () => [...window.__DEADZONE__.zombies.entities.values()][0].root.position.y,
  );
  assert.ok(midway > early && midway < 0);
  await page.screenshot({ path: 'test-results/zombie-emerging.png' });
  await page.evaluate(() => {
    window.__DEADZONE__.sim.time = 22;
  });
  await page.waitForTimeout(80);
  assert.equal(
    await page.evaluate(
      () => [...window.__DEADZONE__.zombies.entities.values()][0].root.position.y,
    ),
    0,
  );
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      z = [...g.sim.zombies.values()][0];
    g.sim.damageZombie(z, 999, g.sim.players.get('solo'), true);
  });
  await page.waitForTimeout(1300);
  const corpse = await page.evaluate(() => {
    const m = window.__DEADZONE__.zombies.corpses[0].model;
    return {
      physical: m.ragdoll,
      headY: m.head.getWorldPosition(m.head.position.clone()).y,
      leftElbow: m.elbows[0].rotation.x,
      rightElbow: m.elbows[1].rotation.x,
      y: m.chest.getWorldPosition(m.chest.position.clone()).y,
      x: m.root.position.x,
    };
  });
  assert.ok(corpse.physical);
  assert.ok(corpse.headY < 1.1);
  assert.notEqual(corpse.leftElbow, corpse.rightElbow);
  assert.ok(corpse.y > 0);
  await page.screenshot({ path: 'test-results/zombie-articulated-death.png' });
  console.log(
    'PASS: 13 index profiles and seven new rigs; visible ground emergence, dirt effects and an articulated death with floor support.',
  );
  await page.evaluate(async () => {
    const { makeInventory } = await import('/shared/config.js');
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.points = 1234;
    p.inventory = [makeInventory('barrett')];
    p.inventory[0].upgraded = true;
    p.inventory[0].ammo = 1;
    p.unlockedWeapons.push('barrett');
    p.perks = ['ghost'];
    p.slot = 0;
    p.x = -18;
    p.z = 15;
    p.y = 0;
    g.sim.zombies.clear();
    g.sim.round = 15;
    g.sim.toSpawn = 0;
    g.sim.phase = 'wave';
    g.paused = false;
  });
  await page.waitForFunction(
    () => window.__DEADZONE__.state.chapter === 2 && window.__DEADZONE__.map.chapter === 2,
  );
  await page.locator('#chapter-transition:not(.hidden)').waitFor();
  assert.equal(await page.locator('#chapter-title').innerText(), 'WHISPERING PINES');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(150);
  const transfer = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    return {
      position: [p.x, p.z],
      points: p.points,
      weapon: p.inventory[0],
      perks: p.perks,
      collision: g.sim.physics.statics.has('camp-shelter'),
      peers: g.zombies.entities.size,
    };
  });
  assert.deepEqual(transfer.position, [-18, 15]);
  assert.equal(transfer.points, 1834);
  assert.equal(transfer.weapon.id, 'barrett');
  assert.equal(transfer.weapon.ammo, 15);
  assert.deepEqual(transfer.perks, ['ghost']);
  assert.ok(transfer.collision);
  await page.screenshot({ path: 'test-results/chapter-transfer.png' });
  await page.evaluate(() => {
    window.__DEADZONE__.sim.countdown = 0.02;
  });
  await page.waitForFunction(() => window.__DEADZONE__.state.phase === 'prepare');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyW');
  assert.ok(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').z < 14.9));
  assert.match(await page.locator('#chapter-label').innerText(), /CHAPTER 02 \/ WHISPERING PINES/);
  assert.equal(await page.locator('#round').innerText(), '01');
  await page.screenshot({ path: 'test-results/chapter-ashfall.png' });
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.round = 30;
    g.sim.phase = 'wave';
    g.sim.toSpawn = 0;
  });
  await page.waitForFunction(() => window.__DEADZONE__.map.chapter === 3);
  assert.ok(
    await page.evaluate(
      () =>
        window.__DEADZONE__.sim.physics.statics.has('camp-shelter') &&
        window.__DEADZONE__.state.forest.ring === 8,
    ),
  );
  await page.evaluate(() => {
    window.__DEADZONE__.sim.countdown = 0.02;
  });
  await page.waitForFunction(() => window.__DEADZONE__.state.phase === 'prepare');
  await page.screenshot({ path: 'test-results/chapter-frost-vault.png' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: wave 15 and 30 advance the forest expedition, preserving the camp, weapons and controls, with expanded physical terrain; no browser errors.',
  );
} finally {
  await browser.close();
}
