export function isShopMarket(value: string, allowedMarkets: string[]): boolean {
  return allowedMarkets.includes(value);
}
