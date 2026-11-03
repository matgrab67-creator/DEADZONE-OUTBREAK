import * as THREE from 'three';

/** One closed, articulated glove built around the knife's longitudinal grip. */
export function createKnifeHand(builder) {
  const hand = builder.assembly('rightHand');
  hand.position.set(0, 0, 0.057);
  builder.sphere(0.025, -0.009, 0, 0.024, 0.027, 0.044, 'glove', hand);
  builder.sphere(0.044, -0.005, 0.003, 0.006, 0.022, 0.034, 'glovePad', hand);
  const tube = (points, radius, material) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    return builder.mesh(
      new THREE.TubeGeometry(curve, 14, radius, 8, false),
      material,
      0,
      0,
      0,
      hand,
    );
  };
  for (let i = 0; i < 4; i++) {
    const z = -0.029 + i * 0.019;
    tube(
      [
        [0.037, -0.008, z],
        [0.026, -0.024, z],
        [0.005, -0.027, z],
        [-0.014, -0.021, z],
        [-0.019, 0.001, z],
      ],
      i === 3 ? 0.006 : 0.0068,
      'glove',
    );
    builder.sphere(0.03, -0.016, z, 0.009, 0.006, 0.007, 'glovePad', hand);
    builder.sphere(-0.019, 0.001, z, 0.0065, 0.007, 0.0065, 'glove', hand);
  }
  tube(
    [
      [0.039, 0.013, -0.012],
      [0.027, 0.025, -0.024],
      [0.011, 0.025, -0.032],
      [-0.004, 0.014, -0.034],
    ],
    0.008,
    'glove',
  );
  builder.sphere(-0.004, 0.014, -0.034, 0.008, 0.009, 0.008, 'glove', hand);
  // A single cuff and forearm follow the wrist into the lower right edge.
  builder.m.knifeSleeve = new THREE.MeshStandardMaterial({
    color: 0x384339,
    roughness: 0.97,
    metalness: 0,
    bumpMap: builder.texture,
    bumpScale: 0.0001,
  });
  const wrist = new THREE.Vector3(0.029, -0.011, 0.057),
    end = new THREE.Vector3(0.13, -0.14, 0.3);
  const direction = end.clone().sub(wrist),
    midpoint = wrist.clone().add(end).multiplyScalar(0.5);
  const sleeve = builder.cylinder(
    midpoint.x,
    midpoint.y,
    midpoint.z,
    0.028,
    direction.length(),
    'knifeSleeve',
    hand,
    'y',
    0.038,
  );
  sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  const cuff = builder.cylinder(wrist.x, wrist.y, wrist.z, 0.029, 0.026, 'glovePad', hand, 'y');
  cuff.quaternion.copy(sleeve.quaternion);
  return hand;
}
