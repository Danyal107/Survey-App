import type { IRespondentInfo } from "@/models/Response";
import type { IShopDetails, ShopCoordinates } from "@/models/Shop";

/** Respondent field id for map pin (must match form config / defaults). */
export const SHOP_LOCATION_FIELD_ID = "shopLocation";

export function isLocationValue(
  v: unknown
): v is { lat: number; lng: number } {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng) &&
    o.lat >= -90 &&
    o.lat <= 90 &&
    o.lng >= -180 &&
    o.lng <= 180
  );
}

/**
 * Pulls coordinates out of shop payload for `Shop.coordinates` as `[lat, lng]`
 * and removes the location object from `details`.
 */
export function normalizeShopDetailsAndCoords(shop: IRespondentInfo): {
  details: IShopDetails;
  coordinates?: ShopCoordinates;
} {
  const details = { ...shop } as Record<string, unknown>;
  let coordinates: ShopCoordinates | undefined;

  const loc = details[SHOP_LOCATION_FIELD_ID];
  if (isLocationValue(loc)) {
    coordinates = [loc.lat, loc.lng];
    delete details[SHOP_LOCATION_FIELD_ID];
  }

  return { details: details as IShopDetails, coordinates };
}
