import * as THREE from 'three';

function texture(kind, seed = 17) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  let state = seed;
  const rand = () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    return (state >>> 0) / 4294967296;
  };
  c.fillStyle = {
    dirt: '#555242',
    wood: '#5e4a34',
    bark: '#3f392c',
    cloth: '#74735a',
    rock: '#626b55',
  }[kind];
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4600; i++) {
    const x = rand() * 256,
      y = rand() * 256,
      light = rand() > 0.5;
    c.strokeStyle = light ? '#baac8140' : '#141a1450';
    c.fillStyle = c.strokeStyle;
    if (kind === 'wood' || kind === 'bark') {
      c.lineWidth = 0.4 + rand();
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + rand() * 4, y + 8 + rand() * 45);
      c.stroke();
    } else c.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
  }
  if (kind === 'wood')
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = '#201a1280';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(rand() * 256, rand() * 256, 6, 17, 0, 0, 7);
      c.stroke();
    }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (kind === 'dirt') t.repeat.set(8, 8);
  return t;
}
function pineNeedles() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#293d24';
  g.beginPath();
  g.moveTo(128, 0);
  g.lineTo(235, 250);
  g.lineTo(23, 250);
  g.fill();
  for (let row = 0; row < 25; row++) {
    const y = row * 10,
      x = 128 + Math.sin(row * 2) * 5,
      w = 18 + row * 4.5;
    for (const side of [-1, 1]) {
      g.strokeStyle = row % 3 ? '#536c3c' : '#84905b';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + side * w, y + 17);
      g.stroke();
      for (let n = 0; n < 15; n++) {
        const t = n / 15;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x + side * w * t, y + 17 * t);
        g.lineTo(x + side * w * t + side * 10, y + 17 * t + 10);
        g.stroke();
      }
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}
export function createForestMaterials() {
  const standard = (color, kind, roughness = 0.96) =>
    new THREE.MeshStandardMaterial({ color, map: kind ? texture(kind) : null, roughness });
  const m = {
    dirt: standard(0xb0b19d, 'dirt'),
    wood: standard(0xa9a18c, 'wood'),
    bark: standard(0xc4ba9b, 'bark'),
    leaf: standard(0x324c2e),
    grass: standard(0x637447),
    rock: standard(0xb0b29b, 'rock'),
    moss: standard(0x4c6439),
    cloth: standard(0xd3ccb3, 'cloth'),
    dark: standard(0x292b24),
    rust: standard(0x655145),
    metal: standard(0x545b50, null, 0.65),
    ember: new THREE.MeshBasicMaterial({ color: 0xff9c43 }),
    fire: new THREE.MeshBasicMaterial({
      color: 0xffb75e,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    water: new THREE.MeshStandardMaterial({
      color: 0x405f5c,
      metalness: 0.4,
      roughness: 0.23,
      transparent: true,
      opacity: 0.72,
    }),
  };
  m.leaf.map = pineNeedles();
  m.leaf.alphaTest = 0.42;
  m.leaf.side = THREE.DoubleSide;
  m.leaf.flatShading = true;
  m.grass.side = THREE.DoubleSide;
  const wind = { value: 0 };
  for (const material of [m.leaf, m.grass]) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.forestTime = wind;
      shader.vertexShader = 'uniform float forestTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float seed = instanceMatrix[3].x * .2 + instanceMatrix[3].z * .3;
        transformed.x += sin(forestTime * 1.7 + seed + position.y) * .04 * max(0., position.y);
        transformed.z += cos(forestTime + seed) * .025 * max(0., position.y);
        #endif`,
      );
    };
    material.customProgramCacheKey = () => 'forest-wind-v1';
  }
  return { materials: m, wind };
}
