// Original vector artwork rendered into a coating texture, not borrowed game assets.
const rng = (seed) => {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
};
function line(c, points, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
function polygon(c, points, fill) {
  c.fillStyle = fill;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function dragon(c, skin, random) {
  const [, gold, teal] = skin.colors;
  const background = c.createLinearGradient(0, 0, 1024, 512);
  background.addColorStop(0, '#080f19');
  background.addColorStop(0.48, '#1c3742');
  background.addColorStop(1, '#111421');
  c.fillStyle = background;
  c.fillRect(0, 0, 1024, 512);
  // Guilloche engravings remain visible around the central serpentine dragon.
  for (let row = -1; row < 11; row++)
    for (let col = -1; col < 34; col++) {
      const x = col * 34 + (row % 2) * 17,
        y = row * 51;
      c.beginPath();
      c.ellipse(x, y, 25, 32, 0.4, 0, Math.PI * 2);
      c.strokeStyle = '#d6b86a30';
      c.lineWidth = 1.2;
      c.stroke();
      c.beginPath();
      c.ellipse(x, y, 19, 26, 0.4, 0, Math.PI * 2);
      c.strokeStyle = '#2c909850';
      c.stroke();
    }
  const offset = (random() - 0.5) * 75;
  c.save();
  c.translate(offset, 0);
  const spine = new Path2D(
    'M 55 375 C 190 510 278 60 450 180 C 570 290 635 420 720 285 C 810 130 860 120 936 206',
  );
  c.strokeStyle = '#061016';
  c.lineWidth = 64;
  c.lineCap = 'round';
  c.stroke(spine);
  const metal = c.createLinearGradient(0, 100, 0, 400);
  metal.addColorStop(0, '#fff0ae');
  metal.addColorStop(0.35, gold);
  metal.addColorStop(0.64, '#87541e');
  metal.addColorStop(1, '#efd28b');
  c.strokeStyle = metal;
  c.lineWidth = 48;
  c.stroke(spine);
  c.strokeStyle = teal;
  c.lineWidth = 6;
  c.stroke(spine);
  for (let i = 0; i < 31; i++) {
    const t = i / 30,
      x = 70 + t * 780,
      y = 275 + Math.sin(t * Math.PI * 3.1) * 95;
    line(
      c,
      [
        [x - 12, y - 22],
        [x, y],
        [x + 12, y - 22],
      ],
      '#fff0ad90',
      2,
    );
  }
  polygon(
    c,
    [
      [864, 185],
      [884, 133],
      [908, 154],
      [961, 139],
      [947, 173],
      [990, 191],
      [950, 215],
      [912, 208],
      [885, 230],
    ],
    metal,
  );
  polygon(
    c,
    [
      [900, 151],
      [895, 92],
      [915, 136],
      [948, 113],
      [932, 157],
    ],
    gold,
  );
  polygon(
    c,
    [
      [937, 178],
      [958, 180],
      [944, 188],
    ],
    '#aa263a',
  );
  line(
    c,
    [
      [959, 201],
      [1015, 212],
      [990, 230],
    ],
    gold,
    3,
  );
  for (const [x, y] of [
    [400, 173],
    [653, 337],
  ]) {
    line(
      c,
      [
        [x, y],
        [x - 28, y - 62],
        [x - 56, y - 65],
      ],
      gold,
      9,
    );
    for (let i = 0; i < 3; i++)
      line(
        c,
        [
          [x - 55, y - 65],
          [x - 68 - i * 7, y - 86 + i * 12],
        ],
        '#fff0ad',
        3,
      );
  }
  c.restore();
  for (const y of [22, 490]) {
    line(
      c,
      [
        [0, y],
        [1024, y],
      ],
      gold,
      3,
    );
    for (let x = 0; x < 1024; x += 27)
      polygon(
        c,
        [
          [x, y - 6],
          [x + 8, y],
          [x, y + 6],
          [x - 8, y],
        ],
        gold,
      );
  }
}
function doppler(c, skin, random) {
  const phase = random() * 5;
  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  ['#080e32', ...skin.colors, '#303eac', '#b94086'].forEach((color, i) =>
    gradient.addColorStop(i / 5, color),
  );
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = -12; i < 30; i++) {
    c.beginPath();
    for (let x = -80; x <= 1100; x += 12) {
      const y = i * 23 + Math.sin(x / 180 + i * 0.14 + phase) * 99 + Math.cos(x / 75 + phase) * 15;
      x === -80 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.strokeStyle = ['#44168c75', '#f0a2ea42', '#2be3d63b', '#0c17465c'][((i % 4) + 4) % 4];
    c.lineWidth = 16 + (i % 3) * 4;
    c.stroke();
  }
  for (let i = 0; i < 35; i++) {
    const x = random() * 1024,
      y = random() * 512;
    c.strokeStyle = '#e9ecff38';
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(x, y, 5 + random() * 22, 1.5, -0.35, 0, 7);
    c.stroke();
  }
}
function ronin(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  const sunX = 630 + random() * 160;
  c.fillStyle = skin.colors[1];
  c.beginPath();
  c.arc(sunX, 225, 157, 0, 7);
  c.fill();
  for (let i = 0; i < 20; i++) {
    const y = 55 + i * 22;
    line(
      c,
      [
        [-20, y + 130],
        [270, y - 22],
        [650, y + 145],
        [1090, y - 55],
      ],
      '#48443e16',
      1,
    );
  }
  const trunk = new Path2D('M 45 545 C 225 310 460 410 620 180 C 655 124 690 86 735 50');
  c.lineCap = 'round';
  c.strokeStyle = skin.colors[2];
  c.lineWidth = 24;
  c.stroke(trunk);
  const branches = [
    [
      [280, 350],
      [225, 235],
      [110, 172],
    ],
    [
      [400, 310],
      [526, 335],
      [670, 302],
    ],
    [
      [555, 233],
      [486, 160],
      [385, 136],
    ],
    [
      [645, 151],
      [790, 125],
      [905, 58],
    ],
    [
      [222, 401],
      [122, 374],
      [12, 310],
    ],
  ];
  for (const branch of branches) {
    line(c, branch, '#17212b', 8);
    const [x, y] = branch.at(-1);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 3 ? '#be2b44' : '#d68188';
      c.beginPath();
      c.ellipse(x + (random() - 0.5) * 90, y + (random() - 0.5) * 70, 7, 3, random() * 6, 0, 7);
      c.fill();
    }
  }
  polygon(
    c,
    [
      [35, 35],
      [194, 35],
      [171, 59],
      [35, 59],
    ],
    '#b61f35',
  );
  c.fillStyle = '#17212b';
  c.font = 'bold 12px monospace';
  c.fillText('DZ // RONIN', 45, 87);
  line(
    c,
    [
      [0, 465],
      [1024, 465],
    ],
    '#b61f35',
    6,
  );
}
function circuit(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 140; i++) {
    c.fillStyle = ['#f2f5ed', '#becdd4', '#7e98aa', '#334d63'][i % 4];
    c.fillRect(
      Math.floor(random() * 43) * 24,
      Math.floor(random() * 22) * 24,
      24 + Math.floor(random() * 3) * 24,
      24 + Math.floor(random() * 2) * 24,
    );
  }
  for (let i = 0; i < 19; i++) {
    const x = random() * 1024,
      y = random() * 512,
      length = 80 + random() * 180;
    const points = [
      [x, y],
      [x + length * 0.5, y],
      [x + length * 0.7, y - 40],
      [x + length, y - 40],
    ];
    line(c, points, '#17344c', 6);
    line(c, points, skin.colors[2], 2);
    for (const [px, py] of [points[0], points.at(-1)]) {
      c.strokeStyle = '#37bee3';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(px, py, 5, 0, 7);
      c.stroke();
    }
  }
}
function scales(c, skin, random) {
  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, '#071f1d');
  gradient.addColorStop(0.5, skin.colors[0]);
  gradient.addColorStop(1, '#4f7a3e');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  const shift = random() * 40;
  for (let row = -1; row < 17; row++)
    for (let col = -1; col < 35; col++) {
      const x = col * 34 + (row % 2) * 17 + shift,
        y = row * 34;
      c.beginPath();
      c.moveTo(x - 22, y);
      c.quadraticCurveTo(x, y + 46, x + 22, y);
      c.quadraticCurveTo(x, y + 20, x - 22, y);
      c.fillStyle = (row + col) % 3 ? '#58a15b55' : '#a4be7440';
      c.fill();
      c.strokeStyle = '#061d1a';
      c.lineWidth = 3;
      c.stroke();
      c.beginPath();
      c.moveTo(x - 15, y + 7);
      c.quadraticCurveTo(x, y + 32, x + 15, y + 7);
      c.strokeStyle = skin.colors[2] + '88';
      c.lineWidth = 1;
      c.stroke();
    }
}
function fracture(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 65; i++) {
    const x = random() * 1100 - 40,
      y = random() * 580 - 40,
      w = 40 + random() * 150,
      h = 20 + random() * 110;
    polygon(
      c,
      [
        [x, y],
        [x + w, y - 20],
        [x + w * 0.7, y + h],
        [x - w * 0.2, y + h * 0.6],
      ],
      [skin.colors[1], skin.colors[2], '#937647', '#a59066'][i % 4],
    );
  }
  for (let i = 0; i < 28; i++) {
    const points = [];
    for (let x = -20; x < 1060; x += 15)
      points.push([x, i * 23 + Math.sin(x * 0.012 + i * 0.23) * 34]);
    line(c, points, '#f2dfb44a', 1);
  }
  c.fillStyle = '#3f3b2e';
  c.font = 'bold 15px monospace';
  c.fillText('D Z  / /  F I E L D', 620, 350);
}
function grid(c, skin, random) {
  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, skin.colors[0]);
  gradient.addColorStop(1, skin.colors[1]);
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = -20; i < 50; i++) {
    line(
      c,
      [
        [i * 34, -30],
        [i * 34 + 512, 542],
      ],
      '#5db8d63c',
      1,
    );
    line(
      c,
      [
        [i * 34, 542],
        [i * 34 + 512, -30],
      ],
      '#07152788',
      2,
    );
  }
  const x = 200 + random() * 350;
  polygon(
    c,
    [
      [x - 60, 0],
      [x - 13, 0],
      [x + 350, 512],
      [x + 300, 512],
    ],
    skin.colors[2],
  );
  polygon(
    c,
    [
      [x + 15, 0],
      [x + 25, 0],
      [x + 390, 512],
      [x + 380, 512],
    ],
    '#a9eff1',
  );
  for (let i = 0; i < 14; i++) c.strokeRect(40 + i * 65, 392 + (i % 3) * 10, 32, 3);
}
function mecha(c, skin, random) {
  const steel = c.createLinearGradient(0, 0, 1024, 512);
  steel.addColorStop(0, '#f4f4ef');
  steel.addColorStop(0.42, '#c9cecd');
  steel.addColorStop(1, '#eef0ed');
  c.fillStyle = steel;
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 8; i++) {
    const x = i * 150 - 30,
      offset = random() * 36;
    polygon(
      c,
      [
        [x, 0],
        [x + 95, 0],
        [x + 168, 180 + offset],
        [x + 65, 205 + offset],
      ],
      i % 2 ? '#31393e' : '#697176',
    );
    polygon(
      c,
      [
        [x + 30, 0],
        [x + 48, 0],
        [x + 120, 177 + offset],
        [x + 101, 182 + offset],
      ],
      '#e3483d',
    );
    polygon(
      c,
      [
        [x + 10, 512],
        [x + 102, 512],
        [x + 170, 315 - offset],
        [x + 73, 291 - offset],
      ],
      i % 2 ? '#d9ddda' : '#aeb4b5',
    );
  }
  for (let i = 0; i < 24; i++) {
    const x = random() * 1024,
      y = random() * 512;
    c.fillStyle = '#30383d';
    c.beginPath();
    c.arc(x, y, 3 + random() * 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f2f2ed';
    c.beginPath();
    c.arc(x - 1, y - 1, 1, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#252c31';
  c.font = 'bold 24px monospace';
  c.fillText('MECHA INDUSTRIES', 48, 268);
  c.font = 'bold 12px monospace';
  c.fillStyle = '#d83e35';
  c.fillText(`MI // ${String(skin.seed % 9999).padStart(4, '0')} // ARMAMENT`, 50, 292);
  line(
    c,
    [
      [0, 302],
      [1024, 302],
    ],
    '#333b40',
    3,
  );
  for (let x = 28; x < 1024; x += 66) {
    c.fillStyle = '#e3483d';
    c.fillRect(x, 309, 26, 5);
  }
}
function patina(c, skin, random) {
  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  skin.colors.forEach((color, i) => gradient.addColorStop(i / 2, color));
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 100; i++) {
    c.fillStyle = i % 3 ? skin.colors[2] + '80' : '#35251c66';
    c.beginPath();
    c.ellipse(
      random() * 1024,
      random() * 512,
      12 + random() * 70,
      8 + random() * 32,
      random() * 6,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  for (let y = 15; y < 512; y += 28)
    line(
      c,
      [
        [0, y],
        [300, y + 12],
        [720, y - 18],
        [1024, y],
      ],
      '#f6c99766',
      1,
    );
}
function petals(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 32; i++) {
    const x = random() * 1024,
      y = random() * 512;
    line(
      c,
      [
        [x - 120, y + 90],
        [x - 35, y + 5],
        [x + 70, y - 15],
      ],
      '#634354',
      5,
    );
    for (let n = 0; n < 5; n++) {
      const a = (n * Math.PI * 2) / 5;
      c.fillStyle = n % 2 ? skin.colors[1] : skin.colors[2];
      c.beginPath();
      c.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 16, 8, a, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#fff3c9';
    c.beginPath();
    c.arc(x, y, 4, 0, 7);
    c.fill();
  }
}
function frost(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 140; i++) {
    const x = random() * 1100 - 40,
      y = random() * 560 - 20,
      size = 18 + random() * 110;
    polygon(
      c,
      [
        [x, y],
        [x + size, y - size * 0.35],
        [x + size * 0.65, y + size],
      ],
      skin.colors[i % 3],
    );
    line(
      c,
      [
        [x, y],
        [x + size * 0.5, y + size * 0.3],
        [x + size * 0.65, y + size],
      ],
      '#efffff66',
      1,
    );
  }
}
function hazard(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let x = -512; x < 1100; x += 95)
    polygon(
      c,
      [
        [x, 0],
        [x + 37, 0],
        [x + 549, 512],
        [x + 512, 512],
      ],
      skin.colors[1],
    );
  for (let i = 0; i < 180; i++) {
    c.fillStyle = i % 2 ? skin.colors[2] + 'aa' : '#191d20b0';
    c.fillRect(random() * 1024, random() * 512, 3 + random() * 34, 2 + random() * 20);
  }
  for (const y of [60, 440])
    line(
      c,
      [
        [0, y],
        [1024, y],
      ],
      '#e2a65b',
      3,
    );
}
function embers(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = -3; i < 12; i++) {
    const points = Array.from({ length: 28 }, (_, n) => [
      n * 40,
      i * 65 + Math.sin(n * 0.7 + i) * 65 + Math.cos(n * 1.5) * 20,
    ]);
    line(c, points, '#6e1928', 27);
    line(c, points, skin.colors[1], 12);
    line(c, points, skin.colors[2], 2);
  }
  for (let i = 0; i < 80; i++) {
    c.fillStyle = skin.colors[1];
    c.fillRect(random() * 1024, random() * 512, 2, 2 + random() * 9);
  }
}
function neon(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 10; i++) {
    const y = i * 58,
      offset = random() * 80;
    const points = [
      [0, y],
      [220 + offset, y],
      [285 + offset, y - 55],
      [480, y - 55],
      [540, y + 30],
      [810, y + 30],
      [875, y],
      [1024, y],
    ];
    c.save();
    c.shadowBlur = 16;
    c.shadowColor = skin.colors[1 + (i % 2)];
    line(c, points, skin.colors[1 + (i % 2)], 5);
    c.restore();
    line(c, points, '#f2ffffcc', 1);
  }
}
function abyss(c, skin, random) {
  const gradient = c.createLinearGradient(0, 0, 500, 512);
  gradient.addColorStop(0, '#030c20');
  gradient.addColorStop(0.6, skin.colors[0]);
  gradient.addColorStop(1, '#175d75');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 8; i++) {
    const y = i * 67 + random() * 20;
    const curve = new Path2D(
      `M -50 ${y} C 260 ${y - 180} 420 ${y + 160} 660 ${y - 20} S 940 ${y - 80} 1090 ${y + 50}`,
    );
    c.strokeStyle = '#021523';
    c.lineWidth = 44;
    c.stroke(curve);
    c.strokeStyle = skin.colors[1];
    c.lineWidth = 28;
    c.stroke(curve);
    c.strokeStyle = skin.colors[2];
    c.lineWidth = 3;
    c.stroke(curve);
    for (let n = 0; n < 20; n++) {
      const x = n * 56,
        py = y + Math.sin(n * 0.5 + i) * 33;
      c.beginPath();
      c.ellipse(x, py, 7, 4, 0.3, 0, 7);
      c.strokeStyle = '#bcebd6aa';
      c.lineWidth = 2;
      c.stroke();
    }
  }
}
function mirror(c, skin) {
  // Reflections come from PBR lighting, rather than stripes baked into the paint.
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
}
function matte(c, skin) {
  c.fillStyle = skin.gold ? '#b9b9b9' : skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
}
function web(c, skin, random) {
  c.fillStyle = skin.colors[0];
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 7; i++) {
    const cx = random() * 1024,
      cy = random() * 512,
      phase = random() * 6;
    for (let spoke = 0; spoke < 12; spoke++) {
      const a = phase + (spoke * Math.PI) / 6;
      line(
        c,
        [
          [cx, cy],
          [cx + Math.cos(a) * 310, cy + Math.sin(a) * 310],
        ],
        '#10090de0',
        2.3,
      );
    }
    for (let ring = 1; ring <= 7; ring++) {
      c.beginPath();
      for (let spoke = 0; spoke <= 12; spoke++) {
        const a = phase + (spoke * Math.PI) / 6,
          b = a + Math.PI / 12,
          r = ring * 37;
        if (!spoke) c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        c.quadraticCurveTo(
          cx + Math.cos(b) * r * 0.88,
          cy + Math.sin(b) * r * 0.88,
          cx + Math.cos(a + Math.PI / 6) * r,
          cy + Math.sin(a + Math.PI / 6) * r,
        );
      }
      c.strokeStyle = '#160a10d0';
      c.lineWidth = 1.7;
      c.stroke();
    }
  }
}
function emerald(c, skin, random) {
  const gradient = c.createLinearGradient(0, 0, 1024, 512);
  skin.colors.forEach((color, i) => gradient.addColorStop(i / 2, color));
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 30; i++) {
    const x = random() * 1024,
      y = random() * 512,
      size = 80 + random() * 220;
    polygon(
      c,
      [
        [x, y],
        [x + size, y - size * 0.4],
        [x + size * 0.5, y + size],
      ],
      i % 2 ? '#001c1520' : '#a1ffb91b',
    );
  }
}
function engraved(c, skin) {
  const metal = c.createLinearGradient(0, 0, 100, 512);
  ['#7e501a', '#f8e4a5', '#bf8d30', '#f3d77d', '#aa7520'].forEach((color, i) =>
    metal.addColorStop(i / 4, color),
  );
  c.fillStyle = metal;
  c.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 3)
    line(
      c,
      [
        [0, y],
        [1024, y + 24],
      ],
      '#fff6d21a',
      0.6,
    );
  for (let x = -200; x < 1200; x += 38) {
    line(
      c,
      [
        [x, 0],
        [x + 512, 512],
      ],
      '#66421955',
      1.5,
    );
    line(
      c,
      [
        [x, 512],
        [x + 512, 0],
      ],
      '#fff3bb66',
      1,
    );
  }
}
function signature(c, skin) {
  const n = skin.signature >>> 0;
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = 0.38;
  c.fillStyle = skin.accent;
  c.fillRect(0, 0, 1024, 512);
  c.restore();
  c.save();
  c.translate(155 + (n % 650), 130 + ((n >>> 8) % 210));
  c.rotate((((n >>> 16) % 12) - 6) * 0.09);
  c.scale(0.85 + (n % 35) / 100, 0.85 + (n % 35) / 100);
  c.strokeStyle = skin.accent + 'dd';
  c.fillStyle = skin.accent + '88';
  c.lineWidth = 4;
  if (skin.motif === 'sun' || skin.motif === 'vortex') {
    for (let i = 0; i < 16; i++) {
      c.save();
      c.rotate((i * Math.PI) / 8);
      line(
        c,
        [
          [32, 0],
          [95, skin.motif === 'vortex' ? 40 : 0],
        ],
        skin.accent,
        3,
      );
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 27, 0, Math.PI * 2);
    c.stroke();
  } else if (skin.motif === 'honeycomb') {
    for (let y = -2; y <= 2; y++)
      for (let x = -3; x <= 3; x++) {
        const points = Array.from({ length: 6 }, (_, i) => [
          x * 35 + (y % 2) * 18 + Math.cos((i * Math.PI) / 3) * 20,
          y * 31 + Math.sin((i * Math.PI) / 3) * 20,
        ]);
        c.beginPath();
        points.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
        c.closePath();
        c.stroke();
      }
  } else if (skin.motif === 'claw' || skin.motif === 'fang') {
    for (let i = 0; i < 3; i++)
      polygon(
        c,
        [
          [-80 + i * 50, -95],
          [-60 + i * 50, 78],
          [-28 + i * 50, 115],
          [-47 + i * 50, -54],
        ],
        skin.accent + 'c0',
      );
    if (skin.motif === 'fang')
      line(
        c,
        [
          [-110, -70],
          [0, 100],
          [110, -70],
        ],
        '#141b20cc',
        9,
      );
  } else if (skin.motif === 'fern') {
    line(
      c,
      [
        [-110, 80],
        [100, -85],
      ],
      skin.accent,
      5,
    );
    for (let i = 0; i < 7; i++) {
      const x = -85 + i * 27,
        y = 60 - i * 21;
      line(
        c,
        [
          [x - 45, y - 15],
          [x, y],
          [x + 8, y + 47],
        ],
        skin.accent,
        7,
      );
    }
  } else if (skin.motif === 'contour') {
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.ellipse(0, 0, 27 + i * 13, 12 + i * 9, 0.35, 0, Math.PI * 2);
      c.stroke();
    }
  } else if (skin.motif === 'fractals') {
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      line(
        c,
        [
          [0, 0],
          [0, 100],
        ],
        skin.accent,
        4,
      );
      for (const y of [35, 65])
        line(
          c,
          [
            [-23, y + 15],
            [0, y],
            [23, y + 15],
          ],
          skin.accent,
          3,
        );
      c.restore();
    }
  } else if (skin.motif === 'chevron') {
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [-95, -70 + i * 44],
          [0, -30 + i * 44],
          [95, -70 + i * 44],
        ],
        skin.accent,
        12,
      );
  } else {
    const points = Array.from({ length: 19 }, (_, i) => [
      i * 16 - 145,
      skin.motif === 'pulse' ? Math.sin(i * 1.7) * (i % 4 ? 18 : 65) : i % 3 === 0 ? -55 : 35,
    ]);
    line(c, points, '#111c26b0', 13);
    line(c, points, skin.accent, 5);
  }
  c.restore();
  c.fillStyle = skin.gold ? '#5a391c' : skin.accent;
  c.font = 'bold 12px monospace';
  c.fillText(`DZ / ${skin.theme} / ${(n % 9999).toString().padStart(4, '0')}`, 45, 475);
}
function goldPlate(c, width, height) {
  const pixels = c.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value =
      (pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722) / 255;
    pixels.data[i] = 82 + 173 * value;
    pixels.data[i + 1] = 49 + 177 * value;
    pixels.data[i + 2] = 12 + 126 * value;
  }
  c.putImageData(pixels, 0, 0);
}
export function createSkinArtwork(skin, width = 1024, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d', { willReadFrequently: !!skin.gold });
  c.scale(width / 1024, height / 512);
  const random = rng(skin.seed);
  c.save();
  c.translate(512, 256);
  c.rotate((((skin.signature >>> 12) % 17) - 8) * 0.018);
  c.scale(1.2, 1.2);
  c.translate(-512, -256);
  ({
    dragon,
    doppler,
    ronin,
    circuit,
    scales,
    fracture,
    grid,
    mecha,
    engraved,
    patina,
    petals,
    frost,
    hazard,
    embers,
    neon,
    abyss,
    mirror,
    matte,
    web,
    emerald,
  })[skin.pattern](c, skin, random);
  c.restore();
  if (!skin.fullCoverage) signature(c, skin);
  // Subtle enamel grain, with no fake edge wear or random scratches across open holes.
  for (let i = 0; i < (skin.fullCoverage ? 0 : 1500); i++) {
    c.fillStyle = i % 2 ? '#ffffff09' : '#0000000b';
    c.fillRect(random() * 1024, random() * 512, 1 + random(), 1);
  }
  if (skin.gold) goldPlate(c, width, height);
  return canvas;
}
