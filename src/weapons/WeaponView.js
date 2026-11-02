import * as THREE from 'three';
import { createWeaponModel } from './WeaponModels.js';
import { disposeWeaponModel } from './ModelBuilder.js';

const smoothstep = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

export class WeaponView {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group(); scene.add(this.group);
    this.model = null; this.id = ''; this.upgraded = false;
    this.kick = 0; this.kickVelocity = 0; this.roll = 0; this.flashTime = 0;
    this.shotAge = 10; this.reloadDuration = 1; this.ads = 0; this.bob = 0;
    this.sway = new THREE.Vector2(); this.inspectTime = 0; this.inspectBlend = 0;
    this.ejection = new THREE.Vector3(); this.inspectPosition = new THREE.Vector3(); this.caseIndex = 0;
    const geometry = new THREE.CylinderGeometry(0.0038, 0.0038, 0.017, 8);
    const material = new THREE.MeshStandardMaterial({color:0x9b8043,metalness:.85,roughness:.3});
    this.cases = Array.from({length:14}, () => {
      const mesh = new THREE.Mesh(geometry, material); mesh.visible=false;scene.add(mesh);
      return {mesh,velocity:new THREE.Vector3(),life:0,spin:0};
    });
  }
  build(id, upgraded) {
    disposeWeaponModel(this.model);
    this.model = createWeaponModel(id, upgraded); this.group.add(this.model.root);
    this.id=id;this.upgraded=upgraded;this.kick=0;this.kickVelocity=0;this.shotAge=10;
    this.ads=0;this.inspectTime=0;this.inspectBlend=0;this.inspectPosition.fromArray(this.model.inspect);
    this.rest = {};
    for (const [name,part] of Object.entries(this.model.parts)) this.rest[name] = {position:part.position.clone(),rotation:part.rotation.clone()};
    const flash = new THREE.Group(); flash.name='muzzleFlash';
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([
      -.016,0,0, .016,0,0, 0,0,-.09,
      0,-.014,0, 0,.014,0, 0,0,-.075,
      -.007,-.008,-.005, .007,.008,-.005, .007,-.006,-.065,
    ],3));
    const material = new THREE.MeshBasicMaterial({color:0xffdb9c,side:THREE.DoubleSide,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
    flash.add(new THREE.Mesh(geometry,material));flash.visible=false;
    this.model.parts.muzzle.add(flash);this.flash=flash;
    this.group.position.fromArray(this.model.hip);
  }
  inspect() { if(this.model){this.inspectTime=2.8;this.ads=0;} }
  shoot(event = {}) {
    this.inspectTime=0;
    const amount = this.model?.recoilScale || 1;
    this.kickVelocity += 0.7 * amount;
    this.roll = ((event.index || 1)%2 ? 1 : -1) * 0.012 * amount;
    this.flashTime=this.id==='spectre'?.022:.035;this.shotAge=0;
    if(this.flash)this.flash.rotation.z=(event.index||1)*2.399;
    if(this.model){
      const casing=this.cases[this.caseIndex++%this.cases.length];
      this.group.updateMatrixWorld(true);
      this.ejection.set(.027,.025,-.027);this.group.localToWorld(this.ejection);
      casing.mesh.position.copy(this.ejection);casing.mesh.visible=true;casing.life=.8;
      casing.mesh.scale.setScalar(this.id==='iron'?1.8:this.id==='vx9'?.8:1);
      casing.velocity.set(.7+Math.random()*.4,.5+Math.random()*.25,.15);
      casing.spin=8+Math.random()*12;
    }
  }
  reload(duration) {this.reloadDuration=duration;this.inspectTime=0;}
  reset() {
    this.kick=0;this.kickVelocity=0;this.ads=0;this.inspectTime=0;this.inspectBlend=0;
    this.flashTime=0;this.shotAge=10;
    for(const casing of this.cases){casing.life=0;casing.mesh.visible=false;}
  }
  update(p,input,dt,time) {
    const inv=p.inventory[p.slot];
    if(inv.id!==this.id||inv.upgraded!==this.upgraded)this.build(inv.id,inv.upgraded);
    const model=this.model,parts=model.parts;
    const reloading=p.reloadEnd>time;
    if(input.fire||input.ads||reloading)this.inspectTime=0;
    this.inspectTime=Math.max(0,this.inspectTime-dt);
    this.inspectBlend=THREE.MathUtils.damp(this.inspectBlend,this.inspectTime>0?1:0,7,dt);
    this.ads=THREE.MathUtils.damp(this.ads,input.ads&&!reloading?1:0,15,dt);
    // Analytic damped spring, stable even at low frame rates.
    const spring=17,decay=Math.exp(-spring*dt),oldKick=this.kick;
    this.kick=(oldKick+(this.kickVelocity+spring*oldKick)*dt)*decay;
    this.kickVelocity=(this.kickVelocity-spring*(this.kickVelocity+spring*oldKick)*dt)*decay;
    this.roll=THREE.MathUtils.damp(this.roll,0,16,dt);
    this.shotAge+=dt;this.flashTime-=dt;
    this.flash.visible=this.flashTime>0;
    this.flash.scale.setScalar((this.id==='spectre'?.24:this.id==='iron'?1.6:1)*(this.ads>.5?.8:1));
    const moving=Math.min(1,Math.hypot(p.vx,p.vz)/4.6);
    this.bob+=dt*(input.walk?7:10)*moving;
    this.sway.x=THREE.MathUtils.damp(this.sway.x,THREE.MathUtils.clamp((input.deltaX||0)*.0003,-.015,.015),11,dt);
    this.sway.y=THREE.MathUtils.damp(this.sway.y,THREE.MathUtils.clamp((input.deltaY||0)*.0003,-.012,.012),11,dt);
    const steady=1-this.ads*.96;
    const progress=reloading?THREE.MathUtils.clamp(1-(p.reloadEnd-time)/this.reloadDuration,0,1):0;
    const reloadPose=reloading?smoothstep(0,.18,progress)*(1-smoothstep(.8,1,progress)):0;
    const inspect=this.inspectBlend;
    this.group.position.set(
      THREE.MathUtils.lerp(model.hip[0],0,this.ads)-this.sway.x*steady+Math.cos(this.bob)*.004*moving*steady,
      THREE.MathUtils.lerp(model.hip[1],-model.sightHeight,this.ads)+this.sway.y*steady+Math.sin(this.bob*2)*.003*moving*steady-reloadPose*.045,
      THREE.MathUtils.lerp(model.hip[2],model.adsZ,this.ads)+this.kick+reloadPose*.015,
    );
    this.group.position.lerp(this.inspectPosition,inspect);
    this.group.rotation.set(
      this.kick*1.9-reloadPose*.26+inspect*.16,
      this.sway.x*1.7*steady-reloadPose*.2+inspect*.94,
      this.roll+Math.cos(this.bob)*.007*moving*steady-reloadPose*.57-inspect*.20,
    );
    // Restore assembly transforms before applying slide, bolt, pump and reload motion.
    for(const [name,rest]of Object.entries(this.rest)){const part=parts[name];part.position.copy(rest.position);part.rotation.copy(rest.rotation);}
    if(parts.slide){
      parts.slide.position.z=inv.ammo===0&&!reloading?.027:Math.sin(Math.min(1,this.shotAge/.11)*Math.PI)*.027;
      if(reloading&&progress>.76)parts.slide.position.z=Math.sin(smoothstep(.76,.97,progress)*Math.PI)*.027;
    }
    if(parts.bolt){
      if(this.id==='lynx'){
        const cycle=THREE.MathUtils.clamp((this.shotAge-.17)/.62,0,1);
        parts.bolt.position.z=Math.sin(cycle*Math.PI)*.055;
        parts.bolt.rotation.z=-Math.sin(cycle*Math.PI)*.6;
      }else parts.bolt.position.z=Math.sin(Math.min(1,this.shotAge/.1)*Math.PI)*.035;
    }
    if(parts.pump)parts.pump.position.z=Math.sin(THREE.MathUtils.clamp((this.shotAge-.12)/.4,0,1)*Math.PI)*.065;
    if(reloading&&parts.magazine){
      const out=smoothstep(.15,.36,progress)*(1-smoothstep(.52,.76,progress));
      parts.magazine.position.y-=out*.19;parts.magazine.position.z+=out*.025;
      parts.magazine.rotation.x=out*.17;
      if(parts.supportHand){parts.supportHand.position.y-=out*.12;parts.supportHand.position.z+=out*.12;parts.supportHand.rotation.z-=out*.3;}
    }
    if(parts.loadingShell){
      parts.loadingShell.visible=reloading&&progress>.12&&progress<.82;
      const load=(progress*4)%1;
      parts.loadingShell.position.set(-.04*(1-load),-.11+.05*load,-.035);
      parts.loadingShell.rotation.z=(1-load)*.4;
      if(reloading&&parts.supportHand){parts.supportHand.position.z+=.22;parts.supportHand.position.y-=.03+Math.sin(progress*Math.PI*8)*.018;}
    }
    this.group.visible=!p.downed&&!p.eliminated;
    model.root.visible=!(this.id==='lynx'&&this.ads>.94&&!reloading);
    for(const casing of this.cases){
      if(casing.life<=0)continue;
      casing.life-=dt;casing.mesh.visible=casing.life>0&&this.group.visible;
      casing.mesh.position.addScaledVector(casing.velocity,dt);casing.velocity.y-=2.8*dt;
      casing.mesh.rotation.x+=casing.spin*dt;casing.mesh.rotation.z+=casing.spin*.7*dt;
    }
  }
  dispose(){
    disposeWeaponModel(this.model);this.group.removeFromParent();
    this.cases[0].mesh.geometry.dispose();this.cases[0].mesh.material.dispose();
    for(const casing of this.cases)casing.mesh.removeFromParent();
  }
}
