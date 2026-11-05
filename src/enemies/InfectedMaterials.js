import * as THREE from 'three';

// Original procedural tissue, mycelium and woven fabric. Shared by pooled rigs.
function noise(x, y, seed) {
  let h = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function map(kind) {
  const size = 256,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const n = noise(x, y, 37),
        coarse = noise(Math.floor(x / 9), Math.floor(y / 9), 11);
      let r, g, b;
      if (kind === 'skin') {
        const vein = Math.pow(Math.max(0, Math.sin(x * 0.13 + Math.sin(y * 0.047) * 6)), 22);
        const lesion = Math.max(
          0,
          Math.sin(x * 0.078 + Math.cos(y * 0.043) * 4) * Math.sin(y * 0.09) - 0.45,
        );
        r = 155 + n * 22 - coarse * 19 - vein * 23 - lesion * 110;
        g = 145 + n * 18 - coarse * 20 - vein * 38 - lesion * 125;
        b = 124 + n * 17 - coarse * 10 - vein * 15 - lesion * 92;
      } else if (kind === 'fungus') {
        const dx = (x - 128) / 128,
          dy = (y - 128) / 128,
          rad = Math.hypot(dx, dy),
          angle = Math.atan2(dy, dx);
        const rings = Math.sin(rad * 85 + Math.sin(angle * 13) * 2) * 0.5 + 0.5;
        const ridge = Math.pow(Math.sin(angle * 37 + rad * 4) * 0.5 + 0.5, 4);
        r = 155 + rings * 44 + n * 20 + ridge * 22;
        g = 108 + rings * 44 + n * 15 + ridge * 20;
        b = 59 + rings * 29 + n * 13 + ridge * 14;
      } else {
        const weave = ((x % 4 === 0 ? 1 : 0) + (y % 4 === 0 ? 1 : 0)) * 14;
        const fold = Math.sin(x * 0.055 + Math.sin(y * 0.02) * 2) * 17;
        const dirt = Math.max(0, Math.sin(x * 0.038) * Math.cos(y * 0.047)) * 45;
        r = 174 + n * 18 - weave + fold - dirt;
        g = 164 + n * 15 - weave + fold - dirt;
        b = 142 + n * 13 - weave + fold - dirt;
      }
      data.set([r, g, b, 255], (y * size + x) * 4);
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.name = `infected-${kind}-original`;
  return texture;
}
export const infectedTextures = { skin: map('skin'), cloth: map('cloth'), fungus: map('fungus') };
export function fungalShelfGeometry() {
  const vertices = [],
    uv = [],
    colors = [],
    indices = [],
    segments = 24,
    rings = 5;
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring <= rings; ring++)
      for (let i = 0; i <= segments; i++) {
        const a = -Math.PI * 0.82 + (i / segments) * Math.PI * 1.64,
          t = ring / rings;
        const r = t * (1 + Math.sin(a * 9) * 0.08 + Math.cos(a * 13) * 0.04);
        const edge = Math.sin(a * 12 + t * 9) * 0.055 * t;
        vertices.push(
          Math.sin(a) * r,
          Math.cos(a) * r * 0.72,
          (side ? -0.035 : 0.035) + Math.sin(t * Math.PI) * 0.14 + edge,
        );
        uv.push(0.5 + Math.sin(a) * t * 0.5, 0.5 + Math.cos(a) * t * 0.5);
        const tint = new THREE.Color(side ? 0x6a4731 : t > 0.79 ? 0xe5d4ad : 0xa76e3e);
        colors.push(tint.r, tint.g, tint.b);
        if (ring < rings && i < segments) {
          const n = side * (rings + 1) * (segments + 1) + ring * (segments + 1) + i,
            next = n + segments + 1;
          if (side) indices.push(n, n + 1, next, n + 1, next + 1, next);
          else indices.push(n, next, n + 1, n + 1, next, next + 1);
        }
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
