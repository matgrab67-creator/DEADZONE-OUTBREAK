import { MathUtils } from 'three';

const ease = (a, b, t) => MathUtils.smoothstep(t, a, b);

export function animateHumanoid(model, z, time, dt, speed = 0) {
  const { type, body, chest, pelvis, head, jaw, arms, elbows, wrists, legs, knees, feet } = model;
  const crawler = type === 'crawler',
    runner = type === 'runner',
    boss = type === 'boss';
  model.lastSpeed = MathUtils.damp(model.lastSpeed, Math.min(5, speed), 9, dt);
  const moving = Math.min(1, model.lastSpeed / (runner ? 2.2 : 1.1));
  const stride = crawler ? 0.8 : runner ? 1.25 : boss ? 1.25 : 0.9;
  model.walkCycle += ((model.lastSpeed * dt) / stride) * Math.PI * 2;
  const cycle = model.walkCycle + model.phase,
    step = Math.sin(cycle),
    idle = Math.sin(time * 1.7 + model.phase);
  const attackAge = time - (z.lastAttack ?? -100);
  const attack = attackAge >= 0 && attackAge < 0.62 ? 1 - ease(0.1, 0.62, attackAge) : 0;
  const swipe =
    attackAge >= 0 && attackAge < 0.62 ? Math.sin(ease(0, 0.55, attackAge) * Math.PI) : 0;
  const hitAge = time - (z.hitAt ?? -100);
  const hit =
    hitAge >= 0 && hitAge < 0.4 ? Math.sin((hitAge / 0.4) * Math.PI) * Math.exp(-hitAge * 5) : 0;
  const windup = boss && z.windup > time ? Math.min(1, (1.3 - (z.windup - time)) / 0.6) : 0;
  body.position.set(0, (crawler ? 0.014 : runner ? 0.04 : 0.026) * Math.cos(cycle * 2) * moving, 0);
  body.rotation.set(
    crawler ? 0 : runner ? -0.12 : boss ? -0.035 : -0.045,
    0,
    step * 0.025 * moving,
  );
  chest.position.copy(model.restChest);
  pelvis.position.copy(model.restPelvis);
  head.position.copy(model.restHead);
  chest.rotation.set(
    -hit * 0.2 + (crawler ? 0 : runner ? -0.12 : 0.025) - windup * 0.13,
    step * 0.06 * moving,
    hit * 0.08,
  );
  pelvis.rotation.set(0, -step * 0.035 * moving, step * 0.025 * moving);
  head.rotation.set(
    0.03 + idle * 0.015 + hit * 0.18 + windup * 0.2,
    -step * 0.045 * moving,
    Math.sin(time * 0.8 + model.phase) * 0.025 + hit * 0.1,
  );
  jaw.rotation.x = 0.08 + idle * 0.025 + attack * 0.25 + windup * 0.35;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1,
      phase = cycle + i * Math.PI,
      swing = Math.sin(phase);
    if (crawler) {
      arms[i].position.y = 0.47;
      arms[i].rotation.set(0.18 + swing * 0.28 * moving + attack * 0.65, side * 0.1, side * 0.15);
      elbows[i].rotation.set(1.2 + Math.max(0, swing) * 0.35 * moving, 0, 0);
      wrists[i].rotation.set(-0.25, 0, side * 0.1);
      legs[i].rotation.set(-1.4 + swing * 0.16 * moving, side * 0.12, side * 0.2);
      knees[i].rotation.set(2.4 - swing * 0.2 * moving, 0, 0);
      feet[i].rotation.set(-0.8, 0, 0);
    } else {
      const amplitude = runner ? 0.64 : boss ? 0.36 : 0.37;
      legs[i].rotation.set(swing * amplitude * moving, 0, side * 0.025);
      knees[i].rotation.set(Math.max(0, -swing) * moving * (runner ? 0.85 : 0.48), 0, 0);
      feet[i].rotation.set(-Math.max(0, swing) * 0.15 * moving, 0, 0);
      const resting = runner ? 0.4 : type === 'armored' ? 0.52 : 0.68;
      arms[i].rotation.set(
        resting -
          swing * (runner ? 0.5 : 0.17) * moving +
          attack * (i === 0 ? 1.0 : 0.65) +
          windup * 1.4,
        side * 0.04,
        side * (0.09 + swipe * 0.14),
      );
      elbows[i].rotation.set(
        (runner ? 0.8 : 0.27) + Math.max(0, swing) * 0.15 * moving - swipe * 0.16,
        0,
        0,
      );
      wrists[i].rotation.set(0.08 - attack * 0.28, 0, side * 0.04);
    }
  }
  if (boss && z.phase >= 2) {
    chest.rotation.x -= 0.055;
    arms[0].rotation.x += 0.15;
  }
  for (let i = 0; i < model.sacs.length; i++) {
    const growth = model.sacs[i],
      pulse = 1 + Math.sin(time * (boss ? 3 : 2.1) + i) * 0.035 + windup * 0.14;
    growth.scale.setScalar(pulse);
  }
  if (model.teammate) {
    body.rotation.x = 0;
    chest.rotation.x = 0;
    head.rotation.x = MathUtils.clamp(-(z.pitch || 0) * 0.3, -0.3, 0.3);
    arms[0].rotation.x = 1.2;
    arms[1].rotation.x = 1.15;
    elbows[0].rotation.x = 0.65;
    elbows[1].rotation.x = 0.5;
  }
}

export function animateDeath(model, age, dt) {
  const fallen = ease(0.12, 0.8, age),
    settle = ease(0.75, 1.3, age);
  model.root.rotation.x = MathUtils.lerp(0, -Math.PI / 2, fallen);
  model.root.rotation.z = Math.sin(model.phase) * 0.16 * fallen;
  model.root.position.y = 0.16 * fallen - Math.max(0, age - 2.8) * 0.55;
  model.body.position.y = -0.08 * Math.sin(fallen * Math.PI);
  model.head.rotation.x = MathUtils.damp(model.head.rotation.x, -0.18, 8, dt);
  model.jaw.rotation.x = MathUtils.damp(model.jaw.rotation.x, 0.28, 7, dt);
  for (let i = 0; i < 2; i++) {
    model.arms[i].rotation.x = MathUtils.damp(
      model.arms[i].rotation.x,
      -0.45 - settle * 0.15,
      5,
      dt,
    );
    model.arms[i].rotation.z = MathUtils.damp(
      model.arms[i].rotation.z,
      (i === 0 ? -1 : 1) * 0.45,
      5,
      dt,
    );
    model.elbows[i].rotation.x = MathUtils.damp(model.elbows[i].rotation.x, -0.25, 5, dt);
    model.knees[i].rotation.x = MathUtils.damp(
      model.knees[i].rotation.x,
      0.25 * (1 - settle),
      5,
      dt,
    );
  }
}
