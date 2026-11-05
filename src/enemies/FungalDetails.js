import * as THREE from 'three';
import { infectedTextures } from './InfectedMaterials.js';
import { random } from '../../shared/config.js';

export function addFungalDetails(c) {
  const {
    type,
    part,
    ball,
    box,
    head,
    chest,
    arms,
    elbows,
    legs,
    knees,
    cloth,
    wound,
    dark,
    materials,
  } = c;
  const stage =
    {
      normal: 1,
      runner: 1,
      stalker: 2,
      crawler: 2,
      spitter: 2,
      leaper: 2,
      armored: 2,
      screamer: 3,
      exploder: 3,
      brute: 3,
      bloater: 3,
      boneguard: 3,
      boss: 4,
    }[type] || 1;
  const fungus = new THREE.MeshStandardMaterial({
    color: 0xe8dabd,
    map: infectedTextures.fungus,
    bumpMap: infectedTextures.fungus,
    bumpScale: 0.012,
    roughness: 0.94,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const hyphae = new THREE.MeshStandardMaterial({ color: 0xc9bfa0, roughness: 0.97 });
  materials.push(fungus, hyphae);
  fungus.name = 'mycelium';
  hyphae.name = 'hyphae';
  let shelves = 0;
  const shelf = (parent, x, y, z, r, rx, ry, rz) => {
    const m = part(parent, 'fungus', fungus, x, y, z, r, r, r, [rx, ry, rz]);
    m.name = 'mycelium-shelf';
    shelves++;
    return m;
  };
  // Asymmetric layered fungal fans follow the skull and each moving limb.
  for (let i = 0; i < stage * 3 + 2; i++) {
    const a = i * 2.399,
      r = 0.092 + random(i + type.length * 17) * 0.044;
    shelf(
      head,
      Math.sin(a) * 0.105,
      0.045 + Math.cos(a) * 0.085,
      -0.055 - (i % 3) * 0.023,
      r,
      Math.sin(a) * 0.55,
      Math.cos(a) * 0.8,
      a * 0.42,
    );
  }
  if (stage >= 3) {
    shelf(head, -0.066, 0.025, -0.12, 0.13, 0.12, -0.65, -0.9);
    shelf(head, 0.072, 0.07, -0.112, 0.125, -0.15, 0.6, 0.7);
  }
  for (let i = 0; i < stage * 4; i++) {
    const a = i * 2.399,
      side = i % 2 ? 1 : -1;
    const parent = i % 3 === 0 ? arms[i % 2] : chest;
    shelf(
      parent,
      parent === chest ? Math.sin(a) * 0.19 : side * 0.06,
      parent === chest ? Math.cos(a) * 0.21 : -0.08,
      -0.12,
      0.055 + random(i + 77) * 0.06,
      0.25,
      side * 0.5,
      a,
    );
  }
  // Raised veins / roots, darkened lesions and tiny shelf edges avoid smooth toy skin.
  for (let i = 0; i < 18 + stage * 5; i++) {
    const a = i * 2.399,
      parent = i % 3 === 0 ? elbows[i % 2] : i % 3 === 1 ? head : chest;
    const x = Math.sin(a) * (parent === head ? 0.12 : 0.17),
      y = Math.cos(a) * (parent === head ? 0.12 : 0.2),
      z = parent === head ? -0.113 : -0.17;
    const root = part(parent, 'capsule', hyphae, x, y, z, 0.003, 0.016 + random(i) * 0.012, 0.003, [
      0,
      0.2,
      a * 0.7,
    ]);
    root.name = 'hyphae';
    if (i % 3 === 0) ball(parent, wound, x, y, z + 0.003, 0.016, 0.025, 0.006);
  }
  // Frayed hem, sewn repairs, broken cuffs and mud on the boots and trouser knees.
  for (let i = 0; i < 11; i++) {
    const x = -0.21 + i * 0.041;
    part(
      chest,
      'tatter',
      cloth,
      x,
      -0.25 - random(i + 21) * 0.035,
      -0.11,
      0.035,
      0.075 + random(i + 31) * 0.06,
      0.018,
      [0.08, 0, (random(i) - 0.5) * 0.5],
    );
  }
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 5; i++) {
      part(
        elbows[side],
        'tatter',
        cloth,
        (i - 2) * 0.023,
        -0.035,
        -0.055,
        0.023,
        0.05 + random(i + side) * 0.04,
        0.014,
        [0.1, 0, (i - 2) * 0.15],
      );
      box(
        legs[side],
        dark,
        (side ? 1 : -1) * 0.055,
        -0.12 + i * 0.025,
        -0.1,
        0.004,
        0.016,
        0.008,
        [0, 0, 0.4],
      );
    }
    ball(knees[side], dark, 0, -0.035, -0.069, 0.05, 0.065, 0.012);
    shelf(elbows[side], side ? 0.04 : -0.04, -0.17, -0.045, 0.04, 0.1, side ? -0.5 : 0.5, 0.4);
  }
  return { fungalStage: stage, fungalShelves: shelves };
}
