import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() =>
    localStorage.setItem('deadzone-settings', JSON.stringify({ language: 'en' })),
  );
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  const unlocked = () =>
    page.waitForFunction(() => document.pointerLockElement !== null && !window.__DEADZONE__.paused);
  const launch = async (id = '#solo') => {
    await page.locator(id).click();
    await page.waitForTimeout(350);
    if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
    await unlocked();
    await page.evaluate(() => {
      window.__DEADZONE__.sim.countdown = 10000;
    });
  };
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-skins').click();
  await page.locator('[data-skin="gold"]').click();
  assert.equal(await page.locator('#skin-price').innerText(), '1000 PTS');
  assert.ok(await page.locator('#skin-equip').isDisabled());
  await page.locator('#index-back').click();
  await launch();
  await page.keyboard.press('KeyL');
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').flashlight),
    false,
  );
  await page.keyboard.press('KeyB');
  await page.locator('#shop-modal:not(.hidden)').waitFor();
  for (const family of ['pistols', 'smgs', 'rifles', 'snipers', 'shotguns']) {
    await page.locator(`[data-weapon-category="${family}"]`).click();
    const shown = await page
      .locator('.shop-card:not(.hidden)')
      .evaluateAll((cards) => cards.map((c) => c.dataset.weaponClass));
    assert.ok(shown.length > 0);
    assert.ok(shown.every((value) => value === family));
  }
  await page.locator('[data-category="supplies"]').click();
  assert.ok(
    await page.locator('[data-buy="flashlight"]').isDisabled(),
    'initial 500 credits are insufficient',
  );
  assert.ok(
    await page.locator('[data-buy="battery"]').isDisabled(),
    'battery needs an owned flashlight',
  );
  await page.evaluate(() => {
    window.__DEADZONE__.sim.players.get('solo').points = 2000;
  });
  await page.locator('[data-buy="flashlight"]:enabled').click();
  await page.locator('[data-buy="battery"]:enabled').click();
  await page.waitForFunction(
    () => window.__DEADZONE__.sim.players.get('solo').spareBatteries === 1,
  );
  assert.equal(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points), 1200);
  assert.ok(await page.locator('[data-buy="flashlight"]').isDisabled());
  await page.locator('[data-buy="lantern"]:enabled').click();
  await page.waitForFunction(
    () => window.__DEADZONE__.sim.players.get('solo').equipment.lantern === 1,
  );
  await page.keyboard.press('Escape');
  await unlocked();
  await page.keyboard.press('KeyL');
  await page.waitForFunction(() => window.__DEADZONE__.view.flashlight.intensity === 180);
  await page.keyboard.press('KeyO');
  await page.waitForFunction(() => window.__DEADZONE__.map.lanternMeshes.size === 1);
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').equipment.lantern),
    0,
  );
  await page.evaluate(() => {
    window.__DEADZONE__.sim.players.get('solo').flashlightCharge = 0.01;
  });
  await page.waitForFunction(
    () => window.__DEADZONE__.sim.players.get('solo').spareBatteries === 0,
  );
  assert.ok(
    await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').flashlightCharge > 119),
  );
  await page.evaluate(() => {
    window.__DEADZONE__.sim.time = 300;
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/update-flashlight.png' });
  const zombieId = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo'),
      z = g.sim.spawnZombie('normal');
    z.x = p.x + 3;
    z.z = p.z - 4;
    z.groundY = 0;
    z.emergeEnd = g.sim.time - 1;
    return z.id;
  });
  await page.waitForTimeout(250);
  await page.evaluate((id) => {
    const g = window.__DEADZONE__;
    g.sim.damageZombie(g.sim.zombies.get(id), 10000, g.sim.players.get('solo'));
  }, zombieId);
  await page.waitForFunction(() => window.__DEADZONE__.zombies.corpses.length > 0);
  await page.waitForTimeout(1600);
  const corpse = await page.evaluate(() => {
    const m = window.__DEADZONE__.zombies.corpses[0].model;
    const head = m.head.getWorldPosition(m.head.position.clone()),
      neck = m.neck.getWorldPosition(m.neck.position.clone());
    return { head: head.y, neck: neck.y, distance: head.distanceTo(neck), ragdoll: m.ragdoll };
  });
  assert.ok(corpse.ragdoll);
  assert.ok(corpse.neck < 1 && corpse.distance < 0.3, JSON.stringify(corpse));
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    p.x = -6;
    p.z = 4;
    p.y = 0;
    p.hp = 50;
    p.lastDamage = g.sim.time - 5;
  });
  await page.waitForFunction(() => window.__DEADZONE__.sim.players.get('solo').regenerating);
  assert.ok(await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').hp > 50));
  await page.waitForFunction(() =>
    document.getElementById('survival-kit').textContent.includes('+4 HP/s'),
  );
  const pauses = await page.evaluate(() => {
    const g = window.__DEADZONE__,
      pauses = [];
    for (let n = 1; n <= 7; n++) {
      g.sim.round = n;
      g.sim.phase = 'wave';
      g.sim.toSpawn = 0;
      g.sim.zombies.clear();
      g.sim.updateWaves(1 / 60);
      pauses.push(g.sim.countdown);
    }
    return pauses;
  });
  assert.deepEqual(pauses, [25, 30, 35, 40, 45, 50, 55]);
  await page.waitForFunction(() => /55/.test(document.getElementById('remaining').textContent));
  await page.evaluate(() => {
    window.__DEADZONE__.sim.state = 'over';
  });
  await page.locator('#over-modal:not(.hidden)').waitFor();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.balance), 175);
  assert.match(await page.locator('#end-skin-reward').innerText(), /CLEARED WAVES.*175/);
  await page.locator('#over-menu').click();
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.skins.balance),
    175,
    'quit cannot pay the gameover reward twice',
  );
  await page.reload();
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-skins').click();
  await page.locator('[data-skin="arctic"]').click();
  await page.locator('#skin-equip:enabled').click();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.balance), 75);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.equipped('vx9')), 'arctic');
  await page.locator('[data-skin="aurora_gold"]').click();
  assert.match(await page.locator('#skin-equip').innerText(), /BASE FINISH/);
  await page.locator('#index-back').click();
  await launch();
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      p = g.sim.players.get('solo');
    g.sim.round = 14;
    g.sim.phase = 'prepare';
    g.sim.countdown = 0;
    g.sim.updateWaves(1 / 60);
    g.sim.updateWaves(1 / 60);
    const boss = [...g.sim.zombies.values()][0];
    if (!boss?.finalBoss || g.sim.zombies.size !== 1)
      throw new Error('Final boss must arrive alone');
    boss.emergeEnd = g.sim.time - 1;
    boss.summonAt = g.sim.time + 10000;
    p.maxHp = p.hp = 10000;
    p.x = boss.x;
    p.z = boss.z + 8;
    g.input.yaw = 0;
    g.input.pitch = 0.18;
  });
  await page.locator('#boss-bar:not(.hidden)').waitFor();
  assert.match(await page.locator('#boss-bar').innerText(), /BIG BOSS.*FOREST OVERLORD/s);
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      boss = [...g.sim.zombies.values()][0];
    boss.shielded = false;
    boss.bossStage = 1;
    boss.summonAt = 0;
  });
  await page.waitForFunction(() =>
    document.getElementById('boss-phase').textContent.includes('EXPOSED'),
  );
  await page.screenshot({ path: 'test-results/update-big-boss.png' });
  await page.evaluate(() => {
    const g = window.__DEADZONE__,
      boss = [...g.sim.zombies.values()][0];
    g.sim.damageZombie(boss, 999999, g.sim.players.get('solo'));
    if (boss.hp !== boss.maxHp * 0.65 || !boss.shielded)
      throw new Error('Boss stage cannot be skipped');
  });
  await page.waitForFunction(() =>
    document.getElementById('boss-phase').textContent.includes('SHIELD'),
  );
  // Fixture represents the authoritative final tally of a second completed run.
  await page.evaluate(() => {
    const s = window.__DEADZONE__.sim;
    s.clearedWaves = 48;
    s.state = 'over';
  });
  await page.locator('#over-modal:not(.hidden)').waitFor();
  await page.locator('#over-menu').click();
  await page.locator('#open-skins').click();
  await page.locator('[data-skin="arctic_gold"]').click();
  await page.locator('#skin-equip:enabled').click();
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.balance), 275);
  assert.equal(await page.evaluate(() => window.__DEADZONE__.skins.equipped('vx9')), 'arctic_gold');
  await page.screenshot({ path: 'test-results/update-gold-armory.png' });
  await page.locator('#index-back').click();
  await launch('#open-training');
  await page.evaluate(() => {
    window.__DEADZONE__.sim.clearedWaves = 100;
  });
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  assert.equal(
    await page.evaluate(() => window.__DEADZONE__.skins.balance),
    275,
    'practice cannot farm skin points',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: categorized shop, paid flashlight / batteries, protective lantern placement, campfire healing, final boss / shield stages, falling neck, 25-55s intermissions, skin rewards, persistence, GOLD and no practice farming.',
  );
} finally {
  await browser.close();
}
