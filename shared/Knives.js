export const KNIFE_MODELS = {
  karambit: 'KARAMBIT',
  skeleton: 'SKELETON KNIFE',
  stiletto: 'STILETTO',
};

// Preserve the user's previous selection when upgrading from the old dagger.
export function canonicalKnifeId(id) {
  if (id === 'dagger') return 'stiletto';
  return Object.hasOwn(KNIFE_MODELS, id) ? id : 'karambit';
}
