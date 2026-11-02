import * as THREE from 'three';
import { random } from '../../shared/config.js';

function surface(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = kind === 'floor' ? '#6c756f' : kind === 'metal' ? '#66716c' : '#92958a';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) {
    const a = random(i * 7);
    c.fillStyle = `rgba(${a > 0.5 ? '255,255,240' : '0,0,0'},${random(i * 11) * 0.12})`;
    const size = random(i * 13) * 3 + 0.5;
    c.fillRect(random(i) * 256, random(i + 231) * 256, size, size);
  }
  if (kind === 'floor') {
    c.strokeStyle = '#414c47';
    c.lineWidth = 2;
    c.strokeRect(1, 1, 254, 254);
    c.strokeStyle = '#acb0a0';
    c.lineWidth = 0.5;
    c.strokeRect(3, 3, 250, 250);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#262e2b';
      c.beginPath();
      c.arc(i % 2 ? 247 : 9, i < 2 ? 9 : 247, 2, 0, 7);
      c.fill();
    }
  } else if (kind === 'metal') {
    for (let i = 0; i < 256; i += 32) {
      c.fillStyle = '#313e39';
      c.fillRect(i, 0, 2, 256);
      c.fillStyle = '#96a291';
      c.fillRect(i + 2, 0, 1, 256);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(20,28,20,0.09)';
      c.fillRect(random(i + 78) * 256, 0, random(i + 99) * 14, random(i + 213) * 256);
    }
    c.strokeStyle = 'rgba(20,25,20,.3)';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(0, 195);
    c.lineTo(65, 187);
    c.lineTo(89, 204);
    c.lineTo(140, 190);
    c.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === 'floor' ? 1 : 2, kind === 'floor' ? 1 : 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function makeMaterials() {
  const concrete = surface('concrete'),
    floor = surface('floor'),
    metal = surface('metal');
  return {
    wall: new THREE.MeshStandardMaterial({ color: 0x89948b, map: concrete, roughness: 0.96 }),
    floor: new THREE.MeshStandardMaterial({
      color: 0x8a9990,
      map: floor,
      roughness: 0.73,
      metalness: 0.18,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3d4b46, roughness: 0.5, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x182522, roughness: 0.68, metalness: 0.65 }),
    container: new THREE.MeshStandardMaterial({
      color: 0x59674a,
      map: metal,
      roughness: 0.74,
      metalness: 0.7,
    }),
    crate: new THREE.MeshStandardMaterial({
      color: 0x5b6146,
      map: concrete,
      roughness: 0.88,
      metalness: 0.2,
    }),
    lab: new THREE.MeshStandardMaterial({ color: 0x9ea89d, roughness: 0.4, metalness: 0.4 }),
    red: new THREE.MeshStandardMaterial({ color: 0x813c2a, roughness: 0.65, metalness: 0.5 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xcab76c, roughness: 0.7, metalness: 0.1 }),
    glow: new THREE.MeshStandardMaterial({
      color: 0xcde9c3,
      emissive: 0x9bdaaa,
      emissiveIntensity: 3,
    }),
    redGlow: new THREE.MeshStandardMaterial({
      color: 0xff6846,
      emissive: 0xe94c28,
      emissiveIntensity: 3,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x89cfca,
      emissive: 0x67bcb8,
      emissiveIntensity: 2,
    }),
    blood: new THREE.MeshStandardMaterial({
      color: 0x32100c,
      roughness: 0.45,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  };
}
export function labelTexture(
  text,
  sub = '',
  color = '#cee6b6',
  background = '#16231f',
  width = 1024,
  height = 256,
) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 12, height);
  ctx.font = `bold ${height * 0.32}px 'Arial', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 40, height * 0.43, width - 70);
  if (sub) {
    ctx.font = `${height * 0.12}px monospace`;
    ctx.globalAlpha = 0.65;
    ctx.fillText(sub, 43, height * 0.78, width - 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
