import type { Types } from "mongoose";
import { Shop, type ShopCoordinates } from "@/models/Shop";
import { notDeleted } from "@/lib/notDeleted";

/** True if another non-deleted shop already uses these exact stored coordinates. */
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
