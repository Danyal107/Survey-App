import type { IShopCategoryOption } from "@/models/ShopOptions";

export function categoryNeedsGenderSegment(
  categoryLabel: string,
  categories: IShopCategoryOption[]
): boolean {
  const row = categories.find((c) => c.label === categoryLabel);
  return row?.requiresAudience ?? false;
}

export function isShopCategory(
  value: string,
  categories: IShopCategoryOption[]
): boolean {
  return categories.some((c) => c.label === value);
}

export const SHOP_AUDIENCE_VALUES = ["male", "female", "both"] as const;
export type ShopAudience = (typeof SHOP_AUDIENCE_VALUES)[number];

export function isShopAudience(value: string): value is ShopAudience {
  return (SHOP_AUDIENCE_VALUES as readonly string[]).includes(value);
}
