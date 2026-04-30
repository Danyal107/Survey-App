import type { Types } from "mongoose";
import { canonicalCoordPair } from "@/lib/canonicalCoords";
import type { IRespondentInfo } from "@/models/Response";
import type { IShopDetails, ShopCoordinates } from "@/models/Shop";
import { Shop } from "@/models/Shop";
import { notDeleted } from "@/lib/notDeleted";

/** Respondent field id for map pin (must match form config / defaults). */
export const SHOP_LOCATION_FIELD_ID = "shopLocation";

export function canonicalShopCoordinates(
  pair: ShopCoordinates
): ShopCoordinates {
  return canonicalCoordPair(pair) as ShopCoordinates;
}

/**
 * True if another non-deleted shop already uses these exact stored coordinates.
 */
export async function shopExistsAtCoordinates(
  coords: ShopCoordinates,
  excludeShopId?: Types.ObjectId
): Promise<boolean> {
  const q: Record<string, unknown> = {
    "coordinates.0": coords[0],
    "coordinates.1": coords[1],
    ...notDeleted,
  };
  if (excludeShopId) {
    q._id = { $ne: excludeShopId };
  }
  const found = await Shop.findOne(q).select("_id").lean();
  return found != null;
}

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
 * Pulls coordinates out of the shop payload for `Shop.coordinates` as `[lat, lng]`
 * and removes every `{ lat, lng }` value from `details` (any field id).
 */
export function normalizeShopDetailsAndCoords(shop: IRespondentInfo): {
  details: IShopDetails;
  coordinates?: ShopCoordinates;
} {
  const details = { ...shop } as Record<string, unknown>;
  let coordinates: ShopCoordinates | undefined;

  for (const key of Object.keys(details)) {
    const loc = details[key];
    if (isLocationValue(loc)) {
      if (!coordinates) {
        coordinates = canonicalShopCoordinates([loc.lat, loc.lng]);
      }
      delete details[key];
    }
  }

  return { details: details as IShopDetails, coordinates };
}
