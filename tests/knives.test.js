import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnifeModel } from '../src/weapons/KnifeModels.js';
import { disposeWeaponModel } from '../src/weapons/ModelBuilder.js';
import { KNIFE_MODELS, canonicalKnifeId } from '../shared/Knives.js';

test('knife selection includes Stiletto and migrates the previous dagger selection', () => {
  assert.deepEqual(Object.keys(KNIFE_MODELS), ['karambit', 'skeleton', 'stiletto']);
  assert.equal(canonicalKnifeId('dagger'), 'stiletto');
  const model = createKnifeModel('dagger');
  assert.equal(model.knifeVariant, 'stiletto');
  disposeWeaponModel(model);
});

for (const id of Object.keys(KNIFE_MODELS)) {
  test(`${id}: reference holes are open geometry and the profile is finite`, () => {
    const model = createKnifeModel(id);
    assert.ok(model.parts.rightHand);
    assert.equal(model.parts.supportHand, undefined, 'a knife must have one visible hand');
    model.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model.parts.knifeBody);
    assert.ok(bounds.getSize(new THREE.Vector3()).length() < 0.6);
    assert.ok(Number.isFinite(bounds.min.x) && Number.isFinite(bounds.max.y));
    const ray = new THREE.Raycaster();
    for (const hole of model.reference.holes) {
      ray.set(new THREE.Vector3(-0.2, hole.centre.y, hole.centre.z), new THREE.Vector3(1, 0, 0));
      const hits = ray.intersectObject(model.parts.knifeBody, true);
      assert.equal(hits.length, 0, `${hole.name} is blocked by a face or handle wrap`);
    }
    disposeWeaponModel(model);
  });
}
