export function addInfectedDetails(c) {
  const {
    type,
    group,
    part,
    ball,
    box,
    limb,
    chest,
    pelvis,
    head,
    jaw,
    arms,
    elbows,
    legs,
    knees,
    skin,
    cloth,
    armor,
    dark,
    bone,
    sac,
    wound,
    sacs,
  } = c;
  let boneArmor = null;
  if (type === 'brute') {
    chest.scale.set(1.34, 1.12, 1.2);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      arms[i].position.x *= 1.26;
      ball(arms[i], skin, side * 0.035, -0.07, 0, 0.18, 0.22, 0.15);
      ball(elbows[i], skin, side * 0.018, -0.17, -0.02, 0.12, 0.19, 0.11);
      box(elbows[i], armor, 0, -0.095, 0.01, 0.18, 0.075, 0.15, [0.1, 0, side * 0.1]);
      for (let j = 0; j < 3; j++)
        box(chest, bone, side * 0.18, 0.07 - j * 0.07, -0.19, 0.12, 0.035, 0.04, [
          0,
          0,
          side * 0.24,
        ]);
    }
    ball(head, skin, 0, 0.075, 0.04, 0.18, 0.19, 0.14);
    box(pelvis, dark, 0, 0, -0.17, 0.45, 0.11, 0.035);
  }
  if (type === 'spitter') {
    jaw.scale.set(1.25, 1.2, 1.3);
    for (const side of [-1, 1]) {
      const gland = group(chest, side * 0.16, 0.17, -0.12);
      ball(gland, sac, 0, 0, 0, 0.085, 0.13, 0.075);
      sacs.push(gland);
    }
    for (let i = 0; i < 4; i++) ball(chest, sac, 0.15 - i * 0.06, -0.08, -0.16, 0.04, 0.065, 0.045);
    ball(jaw, wound, 0, 0, -0.115, 0.075, 0.04, 0.022);
  }
  if (type === 'screamer') {
    jaw.scale.set(1.18, 1.6, 1.1);
    ball(chest, wound, 0, 0.2, -0.095, 0.1, 0.14, 0.09);
    for (const side of [-1, 1]) {
      box(head, cloth, side * 0.155, 0.005, 0.015, 0.05, 0.11, 0.1);
      for (let i = 0; i < 5; i++)
        box(chest, bone, side * 0.075, 0.12 - i * 0.055, -0.172, 0.11, 0.012, 0.02, [
          0,
          0,
          side * 0.18,
        ]);
    }
    box(chest, cloth, 0, -0.11, 0.15, 0.27, 0.4, 0.06, [-0.15, 0, 0]);
  }
  if (type === 'stalker') {
    part(head, 'helmet', cloth, 0, 0.1, 0.04, 0.19, 0.2, 0.18);
    for (const side of [-1, 1]) {
      box(head, cloth, side * 0.151, -0.015, 0.005, 0.055, 0.23, 0.18, [0, 0, side * 0.14]);
      box(chest, cloth, side * 0.18, -0.12, 0.16, 0.15, 0.55, 0.04, [-0.14, 0, side * 0.13]);
      for (let i = 0; i < 3; i++)
        part(
          elbows[side < 0 ? 0 : 1],
          'spike',
          bone,
          -0.035 + i * 0.034,
          -0.42,
          -0.014,
          0.012,
          0.16,
          0.012,
          [Math.PI, 0, 0],
        );
    }
  }
  if (type === 'leaper') {
    chest.scale.set(0.88, 0.92, 0.9);
    for (let i = 0; i < 2; i++) {
      ball(legs[i], skin, 0, -0.08, 0.015, 0.13, 0.21, 0.12);
      ball(knees[i], skin, 0, -0.09, 0.05, 0.09, 0.15, 0.12);
      for (let j = 0; j < 3; j++)
        part(elbows[i], 'spike', bone, -0.03 + j * 0.03, -0.4, -0.02, 0.01, 0.1, 0.01, [
          Math.PI,
          0,
          0,
        ]);
    }
    for (let i = 0; i < 5; i++)
      part(chest, 'spike', bone, 0, 0.19 - i * 0.09, 0.17, 0.025, 0.1, 0.025, [Math.PI / 2, 0, 0]);
  }
  if (type === 'bloater') {
    ball(chest, cloth, 0, -0.1, -0.03, 0.34, 0.36, 0.26);
    for (let i = 0; i < 8; i++) {
      const growth = group(chest, Math.sin(i * 2.4) * 0.27, -0.08 + Math.cos(i * 2.4) * 0.22, -0.2);
      ball(growth, sac, 0, 0, 0, 0.065, 0.09, 0.06);
      sacs.push(growth);
    }
    ball(head, dark, 0, -0.055, -0.12, 0.1, 0.065, 0.08);
    for (const side of [-1, 1]) {
      part(head, 'cylinder', armor, side * 0.115, -0.06, -0.1, 0.04, 0.06, 0.04, [
        0,
        0,
        Math.PI / 2,
      ]);
      box(chest, dark, side * 0.18, 0.13, 0, 0.035, 0.53, 0.4, [0, 0, side * 0.12]);
    }
    box(chest, bone, 0, 0.08, -0.284, 0.12, 0.1, 0.01);
  }
  if (type === 'boneguard') {
    boneArmor = group(chest, 0, 0, 0);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++)
        box(boneArmor, bone, side * 0.105, 0.16 - i * 0.09, -0.177, 0.185, 0.055, 0.07, [
          0,
          side * 0.14,
          side * 0.2,
        ]);
      ball(arms[side < 0 ? 0 : 1], bone, 0, 0.01, 0, 0.16, 0.13, 0.14);
      for (let i = 0; i < 3; i++)
        part(
          arms[side < 0 ? 0 : 1],
          'spike',
          bone,
          side * 0.07,
          0.05,
          -0.07 + i * 0.07,
          0.03,
          0.15,
          0.03,
          [0, 0, side * -0.55],
        );
      box(knees[side < 0 ? 0 : 1], bone, 0, -0.045, -0.07, 0.13, 0.21, 0.06);
    }
    box(boneArmor, bone, 0, 0.015, -0.22, 0.045, 0.37, 0.055);
    for (const side of [-1, 1])
      box(head, bone, side * 0.12, 0.08, -0.018, 0.045, 0.15, 0.17, [0, 0, side * 0.2]);
  }
  return { boneArmor };
}
