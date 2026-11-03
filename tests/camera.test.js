import test from 'node:test';
import assert from 'node:assert/strict';
import { PointerLook, cameraPitch } from '../src/player/PointerLook.js';

test('recoil never pushes the view past vertical or turns the horizon upside down', () => {
  assert.equal(cameraPitch(1.48, 0.14), 1.48);
  assert.equal(cameraPitch(-1.48, -0.14), -1.48);
  assert.ok(cameraPitch(1.48, 0.14) < Math.PI / 2);
  assert.ok(Number.isFinite(cameraPitch(NaN, Infinity)));
});

const setup = () => ({
  look: new PointerLook(),
  input: { yaw: 0, pitch: 0, deltaX: 0, deltaY: 0 },
});
test('cursor recentering and invalid packets cannot rotate the camera', () => {
  const { look, input } = setup();
  look.reset(1000);
  assert.equal(look.apply(input, 250, -100, 0.0022, 1010), false);
  assert.equal(look.apply(input, 1920, -1080, 0.0022, 1200), false);
  assert.equal(look.apply(input, NaN, 10, 0.0022, 1300), false);
  assert.equal(look.apply(input, 10, Infinity, 0.0022, 1300), false);
  assert.equal(input.yaw, 0);
  assert.equal(input.pitch, 0);
});
test('normal input stays direct, with bounded pitch and no artificial rotation', () => {
  const { look, input } = setup();
  look.apply(input, 20, -10, 0.0022, 100);
  assert.ok(Math.abs(input.yaw + 0.044) < 1e-10);
  assert.ok(Math.abs(input.pitch - 0.022) < 1e-10);
  const yaw = input.yaw;
  for (let i = 0; i < 120; i++) look.endFrame();
  assert.equal(input.yaw, yaw);
  for (let i = 0; i < 100; i++) {
    look.endFrame();
    look.apply(input, 0, -100, 0.0022, 200 + i);
  }
  assert.equal(input.pitch, 1.48);
});
test('a burst of mouse packets has a finite frame budget and survives relocking', () => {
  const { look, input } = setup();
  for (let i = 0; i < 200; i++) look.apply(input, 100, 0, 0.006, 100);
  assert.ok(Math.abs(input.yaw) <= 0.700001);
  const before = input.yaw;
  look.reset(200);
  look.apply(input, -300, 200, 0.006, 201);
  assert.equal(input.yaw, before);
  look.endFrame();
  look.apply(input, 10, 0, 0.0022, 300);
  assert.ok(Number.isFinite(input.yaw));
});
