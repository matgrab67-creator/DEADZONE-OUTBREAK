import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { chapterDefinition } from '../../shared/Chapters.js';
import { forestWeather } from '../../shared/Forest.js';

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111b19);
    this.scene.fog = new THREE.FogExp2(0x17241e, 0.027);
    this.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.07, 180);
    this.camera.rotation.order = 'YXZ';
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(new THREE.HemisphereLight(0xbacfc1, 0x18241c, 1.8));
    const sun = new THREE.DirectionalLight(0xc1d8ce, 2.2);
    sun.position.set(-14, 19, 12);
    sun.target.position.set(-17, 0, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.flash = new THREE.PointLight(0xffb56c, 0, 8, 2);
    this.scene.add(this.flash);
    this.flashlight = new THREE.SpotLight(0xfff0d5, 0, 65, 0.42, 0.5, 1);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.1;
    this.flashlight.shadow.camera.far = 65;
    this.flashlight.shadow.bias = -0.00015;
    this.flashlight.shadow.normalBias = 0.015;
    this.scene.add(this.flashlight, this.flashlight.target);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.5, 1.35);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.viewmodelScene = new THREE.Scene();
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.weaponEnvironment = pmrem.fromScene(room, 0.04);
    this.viewmodelScene.environment = this.weaponEnvironment.texture;
    room.dispose();
    pmrem.dispose();
    this.viewmodelScene.add(new THREE.HemisphereLight(0xd8e3e0, 0x27362b, 0.9));
    const light = new THREE.DirectionalLight(0xffedd9, 2.2);
    light.position.set(1, 3, 3);
    this.viewmodelScene.add(light);
    const rim = new THREE.DirectionalLight(0xb5cbdc, 1.3);
    rim.position.set(-2, 1, -2);
    this.viewmodelScene.add(rim);
    this.viewmodelCamera = new THREE.PerspectiveCamera(
      settings.viewmodelFov,
      innerWidth / innerHeight,
      0.01,
      10,
    );
    this.scale = 1;
    this.frameAverage = 16;
    this.applySettings(settings);
    this.resize = () => {
      const w = innerWidth,
        h = innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.viewmodelCamera.aspect = w / h;
      this.viewmodelCamera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    addEventListener('resize', this.resize);
    this.resize();
  }
  applySettings(settings) {
    this.settings = settings;
    const quality = {
      low: [0.85, false, false, 512],
      medium: [1, true, false, 1024],
      high: [1.35, true, true, 2048],
      ultra: [1.75, true, true, 4096],
    }[settings.quality] || [1.35, true, true, 2048];
    this.basePixelRatio = Math.min(devicePixelRatio, quality[0]);
    this.renderer.setPixelRatio(this.basePixelRatio * this.scale);
    this.composer.setPixelRatio(this.basePixelRatio * this.scale);
    this.renderer.shadowMap.enabled = quality[1];
    this.bloom.enabled = quality[2];
    if (this.sun.shadow.mapSize.x !== quality[3]) {
      this.sun.shadow.mapSize.set(quality[3], quality[3]);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.fov = settings.viewmodelFov;
    this.viewmodelCamera.updateProjectionMatrix();
  }
  setChapter(number) {
    const chapter = chapterDefinition(number);
    this.scene.background.setHex(chapter.background);
    this.scene.fog.color.setHex(chapter.fog);
    this.scene.fog.density = chapter.outdoor ? 0.021 : 0.027;
    this.sun.color.setHex(chapter.light);
    for (const light of this.scene.children)
      if (light.isHemisphereLight) {
        light.color.setHex(chapter.light);
        light.groundColor.setHex(chapter.fog);
      }
  }
  render(dt, showWeapon) {
    this.frameAverage += (dt * 1000 - this.frameAverage) * 0.02;
    if (this.settings.dynamicResolution) {
      const target = this.frameAverage > 24 ? 0.65 : this.frameAverage < 17 ? 1 : this.scale;
      if (Math.abs(target - this.scale) > 0.1) {
        this.scale += Math.sign(target - this.scale) * 0.05;
        this.renderer.setPixelRatio(this.basePixelRatio * this.scale);
        this.composer.setPixelRatio(this.basePixelRatio * this.scale);
      }
    }
    this.flash.intensity *= Math.exp(-35 * dt);
    this.composer.render();
    if (showWeapon) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.viewmodelScene, this.viewmodelCamera);
      this.renderer.autoClear = true;
    }
  }
  updateForest(time, seed, player = null) {
    const w = forestWeather(seed, time),
      day = w.daylight;
    const fog = new THREE.Color(0x0a1412)
      .lerp(new THREE.Color(0x3b4b40), day * 0.6)
      .multiplyScalar(1 - w.rain * 0.25);
    this.scene.background.copy(fog);
    this.scene.fog.color.copy(fog);
    this.scene.fog.density = 0.018 + w.rain * 0.009 + (1 - day) * 0.006;
    this.sun.color.setHex(w.rain > 0.5 ? 0xb7c5bd : 0xffd7a2);
    this.sun.intensity = 0.09 + day * 0.95 + (w.thunder ? 1.6 : 0);
    for (const light of this.scene.children)
      if (light.isHemisphereLight) {
        light.color.setHex(0xbdcec5);
        light.groundColor.setHex(0x263326);
        light.intensity = 0.26 + day * 0.66;
      }
    const x = player?.x ?? 0,
      z = player?.z ?? 0;
    this.sun.position.set(x - 25, 38, z + 20);
    this.sun.target.position.set(x, 0, z);
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.flashlight.intensity =
      player?.flashlight && !player.downed && !player.eliminated ? 180 : 0;
    this.flashlight.position.copy(this.camera.position).add(new THREE.Vector3(0.12, -0.15, 0));
    this.flashlight.target.position
      .copy(this.camera.position)
      .add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(20));
  }
  dispose() {
    removeEventListener('resize', this.resize);
    this.composer.dispose();
    this.weaponEnvironment.dispose();
    this.renderer.dispose();
  }
}
