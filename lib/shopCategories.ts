/** Hardcoded shop categories for respondent “Your details” (keep in sync with UI + API). */
export const SHOP_CATEGORIES = [
  'Garments',
  'Cosmetics',
  'Shoes',
  'Jewellery',
  'Electronics',
  'General / mixed',
  'Other',
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export function isShopCategory(value: string): value is ShopCategory {
  return (SHOP_CATEGORIES as readonly string[]).includes(value);
}

/** Garments & shoes need a male / female / both segment on the form. */
export function categoryNeedsGenderSegment(category: string): boolean {
  return category === "Garments" || category === "Shoes";
}

export const SHOP_AUDIENCE_VALUES = ["male", "female", "both"] as const;
export type ShopAudience = (typeof SHOP_AUDIENCE_VALUES)[number];

export function isShopAudience(value: string): value is ShopAudience {
  return (SHOP_AUDIENCE_VALUES as readonly string[]).includes(value);
}
