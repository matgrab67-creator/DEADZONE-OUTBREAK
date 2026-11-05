import { createWeaponModel, createKnifeModel } from '../weapons/WeaponModels.js';
import { disposeWeaponModel } from '../weapons/ModelBuilder.js';
import { applyWeaponSkin } from '../weapons/SkinMaterials.js';
import { skinDefinition } from '../../shared/Skins.js';

export class PlayerWeaponRenderer {
  constructor() {
    this.models = new Map();
  }
  update(player, body) {
    const item = player.inventory?.[player.slot];
    if (!item) return;
    const knife = player.skinKnife && skinDefinition(`knife:${player.skinKnife}`, 'factory');
    const key = knife ? `knife:${player.skinKnife}` : item.id;
    let model = this.models.get(player.id);
    if (!model || model.peerKey !== key || model.peerUpgraded !== item.upgraded) {
      this.remove(player.id);
      model = knife
        ? createKnifeModel(player.skinKnife)
        : createWeaponModel(item.id, item.upgraded);
      for (const name of ['rightHand', 'supportHand']) {
        const hand = model.parts[name];
        if (hand) {
          hand.traverse((o) => {
            if (o.isMesh) o.geometry.dispose();
          });
          hand.removeFromParent();
        }
      }
      model.peerKey = key;
      model.peerUpgraded = item.upgraded;
      model.root.position.set(0.055, 1.18, knife ? -0.43 : -0.31);
      body.root.add(model.root);
      this.models.set(player.id, model);
    }
    const finish = skinDefinition(key, player.skins?.[key])?.id || 'factory';
    if (model.skinId !== finish) applyWeaponSkin(model, key, finish);
    model.root.visible = !player.downed;
  }
  remove(id) {
    const model = this.models.get(id);
    if (model) disposeWeaponModel(model);
    this.models.delete(id);
  }
  reset() {
    for (const id of this.models.keys()) this.remove(id);
  }
}
