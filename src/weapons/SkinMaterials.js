import * as THREE from 'three';
import { skinDefinition } from '../../shared/Skins.js';
import { createSkinArtwork } from './SkinArtwork.js';

const paintable = new Set([
  'steel',
  'slide',
  'polymer',
  'wood',
  'tan',
  'gold',
  'goldDark',
  'goldLight',
  'knifeSteel',
  'knifeEdge',
  'knifeSpine',
]);
/** Bake rest-space coating coordinates before rigid meshes are merged. Moving magazines
 * and slides carry their own finish; the pattern does not swim during animations. */
export function prepareSkinGeometry(root, materials) {
  for (const [name, material] of Object.entries(materials)) material.name ||= name;
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    bounds = new THREE.Box3(),
    coated = new Set();
  const point = new THREE.Vector3(),
    normal = new THREE.Vector3();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry,
      positions = geometry.attributes.position,
      normals = geometry.attributes.normal;
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    let hand = false;
    for (let parent = mesh.parent; parent && parent !== root; parent = parent.parent)
      if (/hand/i.test(parent.name)) hand = true;
    const material = mesh.material;
    const fullMask =
      !hand &&
      !Array.isArray(material) &&
      material.isMeshStandardMaterial &&
      !material.transparent &&
      !['glove', 'glovePad', 'sleeve', 'sight', 'brass', 'lens', 'skin', 'cloth'].includes(
        material.name,
      )
        ? 1
        : 0;
    let mask =
      !hand &&
      !Array.isArray(material) &&
      material.isMeshStandardMaterial &&
      paintable.has(material.name)
        ? material.name === 'knifeEdge'
          ? 0.84
          : 1
        : 0;
    if (!material.name?.startsWith('knife')) {
      // Screws, sights, trigger controls and narrow barrels keep their original materials.
      if (Math.max(size.x, size.y, size.z) < 0.055) mask = 0;
      if (
        geometry.type === 'CylinderGeometry' &&
        Math.max(geometry.parameters.radiusTop, geometry.parameters.radiusBottom) < 0.016
      )
        mask = 0;
      if (['TorusGeometry', 'RingGeometry', 'CircleGeometry'].includes(geometry.type)) mask = 0;
    } else if (['CylinderGeometry', 'TorusGeometry'].includes(geometry.type)) mask = 0;
    const coordinates = new Float32Array(positions.count * 3),
      directions = new Float32Array(positions.count * 3);
    const masks = new Float32Array(positions.count).fill(mask);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
      point.toArray(coordinates, i * 3);
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      normal.toArray(directions, i * 3);
      if (mask > 0 || fullMask) bounds.expandByPoint(point);
    }
    if (mask > 0 || fullMask) coated.add(material);
    geometry.setAttribute('skinPosition', new THREE.BufferAttribute(coordinates, 3));
    geometry.setAttribute('skinNormal', new THREE.BufferAttribute(directions, 3));
    geometry.setAttribute('skinMask', new THREE.BufferAttribute(masks, 1));
    geometry.setAttribute(
      'skinFullMask',
      new THREE.BufferAttribute(new Float32Array(positions.count).fill(fullMask), 1),
    );
  });
  const size = bounds.getSize(new THREE.Vector3());
  size.set(Math.max(size.x, 0.001), Math.max(size.y, 0.001), Math.max(size.z, 0.001));
  return { min: bounds.min.clone(), size, materials: [...coated] };
}

