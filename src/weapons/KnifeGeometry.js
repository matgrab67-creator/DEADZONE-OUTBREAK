import * as THREE from 'three';
import { random } from '../../shared/config.js';

/** Convert a traced photo profile into metres without changing its proportions. */
export class KnifeReference {
  constructor(origin, axis, scale, gripZ = 0.055) {
    this.origin = origin;
    const length = Math.hypot(...axis);
    this.axis = axis.map((v) => v / length);
    this.scale = scale;
    this.gripZ = gripZ;
  }
  point(x, y) {
    const dx = x - this.origin[0],
      dy = y - this.origin[1],
      [ux, uy] = this.axis;
    return new THREE.Vector2(
      (dx * ux + dy * uy) * this.scale + this.gripZ,
      (dx * uy - dy * ux) * this.scale,
    );
  }
  path(commands) {
    const shape = new THREE.Shape();
    for (const [op, ...coordinates] of commands) {
      const p = [];
      for (let i = 0; i < coordinates.length; i += 2)
        p.push(this.point(coordinates[i], coordinates[i + 1]));
      if (op === 'M') shape.moveTo(p[0].x, p[0].y);
      else if (op === 'L') shape.lineTo(p[0].x, p[0].y);
      else if (op === 'Q') shape.quadraticCurveTo(p[0].x, p[0].y, p[1].x, p[1].y);
      else if (op === 'C') shape.bezierCurveTo(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
      else shape.closePath();
    }
    return shape;
  }
  hole(shape, x, y, radius) {
    const centre = this.point(x, y),
      path = new THREE.Path();
    path.absarc(centre.x, centre.y, radius * this.scale, 0, Math.PI * 2, true);
    shape.holes.push(path);
    return { centre: { x: 0, y: centre.y, z: centre.x }, radius: radius * this.scale };
  }
}

function normalizeUV(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox,
    p = geometry.attributes.position,
    uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++)
    uv.setXY(
      i,
      (p.getX(i) - min.x) / (max.x - min.x || 1),
      (p.getY(i) - min.y) / (max.y - min.y || 1),
    );
}

export function profileMesh(builder, shape, thickness, material, parent, bevel = 0.00045) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    curveSegments: 28,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelThickness: bevel,
    bevelSize: bevel,
  });
  normalizeUV(geometry);
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateY(-Math.PI / 2);
  return builder.mesh(geometry, material, 0, 0, 0, parent);
}

export function faceMesh(builder, shape, x, side, material, parent, slope = 0) {
  const geometry = new THREE.ShapeGeometry(shape, 28);
  normalizeUV(geometry);
  geometry.rotateY(-Math.PI / 2);
  if (slope) {
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) p.setX(i, side * (uv.getY(i) - 0.5) * slope);
    geometry.computeVertexNormals();
  }
  if (side > 0) {
    const index = geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      index.setX(i, index.getX(i + 2));
      index.setX(i + 2, a);
    }
    geometry.computeVertexNormals();
  }
  return builder.mesh(geometry, material, side * (x + slope / 2), 0, 0, parent);
}

/** A concave moulded grip recess, with actual surface depth around its perimeter. */
export function gripRecess(builder, shape, side, faceX, material, parent) {
  const points = shape.getPoints(18);
  if (points[0].distanceTo(points.at(-1)) < 1e-8) points.pop();
  const centre = points
    .reduce((sum, p) => sum.add(p), new THREE.Vector2())
    .multiplyScalar(1 / points.length);
  const positions = [],
    uv = [],
    rings = [
      [1, faceX],
      [0.78, faceX - 0.001],
      [0.4, faceX - 0.0022],
    ];
  const vertex = (p, x) => {
    positions.push(side * x, p.y, p.x);
    uv.push(p.x * 20, p.y * 20);
  };
  const triangle = (a, b, c) => {
    for (const [p, x] of side < 0 ? [a, b, c] : [c, b, a]) vertex(p, x);
  };
  for (let ring = 0; ring < rings.length - 1; ring++)
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const a = [points[i].clone().lerp(centre, 1 - rings[ring][0]), rings[ring][1]];
      const b = [points[j].clone().lerp(centre, 1 - rings[ring][0]), rings[ring][1]];
      const c = [points[i].clone().lerp(centre, 1 - rings[ring + 1][0]), rings[ring + 1][1]];
      const d = [points[j].clone().lerp(centre, 1 - rings[ring + 1][0]), rings[ring + 1][1]];
      triangle(a, b, c);
      triangle(b, d, c);
    }
  for (let i = 0; i < points.length; i++)
    triangle(
      [points[i].clone().lerp(centre, 0.6), faceX - 0.0022],
      [points[(i + 1) % points.length].clone().lerp(centre, 0.6), faceX - 0.0022],
      [centre, faceX - 0.0026],
    );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return builder.mesh(geometry, material, 0, 0, 0, parent);
}

