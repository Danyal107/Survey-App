/** ~0.1 m precision; keeps uniqueness checks and storage stable. */
const COORD_DECIMAL_PLACES = 6;

/** Round WGS84 pair for stable equality and indexes. */
export function canonicalCoordPair(pair: [number, number]): [number, number] {
  const f = 10 ** COORD_DECIMAL_PLACES;
  return [Math.round(pair[0] * f) / f, Math.round(pair[1] * f) / f];
}
