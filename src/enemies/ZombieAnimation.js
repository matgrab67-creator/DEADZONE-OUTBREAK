import { MathUtils, Vector3 } from 'three';
import { emergenceProgress } from '../../shared/ZombieLifecycle.js';

const ease = (a, b, t) => MathUtils.smoothstep(t, a, b);

export function animateHumanoid(model, z, time, dt, speed = 0) {
  const { type, body, chest, pelvis, head, jaw, arms, elbows, wrists, legs, knees, feet } = model;
  const crawler = type === 'crawler',
    runner = type === 'runner' || type === 'stalker' || type === 'leaper',
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
  if (z.finalBoss && (z.ritualEnd > time || z.guardRemaining > 0)) {
    chest.rotation.x -= 0.14;
    jaw.rotation.x += 0.35;
    arms.forEach((arm, i) =>
      arm.rotation.set(2.25 + Math.sin(time * 4) * 0.08, 0, (i ? 1 : -1) * 0.35),
    );
  }
  if (model.boneArmor) model.boneArmor.visible = !(z.hp <= z.maxHp * 0.4);
  if (type === 'brute') {
    chest.rotation.x -= 0.12;
    arms[0].rotation.x -= 0.2;
    arms[1].rotation.x -= 0.2;
  }
  if (type === 'bloater') {
    body.rotation.z += Math.sin(cycle) * 0.045 * moving;
    chest.rotation.x += 0.08;
  }
  if (type === 'stalker') {
    body.rotation.x -= 0.13;
    head.rotation.x += 0.12;
  }
  if (type === 'screamer') jaw.rotation.x += 0.18;
  if (!model.teammate && model.fungalStage) {
    const spasm = Math.pow(Math.max(0, Math.sin(time * 1.9 + model.phase)), 18);
    chest.rotation.x -= 0.04 * model.fungalStage;
    head.rotation.z += (model.fungalStage > 1 ? 0.055 : 0.025) + spasm * 0.06;
    head.rotation.y += Math.sin(time * 0.65 + model.phase) * 0.035;
    arms[0].rotation.z -= 0.035;
    elbows[1].rotation.x += spasm * 0.12;
  }
  if (z.ability === 'spit') {
    head.rotation.x -= 0.3;
    jaw.rotation.x = 0.72;
    chest.rotation.x -= 0.16;
    arms.forEach((arm, i) => arm.rotation.set(0.9, 0, (i ? 1 : -1) * 0.3));
  } else if (z.ability === 'scream') {
    head.rotation.x = -0.3;
    jaw.rotation.x = 0.95;
    arms.forEach((arm, i) => arm.rotation.set(1.95, 0, (i ? 1 : -1) * 0.4));
    elbows.forEach((elbow) => (elbow.rotation.x = 0.8));
  } else if (z.ability === 'slam') {
    arms.forEach((arm) => (arm.rotation.x = 2.7));
    chest.rotation.x = -0.15;
  } else if (z.ability === 'leap') {
    body.position.y -= 0.27;
    chest.rotation.x -= 0.3;
    knees.forEach((knee) => (knee.rotation.x = 1.05));
    legs.forEach((leg) => (leg.rotation.x = -0.55));
    arms.forEach((arm) => (arm.rotation.x = -0.6));
  }
  if (z.leapEnd > time) {
    legs.forEach((leg) => (leg.rotation.x = -0.55));
    knees.forEach((knee) => (knee.rotation.x = 1.3));
    arms.forEach((arm) => (arm.rotation.x = 1.5));
  }
  model.materials[6].emissiveIntensity = model.teammate
    ? 0
    : z.enragedUntil > time
      ? 3.8 + Math.sin(time * 12) * 0.2
      : model.eyeRest || 2.5;
  const emergence = model.teammate ? 1 : emergenceProgress(z, time);
  if (emergence < 1) {
    const grasp = 1 - ease(0.22, 0.93, emergence);
    body.rotation.x -= grasp * 0.2;
    head.rotation.x += grasp * 0.23;
    for (let i = 0; i < 2; i++) {
      arms[i].rotation.x = MathUtils.lerp(arms[i].rotation.x, 2.8 - i * 0.3, grasp);
      elbows[i].rotation.x = MathUtils.lerp(elbows[i].rotation.x, 0.2 + i * 0.4, grasp);
      wrists[i].rotation.x = -grasp * 0.5;
      knees[i].rotation.x += grasp * 0.7;
    }
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

const supportPoint = new Vector3();
export function beginDeath(model, info = {}) {
  const variant = Math.abs((info.seed || 0) % 3),
    side = (info.seed || 0) % 2 ? -1 : 1;
  const bones = [
    model.head,
    model.jaw,
    model.chest,
    model.pelvis,
    ...model.arms,
    ...model.elbows,
    ...model.wrists,
    ...model.legs,
    ...model.knees,
    ...model.feet,
  ];
  model.death = {
    info,
    variant,
    side,
    origin: model.root.position.clone(),
    groundY: model.groundY || 0,
    yaw: model.root.rotation.y,
    bodyY: model.body.position.y,
    pose: new Map(bones.map((bone) => [bone, bone.rotation.clone()])),
  };
}
export function animateDeath(model, age, _dt) {
  if (!model.death) beginDeath(model);
  const d = model.death,
    side = d.side,
    pose = d.pose;
  const buckle = Math.sin(ease(0, 0.65, age) * Math.PI),
    fall = ease(0.16, 1.08, age);
  const settle = ease(0.85, 1.65, age),
    blend = ease(0, 0.75, age);
  const backward = d.info.head && d.variant === 0;
  const angle = (((backward ? 1 : -1) * Math.PI) / 2) * fall;
  const roll = (d.variant === 2 ? 0.65 : 0.17) * side * fall;
  const impulse = (d.info.impulse || 0.3) * 0.38 * ease(0, 0.65, age);
  const direction = d.info.direction || { x: 0, z: 0 };
  const length = Math.hypot(direction.x, direction.z) || 1;
  model.root.position.copy(d.origin);
  model.root.position.x += (direction.x / length) * impulse;
  model.root.position.z += (direction.z / length) * impulse;
  model.root.rotation.set(angle, d.yaw, roll);
  const pivot = model.type === 'crawler' ? 0.3 : 0.82;
  model.body.position.set(0, MathUtils.lerp(d.bodyY, -pivot, fall), 0);
  model.root.position.y = MathUtils.lerp(d.origin.y, d.groundY + 0.16, fall) - buckle * 0.12;
  const rotate = (bone, x, y, z) => {
    const start = pose.get(bone);
    bone.rotation.set(
      MathUtils.lerp(start.x, x, blend),
      MathUtils.lerp(start.y, y, blend),
      MathUtils.lerp(start.z, z, blend),
    );
  };
  rotate(model.chest, -buckle * 0.24 + side * 0.06 * (1 - settle), side * 0.13, side * 0.08);
  rotate(model.head, backward ? -0.42 : 0.21, side * 0.32, side * 0.19);
  rotate(model.jaw, 0.36, 0, 0);
  rotate(model.pelvis, buckle * 0.17, -side * 0.06, 0);
  for (let i = 0; i < 2; i++) {
    const sign = i ? 1 : -1;
    rotate(
      model.arms[i],
      -0.12 - (i === d.variant % 2 ? 0.4 : 0),
      side * 0.12,
      sign * (0.36 + (i ? 0.13 : 0.04)),
    );
    rotate(model.elbows[i], 0.12 + (i ? 0.35 : 0.65) * (1 - settle * 0.65), 0, sign * 0.1);
    rotate(model.wrists[i], -0.25, sign * 0.13, side * 0.18);
    rotate(model.legs[i], -buckle * (i ? 0.42 : 0.7), sign * 0.12, sign * 0.14);
    rotate(model.knees[i], buckle * (i ? 0.9 : 1.2) + (i ? 0.14 : 0.04) * settle, 0, 0);
    rotate(model.feet[i], -0.06, sign * 0.16, sign * 0.12);
  }
  // Keep the articulated corpse on the floor instead of rotating it through the tiles.
  model.root.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const bone of [
    model.head,
    model.chest,
    model.pelvis,
    ...model.wrists,
    ...model.knees,
    ...model.feet,
  ]) {
    bone.getWorldPosition(supportPoint);
    lowest = Math.min(
      lowest,
      supportPoint.y -
        (bone === model.chest ? 0.19 : bone === model.head ? 0.15 : 0.075) * model.root.scale.y,
    );
  }
  if (age > 0.2 && lowest < d.groundY + 0.025)
    model.root.position.y += (d.groundY + 0.025 - lowest) * ease(0.2, 0.6, age);
  const opacity = 1 - ease(5.5, 7, age);
  for (const material of model.materials) {
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.65;
  }
}
