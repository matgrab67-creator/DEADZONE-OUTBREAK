import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWeaponModel, createKnifeModel } from '../weapons/WeaponModels.js';
import { disposeWeaponModel } from '../weapons/ModelBuilder.js';
import { createHumanoid, disposeHumanoid } from '../enemies/ZombieModel.js';
import { animateHumanoid } from '../enemies/ZombieAnimation.js';

export class ModelPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.model = null;
    this.time = 0;
  }
  initialize() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xe4ecdf, 0x283a32, 1.8));
    const key = new THREE.DirectionalLight(0xfff1d9, 3);
    key.position.set(-2, 3, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb3d4e4, 2);
    rim.position.set(3, 1, -3);
    this.scene.add(rim);
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.03);
    this.scene.environment = this.environment.texture;
    room.dispose();
    pmrem.dispose();
    this.turntable = new THREE.Group();
    this.scene.add(this.turntable);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.01, 30);
    this.grid = new THREE.GridHelper(2, 20, 0x6c8c75, 0x31493b);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.26;
    this.scene.add(this.grid);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas.parentElement);
  }
  show(kind, id) {
    this.initialize();
    this.clear();
    this.kind = kind;
    this.id = id;
    this.model =
      kind === 'zombie'
        ? createHumanoid(id)
        : kind === 'knife'
          ? createKnifeModel(id)
          : createWeaponModel(id);
    if (kind === 'zombie') animateHumanoid(this.model, { lastAttack: -100, hitAt: -100 }, 0, 0, 0);
    else
      for (const name of ['rightHand', 'supportHand']) {
        const hand = this.model.parts[name];
        if (!hand) continue;
        hand.traverse((o) => {
          if (o.isMesh) o.geometry.dispose();
        });
        hand.removeFromParent();
      }
    const bounds = new THREE.Box3().setFromObject(this.model.root),
      center = bounds.getCenter(new THREE.Vector3());
    this.radius = Math.max(0.06, bounds.getSize(new THREE.Vector3()).length() / 2);
    this.model.root.position.sub(center);
    this.turntable.add(this.model.root);
    this.turntable.rotation.set(0, kind === 'zombie' ? 0.2 : -0.6, 0);
    this.grid.position.y = bounds.min.y - center.y - 0.008;
    this.grid.scale.setScalar(this.radius * 1.25);
    this.active = true;
    this.time = 0;
    this.resize();
    this.update(0);
  }
  resize() {
    if (!this.renderer) return;
    const width = this.canvas.parentElement.clientWidth,
      height = this.canvas.parentElement.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.model) {
      const angle = THREE.MathUtils.degToRad(36) / 2;
      const distance =
        (this.radius / Math.sin(Math.min(angle, Math.atan(Math.tan(angle) * this.camera.aspect)))) *
        1.18;
      this.camera.position.set(distance * 0.38, distance * 0.16, distance * 0.91);
      this.camera.lookAt(0, 0, 0);
    }
  }
  update(dt) {
    if (!this.active || !this.model) return;
    this.time += dt;
    this.turntable.rotation.y = THREE.MathUtils.euclideanModulo(
      this.turntable.rotation.y + dt * 0.45,
      Math.PI * 2,
    );
    if (this.kind === 'zombie')
      animateHumanoid(this.model, { lastAttack: -100, hitAt: -100 }, this.time, dt, 0);
    this.renderer.render(this.scene, this.camera);
  }
  clear() {
    if (this.model) {
      this.kind === 'zombie' ? disposeHumanoid(this.model) : disposeWeaponModel(this.model);
      this.model = null;
    }
    this.active = false;
  }
  dispose() {
    this.clear();
    this.observer?.disconnect();
    this.grid?.geometry.dispose();
    this.grid?.material.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
  }
}