function installCoating(material, uniforms) {
  material.userData.coating = uniforms;
  material.customProgramCacheKey = () => 'deadzone-original-coating-v2';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      `attribute vec3 skinPosition; attribute vec3 skinNormal; attribute float skinMask; attribute float skinFullMask;
      varying vec3 dzSkinPosition; varying vec3 dzSkinNormal; varying float dzSkinMask; varying float dzSkinFullMask;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      dzSkinPosition = skinPosition; dzSkinNormal = skinNormal; dzSkinMask = skinMask; dzSkinFullMask = skinFullMask;`,
    );
    shader.fragmentShader =
      `uniform sampler2D dzSkinMap; uniform vec3 dzSkinMin; uniform vec3 dzSkinSize;
      uniform float dzSkinEnabled; uniform float dzSkinRoughness; uniform float dzSkinMetalness;
      uniform float dzSkinFullCoverage; uniform float dzSkinSmoothNormals; uniform float dzSkinRoughnessVariation;
      varying vec3 dzSkinPosition; varying vec3 dzSkinNormal; varying float dzSkinMask; varying float dzSkinFullMask;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 dzP = clamp((dzSkinPosition - dzSkinMin) / dzSkinSize, 0.0, 1.0);
      vec3 dzWeights = pow(abs(normalize(dzSkinNormal)), vec3(5.0));
      dzWeights /= max(dot(dzWeights, vec3(1.0)), 0.0001);
      vec3 dzPaint = texture2D(dzSkinMap, vec2(1.0 - dzP.z, dzP.y)).rgb * dzWeights.x
        + texture2D(dzSkinMap, vec2(1.0 - dzP.z, dzP.x * 0.6 + 0.2)).rgb * dzWeights.y
        + texture2D(dzSkinMap, vec2(dzP.x, dzP.y)).rgb * dzWeights.z;
      float dzBlend = clamp(mix(dzSkinMask, dzSkinFullMask, dzSkinFullCoverage) * dzSkinEnabled, 0.0, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, dzPaint, dzBlend);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      float dzLuma = dot(dzPaint, vec3(0.2126, 0.7152, 0.0722));
      roughnessFactor = mix(roughnessFactor, clamp(dzSkinRoughness + (1.0 - dzLuma) * dzSkinRoughnessVariation, 0.015, 1.0), dzBlend);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      normal = normalize(mix(normal, nonPerturbedNormal, dzBlend * dzSkinSmoothNormals));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, dzSkinMetalness, dzBlend);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      totalEmissiveRadiance *= 1.0 - dzBlend * dzSkinFullCoverage;`,
    );
  };
  material.needsUpdate = true;
}

export function applyWeaponSkin(model, key, finish = 'factory') {
  const definition = skinDefinition(key, finish) || skinDefinition(key, 'factory');
  if (!definition || !model.skinSurface) return;
  model.skinId = definition.id;
  model.skinDefinition = definition;
  if (definition.id === 'factory') {
    for (const material of model.skinSurface.materials)
      if (material.userData.coating) material.userData.coating.dzSkinEnabled.value = 0;
    return;
  }
  const texture = new THREE.CanvasTexture(createSkinArtwork(definition));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.name = `${key}/${definition.id}`;
  const old = model.skinTexture;
  model.skinTexture = texture;
  for (const material of model.skinSurface.materials) {
    const uniforms = material.userData.coating || {
      dzSkinMap: { value: texture },
      dzSkinMin: { value: model.skinSurface.min },
      dzSkinSize: { value: model.skinSurface.size },
      dzSkinEnabled: { value: 1 },
      dzSkinRoughness: { value: definition.roughness },
      dzSkinMetalness: { value: definition.metalness },
      dzSkinFullCoverage: { value: definition.fullCoverage ? 1 : 0 },
      dzSkinSmoothNormals: { value: definition.smoothNormals || 0 },
      dzSkinRoughnessVariation: { value: definition.roughnessVariation ?? 0.1 },
    };
    if (!material.userData.coating) installCoating(material, uniforms);
    uniforms.dzSkinMap.value = texture;
    uniforms.dzSkinEnabled.value = 1;
    uniforms.dzSkinRoughness.value = definition.roughness;
    uniforms.dzSkinMetalness.value = definition.metalness;
    uniforms.dzSkinFullCoverage.value = definition.fullCoverage ? 1 : 0;
    uniforms.dzSkinSmoothNormals.value = definition.smoothNormals || 0;
    uniforms.dzSkinRoughnessVariation.value = definition.roughnessVariation ?? 0.1;
  }
  old?.dispose();
}