export function contourLine(builder, shape, side, x, radius, material, parent) {
  const points = shape.getPoints(36).map((p) => new THREE.Vector3(side * x, p.y, p.x));
  const path = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return builder.mesh(
    new THREE.TubeGeometry(path, points.length * 2, radius, 5, false),
    material,
    0,
    0,
    0,
    parent,
  );
}

function texture(width, height, pixel, color = false) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set([...pixel(x, y), 255], (y * width + x) * 4);
  const result = new THREE.DataTexture(data, width, height);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.needsUpdate = true;
  if (color) result.colorSpace = THREE.SRGBColorSpace;
  return result;
}

export function knifeMaterials(builder) {
  const steel = texture(256, 64, (x, y) => {
    const value = Math.floor(220 + random(y * 191 + Math.floor(x / 7)) * 22);
    return [value, value, value];
  });
  const grain = texture(128, 128, (x, y) => {
    const value = Math.floor(185 + random(x + y * 128) * 20);
    return [value, value, value];
  });
  const wood = texture(
    512,
    128,
    (x, y) => {
      const wave = Math.sin(
        y * 0.55 + Math.sin(x * 0.021) * 2.4 + Math.sin(x * 0.057 + y * 0.05) * 0.8,
      );
      const fine = Math.sin(y * 2.3 + Math.sin(x * 0.015) * 2) * 5;
      const n = random(x + y * 512) * 7;
      const value = wave * 10 + fine + n;
      return [74 + value, 43 + value * 0.62, 25 + value * 0.42].map((v) =>
        Math.max(0, Math.floor(v)),
      );
    },
    true,
  );
  const standard = (color, metalness, roughness, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 0.9, ...extra });
  Object.assign(builder.m, {
    knifeSteel: standard(0x59635f, 0.93, 0.32, { bumpMap: steel, bumpScale: 0.00008 }),
    knifeEdge: standard(0xb7c1b9, 0.72, 0.28, { bumpMap: steel, bumpScale: 0.000045 }),
    knifeSpine: standard(0x414a45, 0.89, 0.38),
    knifeGrip: standard(0x242a25, 0.05, 0.77, { bumpMap: grain, bumpScale: 0.00016 }),
    knifeGripEdge: standard(0x343b33, 0.08, 0.62),
    knifeRecess: standard(0x1c231e, 0.03, 0.79),
    knifeTape: standard(0x171e1a, 0.02, 0.92, { bumpMap: grain, bumpScale: 0.00022 }),
    knifeTapeEdge: standard(0x29302a, 0.04, 0.84),
    knifeWood: standard(0xffffff, 0.04, 0.48, { map: wood, bumpMap: grain, bumpScale: 0.00013 }),
    knifeBolster: standard(0x969e8d, 0.92, 0.27, { bumpMap: steel, bumpScale: 0.00005 }),
  });
}

/** A cloth ribbon winding continuously around an oval, tapered knife handle. */
export function wrappedGrip(builder, start, end, parent, turns = 8) {
  const positions = [],
    normals = [],
    uv = [],
    steps = turns * 32;
  const point = (t, edge) => {
    const z = start + (end - start) * t + edge * 0.0023;
    const taper = 0.57 + 0.43 * Math.sin(Math.PI * Math.max(0, Math.min(1, t))) ** 0.55;
    const theta = t * turns * Math.PI * 2;
    return {
      p: new THREE.Vector3(Math.cos(theta) * 0.0095 * taper, Math.sin(theta) * 0.016 * taper, z),
      n: new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0).normalize(),
    };
  };
  for (let i = 0; i < steps; i++) {
    const a = point(i / steps, -1),
      b = point(i / steps, 1),
      c = point((i + 1) / steps, -1),
      d = point((i + 1) / steps, 1);
    for (const [value, u, v] of [
      [a, 0, i / 8],
      [c, 0, (i + 1) / 8],
      [b, 1, i / 8],
      [b, 1, i / 8],
      [c, 0, (i + 1) / 8],
      [d, 1, (i + 1) / 8],
    ]) {
      positions.push(...value.p);
      normals.push(...value.n);
      uv.push(u, v);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mesh = builder.mesh(geometry, 'knifeTape', 0, 0, 0, parent);
  const edgePoints = [];
  for (let i = 0; i <= steps; i++) edgePoints.push(point(i / steps, 1).p);
  const edgePath = new THREE.CatmullRomCurve3(edgePoints, false, 'centripetal');
  builder.mesh(
    new THREE.TubeGeometry(edgePath, steps, 0.00024, 5, false),
    'knifeTapeEdge',
    0,
    0,
    0,
    parent,
  );
  return mesh;
}
