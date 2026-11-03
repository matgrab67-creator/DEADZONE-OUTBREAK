import * as THREE from 'three';
import { createKnifeModel, createWeaponModel } from './WeaponModels.js';
import { disposeWeaponModel } from './ModelBuilder.js';
import { canonicalKnifeId } from '../../shared/Knives.js';
import { WEAPONS } from '../../shared/config.js';

const smoothstep = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

export class WeaponView {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.model = null;
    this.id = '';
    this.upgraded = false;
    this.kick = 0;
    this.kickVelocity = 0;
    this.roll = 0;
    this.flashTime = 0;
    this.shotAge = 10;
    this.reloadDuration = 1;
    this.ads = 0;
    this.bob = 0;
    this.sway = new THREE.Vector2();
    this.inspectTime = 0;
    this.inspectBlend = 0;
    this.knifeModel = 'karambit';
    this.knifeEquipped = false;
    this.slashTime = 0;
    this.slashCount = 0;
    this.drawAge = 10;
    this.ejection = new THREE.Vector3();
    this.inspectPosition = new THREE.Vector3();
    this.caseIndex = 0;
    const geometry = new THREE.CylinderGeometry(0.0038, 0.0038, 0.017, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x9b8043,
      metalness: 0.85,
      roughness: 0.3,
    });
    this.cases = Array.from({ length: 14 }, () => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3(), life: 0, spin: 0 };
    });
  }
  build(id, upgraded, variant = this.knifeModel) {
    disposeWeaponModel(this.model);
    this.model = id === 'knife' ? createKnifeModel(variant) : createWeaponModel(id, upgraded);
    this.group.add(this.model.root);
    this.id = id;
    this.upgraded = upgraded;
    this.variant = variant;
    this.kick = 0;
    this.kickVelocity = 0;
    this.shotAge = 10;
    this.ads = 0;
    this.inspectTime = 0;
    this.inspectBlend = 0;
    this.drawAge = 0;
    this.slashTime = 0;
    this.inspectPosition.fromArray(this.model.inspect);
    this.rest = {};
    for (const [name, part] of Object.entries(this.model.parts))
      this.rest[name] = { position: part.position.clone(), rotation: part.rotation.clone() };
    this.flash = null;
    if (this.model.parts.muzzle) {
      const flash = new THREE.Group();
      flash.name = 'muzzleFlash';
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            -0.016, 0, 0, 0.016, 0, 0, 0, 0, -0.09, 0, -0.014, 0, 0, 0.014, 0, 0, 0, -0.075, -0.007,
            -0.008, -0.005, 0.007, 0.008, -0.005, 0.007, -0.006, -0.065,
          ],
          3,
        ),
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0xffdb9c,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      flash.add(new THREE.Mesh(geometry, material));
      flash.visible = false;
      this.model.parts.muzzle.add(flash);
      this.flash = flash;
    }
    this.group.position.fromArray(this.model.hip);
  }
  inspect() {
    if (this.model) {
      this.inspectTime = 2.8;
      this.ads = 0;
    }
  }
  slash() {
    this.slashCount++;
    this.slashDuration = this.knifeModel === 'stiletto' ? 0.48 : 0.42;
    this.slashTime = this.slashDuration;
    this.inspectTime = 0;
    this.kickVelocity += 0.28;
  }
  shoot(event = {}) {
    this.inspectTime = 0;
    const amount = this.model?.recoilScale || 1;
    this.kickVelocity += 0.7 * amount;
    this.roll = ((event.index || 1) % 2 ? 1 : -1) * 0.012 * amount;
    this.flashTime = this.id === 'spectre' ? 0.022 : 0.035;
    this.shotAge = 0;
    if (this.flash) this.flash.rotation.z = (event.index || 1) * 2.399;
    if (this.model) {
      const casing = this.cases[this.caseIndex++ % this.cases.length];
      this.group.updateMatrixWorld(true);
      this.ejection.set(0.027, 0.025, -0.027);
      this.group.localToWorld(this.ejection);
      casing.mesh.position.copy(this.ejection);
      casing.mesh.visible = true;
      casing.life = 0.8;
      casing.mesh.scale.setScalar(this.id === 'iron' ? 1.8 : this.id === 'vx9' ? 0.8 : 1);
      casing.velocity.set(0.7 + Math.random() * 0.4, 0.5 + Math.random() * 0.25, 0.15);
      casing.spin = 8 + Math.random() * 12;
    }
  }
  reload(duration) {
    this.reloadDuration = duration;
    this.inspectTime = 0;
  }
  reset() {
    this.kick = 0;
    this.kickVelocity = 0;
    this.ads = 0;
    this.inspectTime = 0;
    this.inspectBlend = 0;
    this.flashTime = 0;
    this.shotAge = 10;
    this.slashTime = 0;
    this.drawAge = 10;
    for (const casing of this.cases) {
      casing.life = 0;
      casing.mesh.visible = false;
    }
  }
  update(p, input, dt, time, settings, knifeEquipped = false) {
    const inv = p.inventory[p.slot];
    this.knifeModel = canonicalKnifeId(settings.knifeModel);
    this.knifeEquipped = knifeEquipped;
    const modelId = knifeEquipped ? 'knife' : inv.id,
      variant = knifeEquipped ? this.knifeModel : '';
    if (
      modelId !== this.id ||
      inv.upgraded !== this.upgraded ||
      (knifeEquipped && variant !== this.variant)
    )
      this.build(modelId, inv.upgraded, variant);
    const model = this.model,
      parts = model.parts;
    this.slashTime = Math.max(0, this.slashTime - dt);
    const reloading = !knifeEquipped && p.reloadEnd > time;
    if (input.fire || input.ads || reloading) this.inspectTime = 0;
    this.inspectTime = Math.max(0, this.inspectTime - dt);
    this.inspectBlend = THREE.MathUtils.damp(
      this.inspectBlend,
      this.inspectTime > 0 ? 1 : 0,
      7,
      dt,
    );
    this.ads = THREE.MathUtils.damp(
      this.ads,
      input.ads && !knifeEquipped && !reloading ? 1 : 0,
      15,
      dt,
    );
    this.drawAge += dt;
    // Analytic damped spring, stable even at low frame rates.
    const spring = 17,
      decay = Math.exp(-spring * dt),
      oldKick = this.kick;
    this.kick = (oldKick + (this.kickVelocity + spring * oldKick) * dt) * decay;
    this.kickVelocity =
      (this.kickVelocity - spring * (this.kickVelocity + spring * oldKick) * dt) * decay;
    this.roll = THREE.MathUtils.damp(this.roll, 0, 16, dt);
    this.shotAge += dt;
    this.flashTime -= dt;
    if (this.flash) {
      this.flash.visible = this.flashTime > 0;
      this.flash.scale.setScalar(
        (this.id === 'spectre' ? 0.24 : this.id === 'iron' ? 1.6 : 1) * (this.ads > 0.5 ? 0.8 : 1),
      );
    }
    const moving = Math.min(1, Math.hypot(p.vx, p.vz) / 4.6);
    this.bob += dt * (input.walk ? 7 : 10) * moving;
    this.sway.x = THREE.MathUtils.damp(
      this.sway.x,
      THREE.MathUtils.clamp((input.deltaX || 0) * 0.0003, -0.015, 0.015),
      11,
      dt,
    );
    this.sway.y = THREE.MathUtils.damp(
      this.sway.y,
      THREE.MathUtils.clamp((input.deltaY || 0) * 0.0003, -0.012, 0.012),
      11,
      dt,
    );
    const steady = 1 - this.ads * 0.96;
    const progress = reloading
      ? THREE.MathUtils.clamp(1 - (p.reloadEnd - time) / this.reloadDuration, 0, 1)
      : 0;
    const reloadPose = reloading
      ? smoothstep(0, 0.18, progress) * (1 - smoothstep(0.8, 1, progress))
      : 0;
    const inspect = this.inspectBlend;
    const slashProgress = this.slashTime > 0 ? 1 - this.slashTime / this.slashDuration : 1;
    const slash = this.knifeEquipped
      ? Math.sin(smoothstep(0.08, 0.85, slashProgress) * Math.PI)
      : 0;
    const draw = this.knifeEquipped ? 1 - smoothstep(0, 0.34, this.drawAge) : 0;
    this.group.position.set(
      THREE.MathUtils.lerp(model.hip[0], 0, this.ads) -
        this.sway.x * steady +
        Math.cos(this.bob) * 0.004 * moving * steady,
      THREE.MathUtils.lerp(model.hip[1], -model.sightHeight, this.ads) +
        this.sway.y * steady +
        Math.sin(this.bob * 2) * 0.003 * moving * steady -
        reloadPose * 0.045,
      THREE.MathUtils.lerp(model.hip[2], model.adsZ, this.ads) + this.kick + reloadPose * 0.015,
    );
    this.group.position.lerp(this.inspectPosition, inspect);
    this.group.rotation.set(
      this.kick * 1.9 - reloadPose * 0.26 + inspect * 0.16,
      this.sway.x * 1.7 * steady - reloadPose * 0.2 + inspect * 0.94,
      this.roll + Math.cos(this.bob) * 0.007 * moving * steady - reloadPose * 0.57 - inspect * 0.2,
    );
    if (this.knifeEquipped) {
      const direction = this.slashCount % 2 ? 1 : -1;
      this.group.position.x -= slash * 0.19 * direction;
      this.group.position.y += slash * 0.055 - draw * 0.19;
      this.group.position.z -= slash * 0.1;
      this.group.rotation.x -= slash * 0.35 + draw * 0.4;
      this.group.rotation.y += 0.42 * (1 - inspect) - slash * 0.7 * direction;
      this.group.rotation.z -= slash * 0.9 * direction + draw * 0.5;
    }
    // Restore assembly transforms before applying slide, bolt, pump and reload motion.
    for (const [name, rest] of Object.entries(this.rest)) {
      const part = parts[name];
      part.position.copy(rest.position);
      part.rotation.copy(rest.rotation);
    }
    if (parts.knifeRig) {
      // The hand and blade move together. Spinning only the knife around a
      // separate pivot made it visibly detach from the fingers.
      parts.knifeRig.rotation.copy(this.rest.knifeRig.rotation);
    }
    if (parts.knifeBlade) {
      parts.knifeBlade.rotation.x = Math.PI * (1 - smoothstep(0.035, 0.25, this.drawAge));
    }
    if (parts.slide) {
      parts.slide.position.z =
        inv.ammo === 0 && !reloading
          ? 0.027
          : Math.sin(Math.min(1, this.shotAge / 0.11) * Math.PI) * 0.027;
      if (reloading && progress > 0.76)
        parts.slide.position.z = Math.sin(smoothstep(0.76, 0.97, progress) * Math.PI) * 0.027;
    }
    if (parts.bolt) {
      if (this.id === 'lynx' || this.id === 'scout') {
        const cycle = THREE.MathUtils.clamp((this.shotAge - 0.17) / 0.62, 0, 1);
        parts.bolt.position.z = Math.sin(cycle * Math.PI) * 0.055;
        parts.bolt.rotation.z = -Math.sin(cycle * Math.PI) * 0.6;
      } else parts.bolt.position.z = Math.sin(Math.min(1, this.shotAge / 0.1) * Math.PI) * 0.035;
    }
    if (parts.pump)
      parts.pump.position.z =
        Math.sin(THREE.MathUtils.clamp((this.shotAge - 0.12) / 0.4, 0, 1) * Math.PI) * 0.065;
    if (reloading && parts.magazine) {
      const out = smoothstep(0.15, 0.36, progress) * (1 - smoothstep(0.52, 0.76, progress));
      parts.magazine.position.y -= out * 0.19;
      parts.magazine.position.z += out * 0.025;
      parts.magazine.rotation.x = out * 0.17;
      if (parts.supportHand) {
        parts.supportHand.position.y -= out * 0.12;
        parts.supportHand.position.z += out * 0.12;
        parts.supportHand.rotation.z -= out * 0.3;
      }
    }
    if (parts.loadingShell) {
      parts.loadingShell.visible = reloading && progress > 0.12 && progress < 0.82;
      const load = (progress * 4) % 1;
      parts.loadingShell.position.set(-0.04 * (1 - load), -0.11 + 0.05 * load, -0.035);
      parts.loadingShell.rotation.z = (1 - load) * 0.4;
      if (reloading && parts.supportHand) {
        parts.supportHand.position.z += 0.22;
        parts.supportHand.position.y -= 0.03 + Math.sin(progress * Math.PI * 8) * 0.018;
      }
    }
    this.group.visible = !p.downed && !p.eliminated;
    model.root.visible =
      this.knifeEquipped || !(WEAPONS[this.id].zoom && input.ads && p.aimAlpha > 0.9 && !reloading);
    for (const casing of this.cases) {
      if (casing.life <= 0) continue;
      casing.life -= dt;
      casing.mesh.visible = casing.life > 0 && this.group.visible;
      casing.mesh.position.addScaledVector(casing.velocity, dt);
      casing.velocity.y -= 2.8 * dt;
      casing.mesh.rotation.x += casing.spin * dt;
      casing.mesh.rotation.z += casing.spin * 0.7 * dt;
    }
  }
  dispose() {
    disposeWeaponModel(this.model);
    this.group.removeFromParent();
    this.cases[0].mesh.geometry.dispose();
    this.cases[0].mesh.material.dispose();
    for (const casing of this.cases) casing.mesh.removeFromParent();
  }
}
