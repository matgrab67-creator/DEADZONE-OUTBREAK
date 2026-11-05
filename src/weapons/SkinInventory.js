import { SKIN_POINTS_PER_WAVE, sanitizeSkinLoadout, skinDefinition } from '../../shared/Skins.js';

export const SKIN_STORAGE_KEY = 'deadzone-skins-v1';
export const SKIN_PROGRESSION_KEY = 'deadzone-skin-progression-v2';
export class SkinInventory {
  constructor(storage) {
    this.balance = 0;
    this.owned = {};
    this.receipts = Object.create(null);
    this.loadout = {};
    try {
      this.storage = storage ?? globalThis.localStorage;
      const data = JSON.parse(this.storage?.getItem(SKIN_PROGRESSION_KEY) || '{}');
      this.balance = Number.isSafeInteger(data.balance) && data.balance >= 0 ? data.balance : 0;
      for (const [key, finishes] of Object.entries(data.owned || {})) {
        if (!Array.isArray(finishes) || !skinDefinition(key)) continue;
        this.owned[key] = [
          ...new Set(finishes.filter((id) => id !== 'factory' && skinDefinition(key, id))),
        ];
      }
      for (const [id, waves] of Object.entries(data.receipts || {}))
        if (id.length <= 100 && Number.isSafeInteger(waves) && waves >= 0)
          this.receipts[id] = waves;
      const saved = sanitizeSkinLoadout(
        JSON.parse(this.storage?.getItem(SKIN_STORAGE_KEY) || '{}'),
      );
      for (const [key, id] of Object.entries(saved)) if (this.has(key, id)) this.loadout[key] = id;
    } catch {
      /* A blocked or corrupt store leaves a usable session inventory. */
    }
  }
  has(key, finish = 'factory') {
    return (
      !!skinDefinition(key, finish) && (finish === 'factory' || !!this.owned[key]?.includes(finish))
    );
  }
  equipped(key) {
    return this.loadout[key] || 'factory';
  }
  purchaseStatus(key, finish) {
    const skin = skinDefinition(key, finish);
    if (!skin) return { allowed: false, label: 'NIEDOSTĘPNY' };
    if (this.has(key, finish)) return { allowed: false, label: 'POSIADANY' };
    if (skin.requires && !this.has(key, skin.requires))
      return { allowed: false, label: 'NAJPIERW KUP BAZOWY SKIN' };
    if (this.balance < skin.price) return { allowed: false, label: 'ZA MAŁO PUNKTÓW' };
    return { allowed: true, label: 'KUP I WYPOSAŻ' };
  }
  buy(key, finish) {
    if (!this.purchaseStatus(key, finish).allowed) return false;
    const skin = skinDefinition(key, finish);
    this.balance -= skin.price;
    (this.owned[key] ||= []).push(finish);
    this.save();
    return true;
  }
  equip(key, finish) {
    if (!this.has(key, finish)) return false;
    if (finish === 'factory') delete this.loadout[key];
    else this.loadout[key] = finish;
    this.save();
    return true;
  }
  rewardMatch(matchId, clearedWaves) {
    if (
      typeof matchId !== 'string' ||
      !matchId ||
      matchId.length > 100 ||
      !Number.isSafeInteger(clearedWaves) ||
      clearedWaves < 0
    )
      return 0;
    const previous = Object.hasOwn(this.receipts, matchId) ? this.receipts[matchId] : 0;
    const earned = Math.max(0, clearedWaves - previous) * SKIN_POINTS_PER_WAVE;
    if (!earned) return 0;
    this.balance += earned;
    this.receipts[matchId] = clearedWaves;
    this.save();
    return earned;
  }
  save() {
    try {
      this.storage?.setItem(
        SKIN_PROGRESSION_KEY,
        JSON.stringify({ balance: this.balance, owned: this.owned, receipts: this.receipts }),
      );
      this.storage?.setItem(SKIN_STORAGE_KEY, JSON.stringify(this.loadout));
    } catch {
      /* Progress remains available during this session. */
    }
  }
}
