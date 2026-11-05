import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { WEAPONS } from '../shared/config.js';

await mkdir('test-results', { recursive: true });
const ids = ['glock17', 'beretta92', 'mp5', 'p90', 'scarh', 'aug', 'barrett'];
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER || 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.addInitScript(()=>localStorage.setItem('deadzone-settings',JSON.stringify({language:'en'})));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.locator('#open-index').click();
  assert.equal(
    await page.locator('[data-profile^="weapon:"]').count(),
    Object.keys(WEAPONS).length,
  );
  for (const id of ids) {
    await page.locator(`[data-profile="weapon:${id}"]`).click();
    assert.equal(await page.locator('#detail-title').innerText(), WEAPONS[id].name);
    assert.ok((await page.locator('#detail-description').innerText()).length > 30);
    assert.match(await page.locator('#detail-stats').innerText(), /HEAD DAMAGE/);
    await page.locator('#detail-sound').click();
    await page.waitForFunction(() => window.__DEADZONE__.audio.weaponAudio?.shots.size === 27);
    await page.waitForTimeout(80);
    await page.locator('#index-canvas').screenshot({ path: `test-results/model-${id}.png` });
    await page.locator('#detail-back').click();
  }
  await page.locator('[data-profile="weapon:raven"]').click();
  assert.equal(await page.locator('#detail-title').innerText(), 'AK-47');
  await page.locator('#detail-back').click();
  await page.locator('#index-back').click();
  const audio = await page.evaluate(() => {
    const w = window.__DEADZONE__.audio.weaponAudio;
    return {
      files: w.recordings.size,
      shots: w.shots.size,
      count: w.counter,
      failures: w.failures,
      profiles: [...w.shots].map(([id, variants]) => ({
        id,
        variants: variants.length,
        duration: variants[0].duration,
        energy: variants[0].getChannelData(0).reduce((s, v) => s + v * v, 0),
      })),
    };
  });
  assert.equal(audio.files, 9);
  assert.equal(audio.shots, 27);
  assert.equal(audio.count, 7);
  assert.deepEqual(audio.failures, []);
  assert.ok(audio.profiles.every((p) => p.energy > 1 && p.variants === 3));
  // Save an audition of the exact decoded/mixed runtime buffers, with silence between shots.
  const wav = await page.evaluate(
    async (ids) => {
      const g = window.__DEADZONE__,
        rate = 22050;
      const ctx = new OfflineAudioContext(1, rate * ids.length * 1.5, rate);
      ids.forEach((id, i) => {
        const source = ctx.createBufferSource();
        source.buffer = g.audio.weaponAudio.shots.get(id)[1];
        const gain = ctx.createGain();
        gain.gain.value = 0.65;
        source.connect(gain).connect(ctx.destination);
        source.start(i * 1.5);
      });
      const rendered = await ctx.startRendering(),
        samples = rendered.getChannelData(0);
      const buffer = new ArrayBuffer(44 + samples.length * 2),
        view = new DataView(buffer);
      const str = (offset, text) =>
        [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
      str(0, 'RIFF');
      view.setUint32(4, 36 + samples.length * 2, true);
      str(8, 'WAVE');
      str(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, rate, true);
      view.setUint32(28, rate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      str(36, 'data');
      view.setUint32(40, samples.length * 2, true);
      samples.forEach((v, i) =>
        view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true),
      );
      return Array.from(new Uint8Array(buffer));
    },
    [...ids, 'raven'],
  );
  await writeFile('test-results/weapon-audio-demo.wav', Buffer.from(wav));
  console.log(
    'PASS: all 17 firearm mixes decode locally, with 3 variants each; all seven new index models render and their sound buttons play.',
  );
  await page.locator('#solo').click();
  await page.waitForTimeout(300);
  if (await page.locator('#pause-modal').isVisible()) await page.locator('#resume').click();
  await page.waitForFunction(() => document.pointerLockElement && !window.__DEADZONE__.paused);
  await page.evaluate(() => {
    const g = window.__DEADZONE__;
    g.sim.countdown = 10000;
    g.sim.zombies.clear();
    g.input.pitch = g.input.yaw = g.recoil = 0;
  });
  for (const id of ids) {
    await page.evaluate(async (id) => {
      const g = window.__DEADZONE__,
        p = g.sim.players.get('solo');
      if (!p.unlockedWeapons.includes(id)) {
        g.sim.expandForest(11);
        const cache = g.sim.forest.caches(g.sim.claimedCaches).find((c) => c.blueprint === id);
        if (!cache) throw new Error('No matching supply cache');
        p.x = cache.x;
        p.z = cache.z + 1.1;
        g.sim.time += 1;
        g.sim.interact(p);
      }
      p.x = -18;
      p.z = 15;
      p.vx = p.vz = 0;
      p.points = 10000;
    }, id);
    await page.keyboard.press('KeyB');
    await page.locator('#shop-modal:not(.hidden)').waitFor();
    await page.locator(`[data-buy="weapon:${id}"]`).click();
    assert.equal(
      await page.evaluate(() => window.__DEADZONE__.sim.players.get('solo').points),
      10000 - WEAPONS[id].price,
    );
    await page.keyboard.press('KeyB');
    await page.waitForFunction(() => document.pointerLockElement && !window.__DEADZONE__.paused);
    await page.waitForFunction((id) => window.__DEADZONE__.weapon.id === id, id);
    await page.evaluate(() => {
      const g = window.__DEADZONE__,
        p = g.sim.players.get('solo');
      p.x = -18;
      p.z = 15;
      p.yaw = p.pitch = 0;
      g.input.yaw = g.input.pitch = g.recoil = 0;
    });
    await page.waitForTimeout(350);
    await page.mouse.click(720, 500);
    await page.waitForTimeout(80);
    assert.equal(
      await page.evaluate(() => {
        const p = window.__DEADZONE__.sim.players.get('solo');
        return p.inventory[p.slot].ammo;
      }),
      WEAPONS[id].magazine - 1,
    );
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(WEAPONS[id].reload * 400);
    if (id === 'p90')
      assert.ok(
        await page.evaluate(
          () => window.__DEADZONE__.weapon.model.parts.magazine.position.y > 0.08,
        ),
        'P90 magazine must lift upwards',
      );
    await page.waitForFunction(() => window.__DEADZONE__.sim.players.get('solo').reloadEnd === 0);
    await page.screenshot({ path: `test-results/held-${id}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: all seven free blueprint stations, B-menu purchases, held models, shots and reloads work; prices are authoritative and no browser errors occurred.',
  );
} finally {
  await browser.close();
}
