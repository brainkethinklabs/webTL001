export const normalizePlace = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const communeLabel = commune => `${commune.nombre} · ${commune.region}`;
export function resolveCommune(communes, value) {
  const normalized = normalizePlace(value);
  const exact = communes.find(c => normalizePlace(communeLabel(c)) === normalized);
  if (exact) return exact;
  const matches = communes.filter(c => normalizePlace(c.nombre) === normalized || (c.alias || []).some(alias => normalizePlace(alias) === normalized));
  return matches.length === 1 ? matches[0] : null;
}
export function estimateTruckTime(distanceMeters, durationSeconds) {
  if (![distanceMeters, durationSeconds].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Invalid route metrics');
  const kilometers = distanceMeters / 1000;
  const hours = Math.max(durationSeconds / 3600 * 1.35, kilometers / 65);
  return { kilometers, minutes: Math.ceil(hours * 60 / 15) * 15 };
}
