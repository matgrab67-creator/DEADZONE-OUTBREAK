export function addClassicZombieDetails(c) {
  const { part, ball, box, chest, pelvis, head, arms, elbows, cloth, dark, wound, bone, type } = c;
  // Simple, readable human silhouettes: torn field jackets, collars, belts and sunken faces.
  for (const side of [-1, 1]) {
    box(chest, cloth, side * 0.08, 0.2, -0.13, 0.13, 0.1, 0.035, [0.2, side * 0.3, side * 0.35]);
    box(chest, dark, side * 0.12, 0.025, -0.171, 0.095, 0.065, 0.012);
    box(arms[side < 0 ? 0 : 1], cloth, side * 0.015, -0.018, -0.005, 0.14, 0.03, 0.14, [
      0,
      0,
      side * 0.1,
    ]);
    part(pelvis, 'tatter', cloth, side * 0.115, -0.16, -0.09, 0.24, 0.31, 0.045, [
      0,
      side * 0.12,
      side * 0.06,
    ]);
    for (let i = 0; i < 4; i++)
      part(
        elbows[side < 0 ? 0 : 1],
        'tatter',
        cloth,
        (i - 1.5) * 0.028,
        -0.04,
        -0.056,
        0.03,
        0.07 + i * 0.013,
        0.018,
        [0.1, 0, side * 0.13],
      );
    ball(head, wound, side * 0.048, 0.018, -0.119, 0.031, 0.021, 0.014);
    ball(head, c.eye, side * 0.048, 0.019, -0.133, 0.009, 0.008, 0.007);
    box(head, wound, side * 0.09, -0.03, -0.102, 0.008, 0.047, 0.006, [0, 0, side * 0.25]);
  }
  for (let i = 0; i < 5; i++) ball(chest, bone, 0.018, 0.13 - i * 0.06, -0.18, 0.008, 0.008, 0.004);
  box(chest, dark, -0.08, 0, -0.174, 0.022, 0.4, 0.018, [0, 0, -0.12]);
  box(pelvis, dark, 0, 0.03, -0.035, 0.45, 0.045, 0.3);
  box(pelvis, bone, 0.03, 0.03, -0.19, 0.043, 0.037, 0.012);
  for (let i = 0; i < 4; i++)
    box(
      chest,
      wound,
      -0.17 + i * 0.095,
      -0.11 + (i % 2) * 0.17,
      -0.179,
      0.007,
      0.057,
      0.004,
      [0, 0, 0.5],
    );
  return { classicZombie: true, eyeRest: type === 'boss' ? 0.9 : 0.5 };
}
