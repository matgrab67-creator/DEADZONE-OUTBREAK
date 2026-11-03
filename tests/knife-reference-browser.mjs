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
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('#menu:not(.hidden)').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createKnifeModel } = await import('/src/weapons/KnifeModels.js');
    const game = window.__DEADZONE__;
    game.running = false;
    cancelAnimationFrame(game.frameId);
    document.getElementById('app').style.display = 'none';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f3ef);
    scene.environment = game.view.weaponEnvironment.texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb4b8ad, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(-3, 4, -2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc5d7e2, 1.0);
    fill.position.set(-2, -1, 3);
    scene.add(fill);
    const renderer = game.view.renderer;
    renderer.setPixelRatio(1);
    renderer.setSize(1440, 940);
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0xf2f3ef);
    renderer.clear();
    renderer.setScissorTest(true);
    const models = [];
    for (const [index, id] of ['karambit', 'skeleton', 'stiletto'].entries()) {
      const model = createKnifeModel(id);
      model.parts.rightHand.visible = false;
      if (model.parts.supportHand) model.parts.supportHand.visible = false;
      model.root.rotation.x = Math.atan2(model.reference.axis[1], model.reference.axis[0]);
      scene.add(model.root);
      models.push(model);
      model.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model.parts.knifeBody),
        size = bounds.getSize(new THREE.Vector3()),
        centre = bounds.getCenter(new THREE.Vector3());
      const aspect = 480 / 660,
        width = Math.max(size.z * 1.18, size.y * 1.18 * aspect),
        height = width / aspect;
      const camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.01,
        3,
      );
      camera.position.set(-1, centre.y, centre.z);
      camera.lookAt(0, centre.y, centre.z);
      for (const m of models) m.root.visible = m === model;
      renderer.setViewport(index * 480, 175, 480, 660);
      renderer.setScissor(index * 480, 175, 480, 660);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
    const labels = document.createElement('div');
    labels.style.cssText =
      'position:fixed;inset:0;pointer-events:none;font-family:Consolas,monospace;color:#303b33';
    labels.innerHTML =
      '<div style="position:absolute;top:38px;left:45px;font-size:13px;letter-spacing:3px">DEADZONE / KNIFE REFERENCE MODELS</div>' +
      ['KARAMBIT', 'SKELETON', 'STILETTO']
        .map(
          (s, i) =>
            `<div style="position:absolute;left:${i * 480 + 35}px;bottom:115px;width:410px;border-top:1px solid #b4beb2;padding-top:20px;font-size:20px;letter-spacing:3px">${s}</div>`,
        )
        .join('');
    document.body.append(labels);
  });
  await page.screenshot({ path: 'test-results/knives-reference.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: three reference-profile knife models rendered without WebGL errors.');
} finally {
  await browser.close();
}
