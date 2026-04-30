import type { IShopCategoryOption } from "@/models/ShopOptions";

/** Seed data when no `ShopOptions` document exists yet. */
export const DEFAULT_SHOP_MARKETS: string[] = [
  "Bagbanpura Market",
  "Azam Market",
  "Karim Block Market",
  "Moon Market",
  "Anarkali Market",
];

export const DEFAULT_SHOP_CATEGORIES: IShopCategoryOption[] = [
  { label: "Garments", requiresAudience: true },
  { label: "Cosmetics", requiresAudience: false },
  { label: "Shoes", requiresAudience: true },
  { label: "Jewellery", requiresAudience: false },
  { label: "Electronics", requiresAudience: false },
  { label: "General / mixed", requiresAudience: false },
  { label: "Other", requiresAudience: false },
];
