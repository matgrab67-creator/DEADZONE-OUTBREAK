import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { labelTexture } from '../rendering/Materials.js';
import { createForestMaterials } from './ForestMaterials.js';
import {
  ForestWorld,
  generateForestChunk,
  terrainMesh,
  terrainHeight,
  campObstacles,
  forestRandom,
  pathDistance,
  initialDefenses,
  forestBounds,
  forestWeather,
  inCamp,
} from '../../shared/Forest.js';
import {
  SURVIVAL_STATIONS,
  SURVIVAL_LOGS,
  WORKBENCH,
  survivalStationBoxes,
} from '../../shared/Survival.js';
import { indexObstacles } from '../../shared/SpatialIndex.js';
import { trainingObstacles } from '../../shared/Training.js';
import { CAMP_STRUCTURES, CAMP_UPGRADES, CONTRACT_BOARD } from '../../shared/CampSystems.js';
import { translateText } from '../ui/Localization.js';

const matrix = new THREE.Matrix4(),
  position = new THREE.Vector3(),
  quaternion = new THREE.Quaternion(),
  scale = new THREE.Vector3();
const rotation = new THREE.Euler();
function instances(geo, material, entries, transform) {
  const mesh = new THREE.InstancedMesh(geo, material, entries.length);
  entries.forEach((entry, i) => {
    const t = transform(entry, i);
    position.set(...t.p);
    rotation.set(...(t.r || [0, entry.angle || 0, 0]));
    quaternion.setFromEuler(rotation);
    scale.set(...t.s);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
    if (t.color) mesh.setColorAt(i, new THREE.Color(t.color));
  });
  mesh.castShadow = material.name !== 'grass';
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}
export class ForestMap {
  constructor(scene, chapter = 1, seed = 1973, settings = {}, training = false) {
    this.scene = scene;
    this.chapter = chapter;
    this.seed = seed;
    this.settings = settings;
    this.language = settings.language || 'pl';
    this.training = training;
    this.group = new THREE.Group();
    this.group.name = 'THE LOST FOREST';
    scene.add(this.group);
    const kit = createForestMaterials();
    this.mat = kit.materials;
    this.wind = kit.wind;
    this.mat.grass.name = 'grass';
    this.sharedGeometries = new Set();
    this.geometries = {
      trunk: new THREE.CylinderGeometry(0.68, 1, 1, 7),
      crown: this.crownGeometry(),
      rock: new THREE.DodecahedronGeometry(1, 0),
      grass: this.grassGeometry(),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
    for (const g of Object.values(this.geometries)) this.sharedGeometries.add(g);
    this.world = new ForestWorld(seed);
    this.ring = 1;
    this.revision = -1;
    this.defenses = new Map();
    this.cacheMeshes = new Map();
    this.routeMeshes = new Map();
    this.trapMeshes = new Map();
    this.lanternMeshes = new Map();
    this.blueprintDrops = new Map();
    this.chunks = new Map();
    this.batches = new Map();
    this.facilityVisuals = new Map();
    this.objectiveVisual = null;
    this.buildCamp();
    this.flush(this.group);
    this.buildAtmosphere();
    this.sync({
      seed,
      ring: 1,
      revision: 0,
      claimed: [],
      routes: [],
      defenses: training ? [] : initialDefenses(),
    });
    for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) this.loadChunk(x, z);
  }
  crownGeometry() {
    const pieces = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.ConeGeometry(0.23 * (1 - i * 0.12), 0.42, 18, 2);
      const vertices = g.attributes.position;
      for (let n = 0; n < vertices.count; n++) {
        const x = vertices.getX(n),
          y = vertices.getY(n),
          z = vertices.getZ(n),
          a = Math.atan2(z, x);
        const jitter = 1 + Math.sin(a * 9 + i * 2) * 0.12;
        vertices.setXYZ(n, x * jitter, y + (y < 0 ? Math.sin(a * 9 + i) * 0.025 : 0), z * jitter);
      }
      g.computeVertexNormals();
      g.rotateY(i * 0.7);
      g.translate(0, 0.24 + i * 0.145, 0);
      pieces.push(g);
    }
    const merged = mergeGeometries(pieces);
    pieces.forEach((g) => g.dispose());
    return merged;
  }
  grassGeometry() {
    const pieces = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.ConeGeometry(0.12, 1, 3, 1, true);
      g.translate(((i % 2) - 0.5) * 0.16, 0.5, (Math.floor(i / 2) - 0.5) * 0.16);
      pieces.push(g);
    }
    const merged = mergeGeometries(pieces);
    pieces.forEach((g) => g.dispose());
    return merged;
  }
  box(x, y, z, w, h, d, material = this.mat.wood, rot = [0, 0, 0], target = null) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(...rot);
    mesh.castShadow = mesh.receiveShadow = true;
    if (target) target.add(mesh);
    else {
      mesh.updateMatrix();
      geo.applyMatrix4(mesh.matrix);
      if (!this.batches.has(material)) this.batches.set(material, []);
      this.batches.get(material).push(geo);
    }
    return mesh;
  }
  flush(target) {
    for (const [mat, geos] of this.batches) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      target.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this.batches.clear();
  }
  sign(title, subtitle, x, y, z, width = 2, angle = 0, target = this.group) {
    const map = labelTexture(
      translateText(title, this.settings.language),
      translateText(subtitle, this.settings.language),
      '#c7bea0',
    );
    const material = new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.27), material);
    mesh.userData.label = { title, subtitle };
    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    target.add(mesh);
    return mesh;
  }
  setLanguage(locale) {
    if (locale === this.language) return;
    this.language = locale;
    this.settings.language = locale;
    this.group.traverse((o) => {
      if (!o.userData.label) return;
      const { title, subtitle } = o.userData.label;
      o.material.map.dispose();
      o.material.map = labelTexture(
        translateText(title, locale),
        translateText(subtitle, locale),
        '#c7bea0',
      );
      o.material.needsUpdate = true;
    });
  }
  buildCamp() {
    if (this.training) {
      this.buildTraining();
      return;
    }
    const m = this.mat;
    for (const s of CAMP_STRUCTURES) {
      this.box(
        s.x,
        s.h / 2,
        s.z,
        s.w,
        s.h,
        s.d,
        ['medical', 'generator'].includes(s.kind) ? m.cloth : m.wood,
      );
      for (const dx of [-s.w * 0.52, s.w * 0.52])
        this.box(s.x + dx, s.h * 0.55, s.z, 0.14, s.h * 1.1, s.d + 0.35, m.bark);
      for (const dx of [-s.w * 0.26, s.w * 0.26])
        this.box(s.x + dx, s.h + 0.15, s.z, s.w * 0.58, 0.14, s.d + 0.65, m.dark, [
          0,
          0,
          dx < 0 ? 0.2 : -0.2,
        ]);
      this.sign(
        {
          medical: '+ / AMBULATORIUM',
          workshop: 'WARSZTAT',
          generator: 'GENERATOR',
          water: 'WODA',
          store: 'MAGAZYN',
        }[s.kind] || 'RADIO / WYPRAWY',
        'OBOZ OCALALYCH',
        s.x,
        s.h * 0.68,
        s.z + s.d / 2 + 0.02,
        Math.min(3, s.w * 0.8),
      );
      const additions = new THREE.Group();
      for (let i = 0; i < 3; i++)
        this.box(
          s.x + s.w * 0.35,
          0.3 + i * 0.45,
          s.z + s.d * 0.5 + 0.2,
          0.7,
          0.4,
          0.6,
          m.wood,
          [0, 0, 0.025 * i],
          additions,
        );
      this.group.add(additions);
      this.facilityVisuals.set(s.kind, additions);
    }
    this.sign(
      'TABLICA WYPRAW',
      'E / KONTRAKTY I NAGRODY',
      CONTRACT_BOARD.x,
      1.65,
      CONTRACT_BOARD.z,
      3.5,
    );
    for (const u of CAMP_UPGRADES)
      this.sign(u.name, 'E / ROZBUDOWA DLA DRUZYNY', u.x, 1.25, u.z, 2.7);
    for (const b of campObstacles().filter((b) => b.id.startsWith('camp-wall'))) {
      const alongX = b.w > b.d,
        length = alongX ? b.w : b.d;
      for (let i = 0.22; i < length; i += 0.48) {
        const h =
          b.h *
          (0.92 +
            forestRandom(this.seed, Math.round(b.x), Math.round(b.z), Math.round(i * 10)) * 0.14);
        this.box(
          b.x + (alongX ? i - length / 2 : 0),
          h / 2,
          b.z + (!alongX ? i - length / 2 : 0),
          alongX ? 0.44 : 0.24,
          h,
          alongX ? 0.24 : 0.44,
          m.wood,
          [0, 0, Math.sin(i) * 0.015],
        );
      }
      for (const y of [0.6, 2.2])
        this.box(b.x, y, b.z, alongX ? length : 0.4, 0.16, alongX ? 0.4 : length, m.bark);
    }
    this.box(-20, 1.1, 7, 4, 2.2, 3, m.cloth);
    this.box(-20, 2.35, 7, 4.6, 0.13, 3.7, m.cloth, [0, 0, 0.05]);
    this.sign('ABRI / 07', 'SCHRONIENIE OCALALYCH', -20, 1.4, 8.52, 2.8);
    this.vehicle(0, 0, 8, false);
    this.box(0, 0.6, -9, 3, 1.2, 2, m.wood);
    for (let x = -1; x <= 1; x++) this.box(x, 0.62, -9, 0.08, 1.27, 2.08, m.metal);
    for (const [x, z] of [
      [-24, -17],
      [24, 17],
    ])
      this.tower(x, 0, z);
    for (const s of [...SURVIVAL_STATIONS, WORKBENCH]) {
      const wide = s.type === 'store' || s.type === 'mystery';
      const w = wide ? 1.7 : 1;
      this.box(s.x, 0.95, s.z, w, 0.12, 0.7, m.wood);
      for (const dx of [-w * 0.38, w * 0.38])
        for (const dz of [-0.25, 0.25]) this.box(s.x + dx, 0.45, s.z + dz, 0.09, 0.9, 0.09, m.bark);
      this.box(s.x, 0.3, s.z, w * 0.8, 0.3, 0.55, m.dark);
      if (s.type === 'store') {
        this.box(s.x, 1.08, s.z, 1.1, 0.1, 0.12, m.metal);
        this.box(s.x + 0.3, 1.04, s.z, 0.3, 0.16, 0.14, m.wood);
        this.box(s.x - 0.02, 0.99, s.z + 0.02, 0.1, 0.22, 0.13, m.dark, [0, 0, 0.2]);
      } else if (s.type === 'mystery') {
        this.box(s.x, 1.24, s.z, 1.5, 0.48, 0.62, m.wood);
        for (const dx of [-0.5, 0.5])
          this.box(s.x + dx, 1.25, s.z + 0.32, 0.08, 0.48, 0.02, m.rust);
      } else if (s.type === 'perk' && s.perk === 'heart') {
        this.box(s.x, 1.28, s.z, 0.45, 0.45, 0.3, m.cloth);
        this.sign('+', 'MEDYCYNA', s.x, 1.3, s.z + 0.17, 0.4);
        for (const dx of [-1.2, 1.2]) this.box(s.x + dx, 1.5, s.z, 0.08, 3, 0.08, m.wood);
        this.box(s.x, 3, s.z, 2.7, 0.08, 1.8, m.cloth, [0, 0, -0.06]);
      } else this.box(s.x, 1.09, s.z, 0.5, 0.18, 0.3, m.metal);
      this.sign(
        s.name,
        s.type === 'store'
          ? 'E / MAGAZYN / BROŃ PODSTAWOWA'
          : s.id === WORKBENCH.id
            ? 'E / CRAFTING I MODYFIKACJE'
            : 'E / ZAPASY OCALALYCH',
        s.x,
        0.66,
        s.z + 0.365,
        w * 0.94,
      );
    }
    this.sign('THE LOST FOREST', 'OBÓZ OCALAŁYCH / OSTATNIE SCHRONIENIE', -11, 2.7, -19.6, 7);
    this.sign(
      'PÓŁNOC / GŁĘBOKI LAS',
      'NOWE SZLAKI PO FALACH 4 / 7 / 11 / 16',
      4.2,
      2.1,
      -17.5,
      2.8,
      -0.25,
    );
    for (const x of [-2.5, 2.5]) this.box(x, 1, -17.5, 0.12, 2, 0.12, m.bark);
    this.box(-8, 0.25, 3, 2, 0.5, 0.55, m.wood, [0, 0.3, 0]);
    this.box(-4, 0.25, 3, 2, 0.5, 0.55, m.wood, [0, -0.3, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const stone = new THREE.Mesh(this.geometries.rock, m.rock);
      stone.position.set(-6 + Math.cos(a) * 0.85, 0.12, 3 + Math.sin(a) * 0.85);
      stone.scale.set(0.22, 0.16, 0.2);
      this.group.add(stone);
    }
    for (const a of [-0.6, 0.6]) this.box(-6, 0.14, 3, 1.3, 0.18, 0.2, m.bark, [0, a, 0]);
    this.flames = new THREE.Group();
    this.flames.position.set(-6, 0.3, 3);
    for (let i = 0; i < 5; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 5), m.fire);
      flame.position.set(Math.sin(i) * 0.25, 0.25, Math.cos(i) * 0.25);
      this.flames.add(flame);
    }
    this.group.add(this.flames);
    this.fireLight = new THREE.PointLight(0xffa652, 28, 17, 2);
    this.fireLight.position.set(-6, 1.2, 3);
    this.group.add(this.fireLight);
    for (const [x, z] of [
      [-18, 13],
      [6, 4],
      [18, -13],
    ]) {
      this.box(x, 2.15, z, 0.08, 4.3, 0.08, m.bark);
      this.box(x, 3.95, z, 0.26, 0.42, 0.26, m.ember);
      const lamp = new THREE.PointLight(0xffd193, 11, 15, 2);
      lamp.position.set(x, 3.9, z);
      this.group.add(lamp);
    }
    // Scavenged generator, wire reels and beds remain environmental props, not neon machines.
    this.box(21, 0.45, -11, 1.4, 0.9, 0.9, m.dark);
    this.box(21, 0.9, -11, 1.2, 0.12, 0.9, m.rust);
    this.collectibles = new Map();
    for (const log of SURVIVAL_LOGS) {
      const mesh = this.box(log.x, 0.1, log.z, 0.32, 0.08, 0.4, m.cloth, [0, 0.2, 0], this.group);
      this.collectibles.set(log.id, mesh);
    }
  }
  buildTraining() {
    const m = this.mat;
    this.collectibles = new Map();
    for (const b of trainingObstacles(this.world).filter((b) => b.id.startsWith('range-')))
      this.box(b.x, b.y, b.z, b.w, b.h, b.d, m.wood);
    for (let x = -18; x <= 18; x += 3) {
      this.box(x, 0.008, -2, 0.045, 0.016, 27, m.cloth);
      this.box(x, 1.2, -15.7, 0.12, 2.4, 0.1, m.bark);
    }
    for (const z of [-10, 0, 10]) this.box(0, 0.018, z, 35, 0.035, 0.06, m.cloth);
    for (const x of [-15, 15]) {
      this.box(x, 3, 12, 0.15, 6, 0.15, m.bark);
      this.box(x, 5.7, 12, 0.6, 0.15, 0.4, m.ember);
      const lamp = new THREE.PointLight(0xe9d5aa, 22, 35, 2);
      lamp.position.set(x, 5.5, 10);
      this.group.add(lamp);
    }
    this.sign('POLIGON / OBOZ 07', 'PRECYZJA / TRACKING / REFLEKS', 0, 3, -15.7, 9);
    this.sign('20 METROW', 'PRZELADOWUJ / KONTROLUJ ODRZUT', -15, 1.8, -10, 3);
    this.sign('TRENING UMIEJETNOSCI', 'P / WYBIERZ BRON I CWICZENIE', 12, 1.8, 8, 4, Math.PI);
  }
  tower(x, y, z) {
    const m = this.mat;
    for (const dx of [-1, 1])
      for (const dz of [-1, 1]) this.box(x + dx, y + 2.4, z + dz, 0.2, 4.8, 0.2, m.bark);
    this.box(x, y + 4, z, 2.7, 0.2, 2.7, m.wood);
    this.box(x, y + 6, z, 3.2, 0.15, 3.2, m.cloth, [0, 0, 0.07]);
    for (const dz of [-1.2, 1.2]) this.box(x, y + 4.8, z + dz, 2.5, 0.8, 0.1, m.wood);
    for (let i = 0; i < 10; i++)
      this.box(x - 0.65, y + 0.3 + i * 0.4, z + 1.6, 0.7, 0.06, 0.12, m.bark);
    for (const dx of [-1.05, -0.25]) this.box(x + dx, y + 2, z + 1.6, 0.1, 4, 0.1, m.bark);
  }
  vehicle(x, y, z, large = true) {
    const m = this.mat;
    this.box(x, y + 0.6, z, 4.5, 0.8, 1.7, m.rust);
    this.box(x + 0.2, y + 1.2, z, 2.3, 0.5, 1.6, m.dark);
    this.box(x + 0.2, y + 1.54, z, 2.4, 0.14, 1.6, m.metal, [0, 0, 0.05]);
    for (const dx of [-1.4, 1.4])
      for (const dz of [-0.82, 0.82]) this.box(x + dx, y + 0.3, z + dz, 0.6, 0.6, 0.28, m.dark);
    if (large) this.box(x - 0.2, y + 1.8, z, 3, 0.06, 0.4, m.moss, [0, 0, 0.07]);
  }
  buildAtmosphere() {
    const count = 800,
      positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = forestRandom(this.seed, i, 0, 2) * 70 - 35;
      positions[i * 3 + 1] = forestRandom(this.seed, i, 0, 3) * 20;
      positions[i * 3 + 2] = forestRandom(this.seed, i, 0, 4) * 70 - 35;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xb9c9bb,
        size: 0.065,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    this.group.add(this.rain);
    const leafGeo = new THREE.BufferGeometry();
    leafGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, 180), 3));
    this.leaves = new THREE.Points(
      leafGeo,
      new THREE.PointsMaterial({
        color: 0xaf9d65,
        size: 0.045,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    this.leaves.frustumCulled = false;
    this.group.add(this.leaves);
    this.shafts = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(32, 64, 0, 32, 64, 64);
    glow.addColorStop(0, '#777');
    glow.addColorStop(0.45, '#444');
    glow.addColorStop(1, '#000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 128);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xc7c5a1,
      alphaMap: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 22), shaftMat);
      mesh.position.set(-18 + i * 12, 8, -7);
      mesh.rotation.z = -0.3;
      this.shafts.add(mesh);
    }
    this.group.add(this.shafts);
  }
  loadChunk(cx, cz) {
    const key = `${cx}:${cz}`;
    if (this.chunks.has(key)) return;
    const data = this.world.chunks.get(key) || generateForestChunk(this.seed, cx, cz),
      group = new THREE.Group();
    group.name = `forest:${key}`;
    const terrain = terrainMesh(this.seed, cx, cz),
      geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(terrain.vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(terrain.indices, 1));
    const uv = [],
      colors = [];
    for (let i = 0; i < terrain.vertices.length; i += 3) {
      const x = terrain.vertices[i],
        z = terrain.vertices[i + 2],
        path = pathDistance(x, z),
        camp = inCamp(x, z);
      uv.push((x - cx * 24 + 12) / 24, (z - cz * 24 + 12) / 24);
      const variation = 0.9 + forestRandom(this.seed, Math.round(x), Math.round(z), 7) * 0.15;
      const color = new THREE.Color(
        camp ? 0xaaa18b : path < 2.8 ? 0x9b8e78 : 0x637157,
      ).multiplyScalar(variation);
      colors.push(color.r, color.g, color.b);
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.mat.dirt.vertexColors = true;
    const ground = new THREE.Mesh(geo, this.mat.dirt);
    ground.receiveShadow = true;
    group.add(ground);
    const trunks = instances(this.geometries.trunk, this.mat.bark, data.trees, (t) => ({
      p: [t.x, t.y + t.h * 0.32, t.z],
      s: [t.radius, t.h * 0.64, t.radius],
    }));
    const crowns = instances(this.geometries.crown, this.mat.leaf, data.trees, (t) => ({
      p: [t.x, t.y + t.h * 0.1, t.z],
      s: [t.h * (t.old ? 1.3 : 1.1), t.h, t.h * (t.old ? 1.3 : 1.1)],
      color: t.old ? 0x668454 : 0x829c75,
    }));
    const grass = instances(this.geometries.grass, this.mat.grass, data.grass, (t) => ({
      p: [t.x, t.y, t.z],
      s: [0.7, t.h, 0.7],
    }));
    grass.castShadow = false;
    const rocks = instances(this.geometries.rock, this.mat.rock, data.rocks, (t) => ({
      p: [t.x, t.y + t.r * 0.35, t.z],
      s: [t.r, t.r * 0.65, t.r * 0.9],
    }));
    const moss = instances(this.geometries.rock, this.mat.moss, data.rocks, (t) => ({
      p: [t.x, t.y + t.r * 0.7, t.z],
      s: [t.r * 0.8, t.r * 0.22, t.r * 0.7],
    }));
    group.add(trunks, crowns, grass, rocks, moss);
    for (const p of data.props) this.poi(p, group);
    if (data.fallen) {
      const t = data.fallen;
      this.box(t.x, t.y + 0.24, t.z, 4, 0.42, 0.48, this.mat.bark, [0, 0, 0]);
    }
    this.flush(group);
    if (data.cache) {
      const c = data.cache;
      const cache = this.box(
        c.x,
        terrainHeight(this.seed, c.x, c.z) + 0.32,
        c.z,
        0.75,
        0.64,
        0.65,
        this.mat.wood,
        [0, 0.1, 0],
        group,
      );
      this.cacheMeshes.set(c.id, cache);
      cache.visible = !this.claimed.has(c.id);
    }
    if (data.poi?.type === 'cabin') {
      const p = data.poi,
        id = `route:${key}`,
        gate = new THREE.Group();
      for (let i = 0; i < 6; i++)
        this.box(
          p.x,
          p.y + 0.22 + i * 0.38,
          p.z + 3.5,
          3,
          0.26,
          0.22,
          this.mat.wood,
          [0, 0, i % 2 ? 0.03 : -0.03],
          gate,
        );
      gate.visible = !this.openRoutes.has(id);
      group.add(gate);
      this.routeMeshes.set(id, gate);
    }
    this.group.add(group);
    this.chunks.set(key, { group, data, grass, trunks, crowns });
  }
  poi(p, target) {
    const { x, y, z, type } = p,
      m = this.mat;
    if (type === 'cabin' || type === 'ruins') {
      for (const dx of [-3.5, 3.5]) this.box(x + dx, y + 1.4, z, 0.24, 2.8, 7, m.wood);
      this.box(x, y + 1.4, z - 3.5, 7, 2.8, 0.24, m.wood);
      for (const dx of [-2.5, 2.5]) this.box(x + dx, y + 1.4, z + 3.5, 2, 2.8, 0.24, m.wood);
      if (type === 'cabin') {
        for (const dx of [-1.9, 1.9])
          this.box(x + dx, y + 3.2, z, 4.2, 0.2, 8, m.dark, [0, 0, dx > 0 ? -0.28 : 0.28]);
        this.box(x - 2, y + 0.35, z - 1.7, 1, 0.7, 2.4, m.wood);
      } else {
        this.box(x, y + 0.3, z, 5, 0.55, 1, m.bark, [0, 0.5, -0.1]);
      }
      this.sign(
        'NIE WRACAJ PO ZMROKU',
        'ZAPASY / PRZESZUKAJ CHATĘ',
        x,
        y + 2.3,
        z + 3.64,
        2.2,
        0,
        target,
      );
    } else if (type === 'wreck') this.vehicle(x, y, z);
    else if (type === 'tower') this.tower(x, y, z);
    else {
      for (const dx of [-2.4, 2.4]) {
        this.box(x + dx, y + 0.7, z, 2, 1.4, 2.5, m.cloth, [0, 0, dx > 0 ? 0.07 : -0.08]);
        this.box(x + dx, y + 0.1, z + 2, 1.6, 0.2, 0.4, m.bark);
      }
      this.sign(
        'OPUSZCZONY BIWAK',
        'OSTATNI SYGNAŁ: 38 DNI TEMU',
        x,
        y + 1.3,
        z + 3,
        2.2,
        0,
        target,
      );
    }
    // Shallow stream sections and improvised crossings in the eastern forest.
    if (Math.abs(x - 72) < 13) {
      this.box(x + 8, y - 0.01, z, 2.3, 0.03, 24, m.water);
      for (let i = 0; i < 7; i++)
        this.box(x + 6.5 + i * 0.45, y + 0.09, z + 5, 0.4, 0.08, 2.2, m.wood, [
          0,
          0,
          i === 4 ? 0.16 : 0,
        ]);
    }
  }
  sync(forest) {
    if (!forest) return;
    if (forest.seed !== this.seed) return;
    const topologyChanged = this.ring !== forest.ring || this.revision !== forest.revision;
    this.ring = forest.ring;
    this.revision = forest.revision;
    this.claimed = new Set(forest.claimed);
    this.openRoutes = new Set(forest.routes || []);
    this.world.ensure(this.ring);
    this.worldState = forest;
    for (const d of forest.defenses) {
      let visual = this.defenses.get(d.id);
      if (!visual) {
        const root = new THREE.Group(),
          boards = [];
        for (const side of [-1, 1])
          this.box(
            d.x + (d.axis === 'z' ? side * 2.3 : 0),
            0.9,
            d.z + (d.axis === 'x' ? side * 2.3 : 0),
            0.2,
            1.8,
            0.2,
            this.mat.bark,
            [0, 0, 0],
            root,
          );
        for (let i = 0; i < 5; i++)
          boards.push(
            this.box(
              d.x,
              0.22 + i * 0.23,
              d.z,
              d.axis === 'z' ? 4.5 : 0.14,
              0.17,
              d.axis === 'x' ? 4.5 : 0.14,
              this.mat.wood,
              [0, 0, i % 2 ? 0.03 : -0.03],
              root,
            ),
          );
        this.group.add(root);
        visual = { root, boards };
        this.defenses.set(d.id, visual);
      }
      visual.boards.forEach((board, i) => {
        board.visible = d.hp / d.maxHp > i / 5;
        board.rotation.z = (i % 2 ? 1 : -1) * (d.hp < d.maxHp * 0.3 ? 0.14 : 0.03);
      });
    }
    for (const [id, mesh] of this.cacheMeshes) mesh.visible = !this.claimed.has(id);
    for (const [id, mesh] of this.routeMeshes) mesh.visible = !this.openRoutes.has(id);
    if (topologyChanged || !this.obstacles)
      this.obstacles = this.training
        ? indexObstacles(trainingObstacles(this.world))
        : indexObstacles([
            ...this.world.obstacles(forest.defenses, forest.routes),
            ...survivalStationBoxes(),
          ]);
  }
  interactions(state) {
    return [
      ...SURVIVAL_STATIONS,
      WORKBENCH,
      ...(state.blueprints || []),
      ...this.world.caches(state.forest.claimed),
      ...this.world.routes(state.forest.routes),
      CONTRACT_BOARD,
      ...CAMP_UPGRADES.map((u) => ({
        ...u,
        name: `${u.name} / ${state.campLevels?.[u.id] || 0}/3`,
        price: 0,
      })),
      ...state.forest.defenses.map((d) => ({
        ...d,
        type: 'defense',
        price: 0,
        name: `${d.name} / ${Math.ceil(d.hp)} HP`,
        progress: d.hp / d.maxHp,
      })),
      ...SURVIVAL_LOGS.filter((c) => !state.collected.includes(c.id)).map((c) => ({
        ...c,
        type: 'log',
        name: 'DZIENNIK OCALAŁYCH',
        price: 0,
      })),
    ];
  }
  stream(camera) {
    const cx = Math.round(camera.x / 24),
      cz = Math.round(camera.z / 24),
      candidates = [];
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx,
          z = cz + dz;
        if (Math.abs(x) > this.ring + 1 || Math.abs(z) > this.ring + 1) continue;
        candidates.push({
          x,
          z,
          distance: Math.hypot(x * 24 - camera.x, z * 24 - camera.z),
          key: `${x}:${z}`,
        });
      }
    candidates.sort((a, b) => a.distance - b.distance);
    const missing = candidates.find((c) => !this.chunks.has(c.key));
    if (missing) this.loadChunk(missing.x, missing.z);
    const keep = new Set(candidates.map((c) => c.key));
    for (const [key, c] of this.chunks) {
      if (!keep.has(key)) {
        this.disposeChunk(c);
        this.chunks.delete(key);
        continue;
      }
      const distance = Math.hypot(c.data.cx * 24 - camera.x, c.data.cz * 24 - camera.z);
      c.grass.visible = distance < (this.settings.quality === 'low' ? 26 : 48);
      c.trunks.visible = distance < 85;
      c.crowns.castShadow = distance < 48;
    }
  }
  update(time, dt, state, camera = { x: -18, z: 15 }) {
    if (state?.forest) this.sync(state.forest);
    this.stream(camera);
    this.wind.value = time;
    this.updateLanterns(state?.lanterns || [], time);
    if (this.fireLight) this.fireLight.intensity = 25 + Math.sin(time * 17) * 3;
    this.flames?.children.forEach((f, i) => {
      f.scale.set(1 + Math.sin(time * 9 + i) * 0.15, 0.8 + Math.sin(time * 11 + i) * 0.3, 1);
      f.rotation.y = time * 0.4 + i;
    });
    const weather = forestWeather(this.seed, state?.time ?? time);
    const rain = this.rain.geometry.attributes.position;
    for (let i = 0; i < rain.count; i++) {
      let y = rain.getY(i) - dt * 20;
      if (y < 0) y += 20;
      rain.setY(i, y);
    }
    rain.needsUpdate = true;
    this.rain.position.set(camera.x, 0, camera.z);
    this.rain.visible = weather.rain > 0.02;
    this.rain.material.opacity = weather.rain * 0.45;
    this.leaves.position.set(camera.x + Math.sin(time * 0.3) * 2, Math.sin(time * 0.2), camera.z);
    this.shafts.visible = weather.daylight > 0.4 && weather.rain < 0.5;
    this.mat.dirt.roughness = 1 - weather.rain * 0.4;
    this.mat.wood.roughness = 0.95 - weather.rain * 0.24;
    for (const [id, mesh] of this.collectibles) mesh.visible = !state?.collected.includes(id);
    this.updateWorldItems(state);
  }
  updateWorldItems(state) {
    const levels = state?.campLevels || {};
    for (const [k, g] of this.facilityVisuals)
      g.children.forEach((m, i) => (m.visible = i < (levels[k === 'medical' ? 'clinic' : k] || 0)));
    if (this.fireLight) this.fireLight.intensity *= 1 + (levels.generator || 0) * 0.25;
    const c = state?.contract;
    if (c?.kind === 'nest' && !c.ready) {
      if (!this.objectiveVisual || this.objectiveVisual.userData.id !== c.id) {
        this.clearObjective();
        const g = new THREE.Group();
        g.userData.id = c.id;
        for (let i = 0; i < 9; i++) {
          const mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.3 + i * 0.02, 1),
            i % 2 ? this.mat.bark : this.mat.moss,
          );
          mesh.position.set(
            Math.sin(i * 2.4) * 0.5,
            0.25 + Math.cos(i) * 0.15,
            Math.cos(i * 2.4) * 0.5,
          );
          g.add(mesh);
        }
        g.position.set(c.x, terrainHeight(this.seed, c.x, c.z), c.z);
        this.group.add(g);
        this.objectiveVisual = g;
      }
    } else this.clearObjective();
    for (const [list, map, material] of [
      [state?.traps || [], this.trapMeshes, this.mat.metal],
      [state?.blueprints || [], this.blueprintDrops, this.mat.cloth],
    ]) {
      const active = new Set(list.map((x) => x.id));
      for (const [id, mesh] of map)
        if (!active.has(id)) {
          mesh.removeFromParent();
          mesh.geometry.dispose();
          map.delete(id);
        }
      for (const item of list)
        if (!map.has(item.id)) {
          const trap = map === this.trapMeshes;
          const mesh = new THREE.Mesh(
            trap
              ? new THREE.TorusGeometry(0.38, 0.045, 5, 12, Math.PI * 1.8)
              : new THREE.BoxGeometry(0.28, 0.08, 0.38),
            material,
          );
          if (trap) mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(item.x, terrainHeight(this.seed, item.x, item.z) + 0.08, item.z);
          this.group.add(mesh);
          map.set(item.id, mesh);
        }
    }
  }
  updateLanterns(lanterns, time) {
    const active = new Set(lanterns.map((l) => l.id));
    for (const [id, group] of this.lanternMeshes)
      if (!active.has(id)) {
        group.traverse((o) => {
          if (o.geometry && !this.sharedGeometries.has(o.geometry)) o.geometry.dispose();
        });
        group.userData.glow.dispose();
        group.removeFromParent();
        this.lanternMeshes.delete(id);
      }
    for (const l of lanterns) {
      let group = this.lanternMeshes.get(l.id);
      if (!group) {
        group = new THREE.Group();
        group.name = 'PROTECTIVE LANTERN';
        const part = (geometry, material, y) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.y = y;
          mesh.castShadow = true;
          group.add(mesh);
          return mesh;
        };
        const glow = new THREE.MeshStandardMaterial({
          color: 0xffd36b,
          emissive: 0xffa62f,
          emissiveIntensity: 3,
          roughness: 0.25,
        });
        group.userData.glow = glow;
        part(new THREE.CylinderGeometry(0.23, 0.29, 0.12, 8), this.mat.metal, 0.12);
        part(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 6), this.mat.metal, 0.46);
        part(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 8), this.mat.metal, 0.79);
        part(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 8), glow, 1);
        part(new THREE.ConeGeometry(0.28, 0.17, 8), this.mat.metal, 1.28);
        for (let n = 0; n < 4; n++) {
          const rail = part(
            new THREE.CylinderGeometry(0.015, 0.015, 0.47, 4),
            this.mat.metal,
            1.03,
          );
          rail.position.x = Math.cos((n * Math.PI) / 2) * 0.19;
          rail.position.z = Math.sin((n * Math.PI) / 2) * 0.19;
        }
        const handle = part(
          new THREE.TorusGeometry(0.12, 0.015, 4, 12, Math.PI),
          this.mat.metal,
          1.36,
        );
        const light = new THREE.PointLight(0xffc465, 38, 15, 1.5);
        light.position.y = 1.07;
        group.add(light);
        group.userData.light = light;
        group.position.set(l.x, terrainHeight(this.seed, l.x, l.z), l.z);
        this.group.add(group);
        this.lanternMeshes.set(l.id, group);
      }
      group.userData.light.intensity = 36 + Math.sin(time * 9) * 2;
    }
  }
  clearObjective() {
    if (!this.objectiveVisual) return;
    this.objectiveVisual.traverse((o) => o.geometry?.dispose());
    this.objectiveVisual.removeFromParent();
    this.objectiveVisual = null;
  }
  disposeChunk(chunk) {
    const geos = new Set(),
      mats = new Set();
    chunk.group.traverse((o) => {
      if (o.geometry && !this.sharedGeometries.has(o.geometry)) geos.add(o.geometry);
      if (o.material && !Object.values(this.mat).includes(o.material)) mats.add(o.material);
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    if (chunk.data.cache) this.cacheMeshes.delete(chunk.data.cache.id);
    this.routeMeshes.delete(`route:${chunk.data.key}`);
    chunk.group.removeFromParent();
  }
  dispose() {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    const geos = new Set(),
      mats = new Set(Object.values(this.mat));
    this.group.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) mats.add(o.material);
    });
    this.sharedGeometries.forEach((g) => geos.add(g));
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      m.map?.dispose();
      m.alphaMap?.dispose();
      m.dispose();
    });
    this.group.removeFromParent();
    this.world.chunks.clear();
  }
}
