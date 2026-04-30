import type { HydratedDocument } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  ShopOptions,
  type IShopCategoryOption,
  type IShopOptions,
} from "@/models/ShopOptions";
import {
  DEFAULT_SHOP_CATEGORIES,
  DEFAULT_SHOP_MARKETS,
} from "@/lib/shopOptionsDefaults";

const SINGLETON_KEY = "default";

export type ShopOptionsDTO = {
  markets: string[];
  categories: IShopCategoryOption[];
  updatedAt: string | null;
};

export function toShopOptionsDTO(
  doc: IShopOptions | HydratedDocument<IShopOptions>
): ShopOptionsDTO {
  return {
    markets: [...doc.markets],
    categories: doc.categories.map((c) => ({
      label: c.label,
      requiresAudience: Boolean(c.requiresAudience),
    })),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

export async function getOrCreateShopOptions(): Promise<
  HydratedDocument<IShopOptions>
> {
  await connectDB();
  let doc = await ShopOptions.findOne({ key: SINGLETON_KEY });
  if (!doc) {
    doc = await ShopOptions.create({
      key: SINGLETON_KEY,
      markets: [...DEFAULT_SHOP_MARKETS],
      categories: DEFAULT_SHOP_CATEGORIES.map((c) => ({ ...c })),
    });
  }
  return doc;
}
