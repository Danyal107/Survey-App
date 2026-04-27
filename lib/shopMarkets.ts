/** Hardcoded markets for respondent “Your details” (keep in sync with UI + API). */
export const SHOP_MARKETS = [
  "Bagbanpura Market",
  "Azam Market",
  "Karim Block Market",
  "Moon Market",
  "Anarkali Market",
] as const;

export type ShopMarket = (typeof SHOP_MARKETS)[number];

export function isShopMarket(value: string): value is ShopMarket {
  return (SHOP_MARKETS as readonly string[]).includes(value);
}
